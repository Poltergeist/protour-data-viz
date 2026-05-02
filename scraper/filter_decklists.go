package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
)

// generateDecklistsFromMelee writes a decklists.json file containing player+archetype only
// (no card lists). This is a fallback used when full decklist HTML scraping is unavailable.
// Currently the main scraper path uses fetchDecklistsFromMelee instead, but this is kept
// for the case where melee.gg's decklist HTML format changes.
func generateDecklistsFromMelee(outputDir, tournamentID string, playerArchetype map[string]string, playerNames map[string]string) error {
	var decklists []DeckInfo

	for normalizedName, archetype := range playerArchetype {
		displayName := playerNames[normalizedName]
		if displayName == "" {
			displayName = normalizedName
		}

		decklists = append(decklists, DeckInfo{
			PlayerName: displayName,
			Archetype:  archetype,
			MainDeck:   []CardInfo{},
			Sideboard:  []CardInfo{},
		})
	}

	sort.Slice(decklists, func(i, j int) bool {
		return decklists[i].PlayerName < decklists[j].PlayerName
	})

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
