package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"
)

const (
	tournamentURL = "https://melee.gg/Tournament/View/394299"
	tournamentID  = "394299"
	outputDir     = "../data"
)

func main() {
	// Parse command-line flags
	roundsFlag := flag.String("rounds", "4-8", "Rounds to scrape (e.g., '4-8', '4,5,6', '4-8,12-16')")
	flag.Parse()

	log.Println("Starting ProTour data scraper...")
	log.Printf("Tournament: %s", tournamentURL)

	// Parse rounds configuration
	rounds, err := parseRounds(*roundsFlag)
	if err != nil {
		log.Fatalf("Invalid rounds configuration: %v", err)
	}
	log.Printf("Scraping rounds: %v", rounds)

	// Create output directory if it doesn't exist
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		log.Fatalf("Failed to create output directory: %v", err)
	}

	// Fetch match data for each round
	allMatches := make(map[int][]Match)
	for _, roundNum := range rounds {
		log.Printf("Fetching Round %d...", roundNum)

		matches, err := fetchRoundMatches(roundNum)
		if err != nil {
			log.Printf("Warning: Failed to fetch Round %d: %v", roundNum, err)
			continue
		}

		log.Printf("  Found %d matches in Round %d", matches.RecordsTotal, roundNum)
		allMatches[roundNum] = matches.Data

		// Be polite - add delay between requests
		time.Sleep(1 * time.Second)
	}

	// Save raw match data
	if err := saveMatchData(allMatches); err != nil {
		log.Fatalf("Failed to save match data: %v", err)
	}

	// Extract deck information from melee.gg match data
	log.Println("Extracting deck information from melee.gg...")
	playerArchetype := extractPlayerDecksFromMatches(allMatches)
	playerNames := extractPlayerNamesFromMatches(allMatches)
	log.Printf("Mapped %d players to decks", len(playerArchetype))

	// Save player deck mapping
	if err := savePlayerDeckMapping(playerArchetype); err != nil {
		log.Fatalf("Failed to save player deck mapping: %v", err)
	}

	// Generate decklists from melee.gg data
	log.Println("Generating decklists from melee.gg data...")
	if err := generateDecklistsFromMelee(playerArchetype, playerNames); err != nil {
		log.Fatalf("Failed to generate decklists: %v", err)
	}

	// Aggregate statistics
	if len(playerArchetype) > 0 && len(allMatches) > 0 {
		log.Println("Aggregating match statistics...")
		
		// Calculate statistics
		stats := aggregateStats(allMatches, playerArchetype)
		log.Printf("Calculated stats for %d archetypes", len(stats.Archetypes))
		
		// Save statistics
		if err := saveStatsData(stats); err != nil {
			log.Fatalf("Failed to save statistics: %v", err)
		}
		
		// Print summary
		printStatsSummary(stats)
	}

	log.Println("Scraping completed successfully!")
	log.Printf("Data saved to: %s", outputDir)
}

// printStatsSummary prints a summary of the statistics
func printStatsSummary(stats *TournamentStats) {
	log.Println("\n=== Tournament Statistics Summary ===")
	
	// Find top archetypes by win rate (min 10 matches)
	type archetypeWithWins struct {
		name    string
		stats   *ArchetypeStats
		matches int
	}
	
	var archetypes []archetypeWithWins
	for name, archStats := range stats.Archetypes {
		matches := archStats.Wins + archStats.Losses
		archetypes = append(archetypes, archetypeWithWins{
			name:    name,
			stats:   archStats,
			matches: matches,
		})
	}
	
	// Sort by win rate (for those with 10+ matches)
	log.Println("\nTop Archetypes (10+ matches):")
	count := 0
	for _, arch := range archetypes {
		if arch.matches >= 10 && count < 5 {
			log.Printf("  %s: %d-%d (%.1f%% win rate)",
				arch.name,
				arch.stats.Wins,
				arch.stats.Losses,
				arch.stats.WinRate)
			count++
		}
	}
	
	log.Printf("\nTotal archetypes: %d", len(stats.Archetypes))
	log.Println("=====================================\n")
}

// saveMatchData saves match data to JSON file
func saveMatchData(matches map[int][]Match) error {
	filename := fmt.Sprintf("tournament-%s-matches.json", tournamentID)
	outputPath := filepath.Join(outputDir, filename)

	file, err := os.Create(outputPath)
	if err != nil {
		return fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(matches); err != nil {
		return fmt.Errorf("failed to encode JSON: %w", err)
	}

	log.Printf("Saved match data to %s", outputPath)
	return nil
}

// savePlayerDeckMapping saves player-to-deck mapping to JSON file
func savePlayerDeckMapping(playerDecks map[string]string) error {
	filename := fmt.Sprintf("tournament-%s-player-decks.json", tournamentID)
	outputPath := filepath.Join(outputDir, filename)

	file, err := os.Create(outputPath)
	if err != nil {
		return fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(playerDecks); err != nil {
		return fmt.Errorf("failed to encode JSON: %w", err)
	}

	log.Printf("Saved player deck mapping to %s", outputPath)
	return nil
}

// saveMeleeDecklistData saves melee.gg decklist data to JSON file
func saveMeleeDecklistData(decklists []MeleeDeckInfo) error {
	filename := fmt.Sprintf("tournament-%s-decklists.json", tournamentID)
	outputPath := filepath.Join(outputDir, filename)

	file, err := os.Create(outputPath)
	if err != nil {
		return fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(decklists); err != nil {
		return fmt.Errorf("failed to encode JSON: %w", err)
	}

	log.Printf("Saved melee decklist data to %s", outputPath)
	return nil
}

// extractPlayerDecksFromMatches extracts player-to-deck mapping from match data
func extractPlayerDecksFromMatches(allMatches map[int][]Match) map[string]string {
	playerDecks := make(map[string]string)
	
	for _, matches := range allMatches {
		for _, match := range matches {
			for _, competitor := range match.Competitors {
				// Get deck information from Decklists at competitor level
				if len(competitor.Decklists) > 0 && len(competitor.Team.Players) > 0 {
					deckName := competitor.Decklists[0].DecklistName
					playerName := competitor.Team.Players[0].DisplayName
					
					if deckName != "" && playerName != "" {
						// Normalize player name for consistent matching
						normalizedName := normalizePlayerName(playerName)
						playerDecks[normalizedName] = deckName
					}
				}
			}
		}
	}
	
	return playerDecks
}

// extractPlayerNamesFromMatches extracts actual player display names from matches
func extractPlayerNamesFromMatches(allMatches map[int][]Match) map[string]string {
	playerNames := make(map[string]string) // normalized -> display name
	
	for _, matches := range allMatches {
		for _, match := range matches {
			for _, competitor := range match.Competitors {
				if len(competitor.Team.Players) > 0 {
					playerName := competitor.Team.Players[0].DisplayName
					if playerName != "" {
						normalizedName := normalizePlayerName(playerName)
						playerNames[normalizedName] = playerName
					}
				}
			}
		}
	}
	
	return playerNames
}

// saveStatsData saves aggregated statistics to JSON file
func saveStatsData(stats *TournamentStats) error {
	filename := fmt.Sprintf("tournament-%s-stats.json", tournamentID)
	outputPath := filepath.Join(outputDir, filename)

	file, err := os.Create(outputPath)
	if err != nil {
		return fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(stats); err != nil {
		return fmt.Errorf("failed to encode JSON: %w", err)
	}

	log.Printf("Saved statistics to %s", outputPath)
	return nil
}

