package main

import (
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
)

const (
	decklistPageBase = "https://magic.gg/decklists/pro-tour-lorwyn-eclipsed-standard-decklists"
)

// DeckInfo represents a player's deck information
type DeckInfo struct {
	PlayerName string `json:"playerName"`
	Archetype  string `json:"archetype"`
}

// fetchDecklists fetches all decklists from magic.gg pages
func fetchDecklists() ([]DeckInfo, error) {
	pages := []string{"a-e", "f-l", "m-r", "s-z"}
	var allDecks []DeckInfo

	for _, page := range pages {
		url := fmt.Sprintf("%s-%s", decklistPageBase, page)
		decks, err := scrapeDecklistPage(url)
		if err != nil {
			return nil, fmt.Errorf("failed to scrape %s: %w", page, err)
		}
		allDecks = append(allDecks, decks...)
	}

	return allDecks, nil
}

// scrapeDecklistPage scrapes a single decklist page
func scrapeDecklistPage(url string) ([]DeckInfo, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	return parseDecklists(string(body)), nil
}

// parseDecklists extracts player names and archetypes from HTML
func parseDecklists(html string) []DeckInfo {
	var decks []DeckInfo

	// Pattern: <deck-list deck-title="Player Name" subtitle="Archetype"
	re := regexp.MustCompile(`<deck-list[^>]*deck-title="([^"]*)"[^>]*subtitle="([^"]*)"`)
	matches := re.FindAllStringSubmatch(html, -1)

	for _, match := range matches {
		if len(match) >= 3 {
			playerName := strings.TrimSpace(match[1])
			archetype := strings.TrimSpace(match[2])
			
			decks = append(decks, DeckInfo{
				PlayerName: playerName,
				Archetype:  archetype,
			})
		}
	}

	return decks
}
