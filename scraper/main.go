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
	outputDir    = "../data"
	registryFile = "tournaments.json"
)

func main() {
	tournamentFlag := flag.String("tournament", "", "Tournament ID to scrape (must exist in registry). If empty, scrapes all non-completed tournaments.")
	roundsFlag := flag.String("rounds", "", "Override rounds for this run (e.g. '4-8' or '4-8,12-16'). When empty, uses the registry's rounds field.")
	flag.Parse()

	registryPath := filepath.Join(outputDir, registryFile)
	registry, err := loadRegistry(registryPath)
	if err != nil {
		log.Fatalf("Failed to load registry %s: %v", registryPath, err)
	}

	var targets Registry
	if *tournamentFlag != "" {
		t, ok := registry.find(*tournamentFlag)
		if !ok {
			log.Fatalf("Tournament %s not found in registry. Add it to %s before scraping.", *tournamentFlag, registryPath)
		}
		if t.Completed {
			log.Fatalf("Tournament %s is marked completed in the registry. Flip completed:false to re-scrape.", *tournamentFlag)
		}
		targets = Registry{t}
	} else {
		targets = registry.active()
		if len(targets) == 0 {
			log.Println("No active (non-completed) tournaments in registry. Nothing to do.")
			return
		}
	}

	if err := os.MkdirAll(outputDir, 0755); err != nil {
		log.Fatalf("Failed to create output directory: %v", err)
	}

	for i, t := range targets {
		if i > 0 {
			time.Sleep(1 * time.Second) // polite delay between tournaments
		}
		if err := scrapeTournament(t, *roundsFlag); err != nil {
			log.Printf("Tournament %s (%s) failed: %v", t.ID, t.Name, err)
			continue
		}
	}

	log.Println("Scraping completed.")
}

// scrapeTournament runs the full scrape for one tournament.
// roundsOverride, when non-empty, replaces the registry's rounds for this run only.
func scrapeTournament(t Tournament, roundsOverride string) error {
	tournamentURL := fmt.Sprintf("https://melee.gg/Tournament/View/%s", t.ID)
	log.Printf("Starting scrape of %s (%s)", t.ID, t.Name)
	log.Printf("  URL: %s", tournamentURL)

	roundsStr := joinRounds(t.Rounds)
	if roundsOverride != "" {
		roundsStr = roundsOverride
		log.Printf("  Rounds: %s (overridden via -rounds)", roundsStr)
	} else {
		log.Printf("  Rounds: %s (from registry)", roundsStr)
	}

	rounds, err := parseRounds(roundsStr)
	if err != nil {
		return fmt.Errorf("invalid rounds: %w", err)
	}
	log.Printf("  Resolved round numbers: %v", rounds)

	log.Println("  Discovering melee.gg round IDs...")
	roundIDs, err := fetchRoundIDs(t.ID)
	if err != nil {
		return fmt.Errorf("discover round IDs: %w", err)
	}
	log.Printf("  Found %d round buttons", len(roundIDs))

	allMatches := make(map[int][]Match)
	for _, roundNum := range rounds {
		log.Printf("  Fetching Round %d...", roundNum)

		matches, err := fetchRoundMatches(t.ID, roundIDs, roundNum)
		if err != nil {
			log.Printf("  Warning: failed to fetch Round %d: %v", roundNum, err)
			continue
		}
		log.Printf("    %d matches", matches.RecordsTotal)
		allMatches[roundNum] = matches.Data

		time.Sleep(1 * time.Second)
	}

	if err := saveMatchData(t.ID, allMatches); err != nil {
		return fmt.Errorf("save matches: %w", err)
	}

	log.Println("  Extracting deck info from matches...")
	playerArchetype := extractPlayerDecksFromMatches(allMatches)
	playerNames := extractPlayerNamesFromMatches(allMatches)
	log.Printf("  %d players mapped to decks", len(playerArchetype))

	if err := savePlayerDeckMapping(t.ID, playerArchetype); err != nil {
		return fmt.Errorf("save player decks: %w", err)
	}

	log.Println("  Fetching complete decklists from melee.gg...")
	decklists, err := fetchDecklistsFromMelee(allMatches, playerArchetype, playerNames)
	if err != nil {
		return fmt.Errorf("fetch decklists: %w", err)
	}
	log.Printf("  Fetched %d decklists", len(decklists))

	if err := saveDecklistsData(t.ID, decklists); err != nil {
		return fmt.Errorf("save decklists: %w", err)
	}

	if len(playerArchetype) > 0 && len(allMatches) > 0 {
		log.Println("  Aggregating statistics...")
		stats := aggregateStats(allMatches, playerArchetype)
		log.Printf("  Stats for %d archetypes", len(stats.Archetypes))

		if err := saveStatsData(t.ID, stats); err != nil {
			return fmt.Errorf("save stats: %w", err)
		}

		printStatsSummary(stats)
	}

	log.Printf("Tournament %s done.", t.ID)
	return nil
}

// joinRounds turns ["4-8", "12-16"] into "4-8,12-16" — the form parseRounds already understands.
func joinRounds(rounds []string) string {
	out := ""
	for i, r := range rounds {
		if i > 0 {
			out += ","
		}
		out += r
	}
	return out
}

func printStatsSummary(stats *TournamentStats) {
	log.Println("\n=== Tournament Statistics Summary ===")

	type archetypeWithWins struct {
		name    string
		stats   *ArchetypeStats
		matches int
	}

	var archetypes []archetypeWithWins
	for name, archStats := range stats.Archetypes {
		matches := archStats.Wins + archStats.Losses
		archetypes = append(archetypes, archetypeWithWins{name: name, stats: archStats, matches: matches})
	}

	log.Println("\nTop Archetypes (10+ matches):")
	count := 0
	for _, arch := range archetypes {
		if arch.matches >= 10 && count < 5 {
			log.Printf("  %s: %d-%d (%.1f%% win rate)",
				arch.name, arch.stats.Wins, arch.stats.Losses, arch.stats.WinRate)
			count++
		}
	}
	log.Printf("\nTotal archetypes: %d", len(stats.Archetypes))
	log.Println("=====================================")
}

func saveMatchData(tournamentID string, matches map[int][]Match) error {
	return saveJSON(tournamentID, "matches", matches)
}

func savePlayerDeckMapping(tournamentID string, playerDecks map[string]string) error {
	return saveJSON(tournamentID, "player-decks", playerDecks)
}

func saveDecklistsData(tournamentID string, decklists []DeckInfo) error {
	return saveJSON(tournamentID, "decklists", decklists)
}

func saveStatsData(tournamentID string, stats *TournamentStats) error {
	return saveJSON(tournamentID, "stats", stats)
}

func saveJSON(tournamentID, kind string, data interface{}) error {
	filename := fmt.Sprintf("tournament-%s-%s.json", tournamentID, kind)
	outputPath := filepath.Join(outputDir, filename)

	file, err := os.Create(outputPath)
	if err != nil {
		return fmt.Errorf("create %s: %w", outputPath, err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(data); err != nil {
		return fmt.Errorf("encode %s: %w", outputPath, err)
	}

	log.Printf("    Saved %s", outputPath)
	return nil
}

func extractPlayerDecksFromMatches(allMatches map[int][]Match) map[string]string {
	playerDecks := make(map[string]string)

	for _, matches := range allMatches {
		for _, match := range matches {
			for _, competitor := range match.Competitors {
				if len(competitor.Decklists) > 0 && len(competitor.Team.Players) > 0 {
					deckName := competitor.Decklists[0].DecklistName
					playerName := competitor.Team.Players[0].DisplayName

					if deckName != "" && playerName != "" {
						normalizedName := normalizePlayerName(playerName)
						playerDecks[normalizedName] = deckName
					}
				}
			}
		}
	}

	return playerDecks
}

func extractPlayerNamesFromMatches(allMatches map[int][]Match) map[string]string {
	playerNames := make(map[string]string)

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
