package main

import (
"encoding/json"
"fmt"
"os"
"path/filepath"
"sort"
)

// generateDecklistsFromMelee generates a complete decklists.json file from melee.gg data
// This replaces the magic.gg decklists entirely with melee.gg as the single source of truth
func generateDecklistsFromMelee(playerArchetype map[string]string, playerNames map[string]string) error {
var decklists []DeckInfo

// Create a decklist entry for each player
for normalizedName, archetype := range playerArchetype {
displayName := playerNames[normalizedName]
if displayName == "" {
displayName = normalizedName // Fallback
}

decklists = append(decklists, DeckInfo{
PlayerName: displayName,
Archetype:  archetype,
MainDeck:   []CardInfo{}, // No card list available from melee.gg API
Sideboard:  []CardInfo{}, // No card list available from melee.gg API
})
}

// Sort by player name for consistency
sort.Slice(decklists, func(i, j int) bool {
return decklists[i].PlayerName < decklists[j].PlayerName
})

// Save decklists
decklistPath := filepath.Join(outputDir, fmt.Sprintf("tournament-%s-decklists.json", tournamentID))
file, err := os.Create(decklistPath)
if err != nil {
return fmt.Errorf("failed to create decklists file: %w", err)
}
defer file.Close()

encoder := json.NewEncoder(file)
encoder.SetIndent("", "  ")
if err := encoder.Encode(decklists); err != nil {
return fmt.Errorf("failed to encode decklists: %w", err)
}

fmt.Printf("  Generated %d decklists from melee.gg data\n", len(decklists))

return nil
}
