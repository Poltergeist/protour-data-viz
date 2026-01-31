package main

import (
	"fmt"
	"regexp"
	"strings"
)

// MatchResult represents a parsed match result
type MatchResult struct {
	Round       int
	Player1     string
	Player2     string
	Winner      string
	Player1Wins int
	Player2Wins int
	Draws       int
}

// ArchetypeStats represents statistics for a deck archetype
type ArchetypeStats struct {
	Archetype string                       `json:"archetype"`
	Wins      int                          `json:"wins"`
	Losses    int                          `json:"losses"`
	Draws     int                          `json:"draws"`
	WinRate   float64                      `json:"winRate"`
	Matchups  map[string]*MatchupStats     `json:"matchups"`
}

// MatchupStats represents head-to-head statistics
type MatchupStats struct {
	Wins       int     `json:"wins"`
	Losses     int     `json:"losses"`
	Draws      int     `json:"draws"`
	Percentage float64 `json:"percentage"`
}

// TournamentStats represents aggregated tournament statistics
type TournamentStats struct {
	Archetypes map[string]*ArchetypeStats `json:"archetypes"`
}

// parseMatchResult extracts match result information
func parseMatchResult(result string) (winner string, p1Wins, p2Wins, draws int) {
	// Examples:
	// "Guglielmo Lupi won 2-0-0"
	// "Marco Belacca won 2-1-0"
	// "1-1-0 Draw" (draw matches have equal wins for both players)
	// Possible draw formats: 1-1-1, 0-0-0, 1-1-0, 0-0-1
	
	result = strings.TrimSpace(result)
	
	// Try to extract winner name and score
	re := regexp.MustCompile(`^(.+?)\s+won\s+(\d+)-(\d+)-(\d+)$`)
	matches := re.FindStringSubmatch(result)
	
	if len(matches) >= 5 {
		winner = strings.TrimSpace(matches[1])
		fmt.Sscanf(matches[2], "%d", &p1Wins)
		fmt.Sscanf(matches[3], "%d", &p2Wins)
		fmt.Sscanf(matches[4], "%d", &draws)
		return winner, p1Wins, p2Wins, draws
	}
	
	// If no winner found, try to parse as draw format (e.g., "1-1-0 Draw")
	re = regexp.MustCompile(`(\d+)-(\d+)-(\d+)`)
	matches = re.FindStringSubmatch(result)
	if len(matches) >= 4 {
		fmt.Sscanf(matches[1], "%d", &p1Wins)
		fmt.Sscanf(matches[2], "%d", &p2Wins)
		fmt.Sscanf(matches[3], "%d", &draws)
	}
	
	// Return empty winner (indicates a draw)
	return "", p1Wins, p2Wins, draws
}

// buildPlayerArchetypeMap creates a mapping from player name to archetype
// Now deprecated - use extractPlayerDecksFromMatches in main.go instead
func buildPlayerArchetypeMap(decklists []DeckInfo) map[string]string {
	playerArchetype := make(map[string]string)
	
	for _, deck := range decklists {
		// Normalize player name for matching
		normalizedName := normalizePlayerName(deck.PlayerName)
		playerArchetype[normalizedName] = deck.Archetype
	}
	
	return playerArchetype
}

// normalizePlayerName normalizes a player name for consistent matching
func normalizePlayerName(name string) string {
	// Convert to lowercase and trim whitespace
	name = strings.ToLower(strings.TrimSpace(name))
	
	// Remove extra whitespace
	name = regexp.MustCompile(`\s+`).ReplaceAllString(name, " ")
	
	return name
}

// aggregateStats processes all matches and calculates statistics
func aggregateStats(allMatches map[int][]Match, playerArchetype map[string]string) *TournamentStats {
	stats := &TournamentStats{
		Archetypes: make(map[string]*ArchetypeStats),
	}
	
	// Process each match
	for _, matches := range allMatches {
		for _, match := range matches {
			if len(match.Competitors) < 2 {
				continue
			}
			
			// Get player names
			player1Name := ""
			player2Name := ""
			
			if len(match.Competitors[0].Team.Players) > 0 {
				player1Name = match.Competitors[0].Team.Players[0].DisplayName
			}
			if len(match.Competitors[1].Team.Players) > 0 {
				player2Name = match.Competitors[1].Team.Players[0].DisplayName
			}
			
			if player1Name == "" || player2Name == "" {
				continue
			}
			
			// Get archetypes
			p1Archetype := playerArchetype[normalizePlayerName(player1Name)]
			p2Archetype := playerArchetype[normalizePlayerName(player2Name)]
			
			if p1Archetype == "" || p2Archetype == "" {
				// Skip if we don't have archetype data
				continue
			}
			
			// Parse match result
			winner, p1Wins, p2Wins, draws := parseMatchResult(match.ResultString)
			
			// Initialize archetype stats if needed
			if _, exists := stats.Archetypes[p1Archetype]; !exists {
				stats.Archetypes[p1Archetype] = &ArchetypeStats{
					Archetype: p1Archetype,
					Matchups:  make(map[string]*MatchupStats),
				}
			}
			if _, exists := stats.Archetypes[p2Archetype]; !exists {
				stats.Archetypes[p2Archetype] = &ArchetypeStats{
					Archetype: p2Archetype,
					Matchups:  make(map[string]*MatchupStats),
				}
			}
			
			// Update overall stats
			if winner != "" {
				// Determine which player won
				winnerNormalized := normalizePlayerName(winner)
				p1Normalized := normalizePlayerName(player1Name)
				
				if winnerNormalized == p1Normalized {
					// Player 1 won
					stats.Archetypes[p1Archetype].Wins++
					stats.Archetypes[p2Archetype].Losses++
				} else {
					// Player 2 won
					stats.Archetypes[p2Archetype].Wins++
					stats.Archetypes[p1Archetype].Losses++
				}
			} else {
				// Match was a draw (no winner)
				stats.Archetypes[p1Archetype].Draws++
				stats.Archetypes[p2Archetype].Draws++
			}
			
			// Note: Individual game draws within a match are tracked separately
			// but not added to overall archetype draws (only match draws count)
			
			// Update head-to-head matchup stats
			updateMatchupStats(stats.Archetypes[p1Archetype], p2Archetype, winner, player1Name, p1Wins, p2Wins, draws)
			updateMatchupStats(stats.Archetypes[p2Archetype], p1Archetype, winner, player2Name, p2Wins, p1Wins, draws)
		}
	}
	
	// Calculate win rates
	for _, archStats := range stats.Archetypes {
		total := archStats.Wins + archStats.Losses
		if total > 0 {
			archStats.WinRate = float64(archStats.Wins) / float64(total) * 100
		}
		
		// Calculate matchup percentages
		for _, matchup := range archStats.Matchups {
			total := matchup.Wins + matchup.Losses
			if total > 0 {
				matchup.Percentage = float64(matchup.Wins) / float64(total) * 100
			}
		}
	}
	
	return stats
}

// updateMatchupStats updates head-to-head matchup statistics
func updateMatchupStats(archStats *ArchetypeStats, opponentArchetype, winner, playerName string, playerWins, opponentWins, draws int) {
	if _, exists := archStats.Matchups[opponentArchetype]; !exists {
		archStats.Matchups[opponentArchetype] = &MatchupStats{}
	}
	
	matchup := archStats.Matchups[opponentArchetype]
	
	if winner != "" {
		winnerNormalized := normalizePlayerName(winner)
		playerNormalized := normalizePlayerName(playerName)
		
		if winnerNormalized == playerNormalized {
			matchup.Wins++
		} else {
			matchup.Losses++
		}
	} else {
		// Match was a draw (no winner)
		matchup.Draws++
	}
}
