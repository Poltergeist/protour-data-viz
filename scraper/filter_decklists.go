package main

import (
"encoding/json"
"fmt"
"os"
"path/filepath"
)

// filterDecklistsToMatchPlayers filters the magic.gg decklists to only include players
// that have match data in melee.gg, eliminating the "players without results" issue
func filterDecklistsToMatchPlayers() error {
// Read the magic.gg decklists
decklistPath := filepath.Join(outputDir, fmt.Sprintf("tournament-%s-decklists.json", tournamentID))
decklistData, err := os.ReadFile(decklistPath)
if err != nil {
return fmt.Errorf("failed to read decklists file: %w", err)
}

var decklists []DeckInfo
if err := json.Unmarshal(decklistData, &decklists); err != nil {
return fmt.Errorf("failed to parse decklists: %w", err)
}

// Read the melee.gg player-deck mapping
playerDecksPath := filepath.Join(outputDir, fmt.Sprintf("tournament-%s-player-decks.json", tournamentID))
playerDecksData, err := os.ReadFile(playerDecksPath)
if err != nil {
return fmt.Errorf("failed to read player-decks file: %w", err)
}

var playerDecks map[string]string
if err := json.Unmarshal(playerDecksData, &playerDecks); err != nil {
return fmt.Errorf("failed to parse player-decks: %w", err)
}

// Filter decklists to only those in playerDecks
var filteredDecklists []DeckInfo
for _, deck := range decklists {
normalizedName := normalizePlayerName(deck.PlayerName)
if _, exists := playerDecks[normalizedName]; exists {
filteredDecklists = append(filteredDecklists, deck)
}
}

// Save filtered decklists
file, err := os.Create(decklistPath)
if err != nil {
return fmt.Errorf("failed to create filtered decklists file: %w", err)
}
defer file.Close()

encoder := json.NewEncoder(file)
encoder.SetIndent("", "  ")
if err := encoder.Encode(filteredDecklists); err != nil {
return fmt.Errorf("failed to encode filtered decklists: %w", err)
}

return nil
}
