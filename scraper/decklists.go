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
	PlayerName string     `json:"playerName"`
	Archetype  string     `json:"archetype"`
	MainDeck   []CardInfo `json:"mainDeck"`
	Sideboard  []CardInfo `json:"sideboard"`
}

// CardInfo represents a card with quantity
type CardInfo struct {
	Quantity int    `json:"quantity"`
	Name     string `json:"name"`
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

// parseDecklists extracts player names, archetypes, and full deck lists from HTML
func parseDecklists(html string) []DeckInfo {
	var decks []DeckInfo

	// Pattern: <deck-list deck-title="Player Name" subtitle="Archetype"...>...</deck-list>
	deckPattern := regexp.MustCompile(`(?s)<deck-list[^>]*deck-title="([^"]*)"[^>]*subtitle="([^"]*)"[^>]*>(.*?)</deck-list>`)
	deckMatches := deckPattern.FindAllStringSubmatch(html, -1)

	for _, match := range deckMatches {
		if len(match) >= 4 {
			playerName := strings.TrimSpace(match[1])
			archetype := strings.TrimSpace(match[2])
			deckContent := match[3]
			
			// Extract main deck
			mainDeck := extractCards(deckContent, "main-deck")
			
			// Extract sideboard
			sideboard := extractCards(deckContent, "side-board")
			
			decks = append(decks, DeckInfo{
				PlayerName: playerName,
				Archetype:  archetype,
				MainDeck:   mainDeck,
				Sideboard:  sideboard,
			})
		}
	}

	return decks
}

// extractCards extracts cards from a deck section (main-deck or side-board)
func extractCards(deckContent, section string) []CardInfo {
	var cards []CardInfo
	
	// Pattern: <main-deck> or <side-board>
	sectionPattern := regexp.MustCompile(fmt.Sprintf(`(?s)<%s>(.*?)</%s>`, section, section))
	sectionMatch := sectionPattern.FindStringSubmatch(deckContent)
	
	if len(sectionMatch) < 2 {
		return cards
	}
	
	sectionContent := sectionMatch[1]
	
	// Split by newlines and parse each card line
	lines := strings.Split(sectionContent, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		
		// Pattern: "4 Card Name" or "1 Card Name"
		cardPattern := regexp.MustCompile(`^(\d+)\s+(.+)$`)
		cardMatch := cardPattern.FindStringSubmatch(line)
		
		if len(cardMatch) >= 3 {
			quantity := 0
			fmt.Sscanf(cardMatch[1], "%d", &quantity)
			cardName := strings.TrimSpace(cardMatch[2])
			
			cards = append(cards, CardInfo{
				Quantity: quantity,
				Name:     cardName,
			})
		}
	}
	
	return cards
}
