package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
)

// MeleeDeckInfo represents a player's deck information from melee.gg
type MeleeDeckInfo struct {
	PlayerName string     `json:"playerName"`
	Archetype  string     `json:"archetype"`
	MainDeck   []CardInfo `json:"mainDeck"`
	Sideboard  []CardInfo `json:"sideboard"`
	DecklistID string     `json:"decklistId"`
}

// fetchMeleeDecklists fetches full decklists from melee.gg using DecklistIDs
func fetchMeleeDecklists(allMatches map[int][]Match) ([]MeleeDeckInfo, error) {
	// Build a map of player -> decklist ID
	playerDecklistIDs := make(map[string]string)
	playerNames := make(map[string]string) // normalized -> display name
	
	for _, matches := range allMatches {
		for _, match := range matches {
			for _, competitor := range match.Competitors {
				if len(competitor.Decklists) > 0 && len(competitor.Team.Players) > 0 {
					decklistID := competitor.Decklists[0].DecklistID
					playerName := competitor.Team.Players[0].DisplayName
					normalizedName := normalizePlayerName(playerName)
					
					if decklistID != "" {
						playerDecklistIDs[normalizedName] = decklistID
						playerNames[normalizedName] = playerName
					}
				}
			}
		}
	}
	
	// Fetch each unique decklist
	var decklists []MeleeDeckInfo
	seenDecklists := make(map[string]bool)
	
	for normalizedName, decklistID := range playerDecklistIDs {
		if seenDecklists[decklistID] {
			continue
		}
		seenDecklists[decklistID] = true
		
		deck, err := fetchSingleMeleeDecklist(decklistID, playerNames[normalizedName])
		if err != nil {
			fmt.Printf("Warning: Failed to fetch decklist for %s (%s): %v\n", playerNames[normalizedName], decklistID, err)
			continue
		}
		
		decklists = append(decklists, deck)
	}
	
	return decklists, nil
}

// fetchSingleMeleeDecklist fetches a single decklist from melee.gg
func fetchSingleMeleeDecklist(decklistID, playerName string) (MeleeDeckInfo, error) {
	url := fmt.Sprintf("https://melee.gg/Decklist/View/%s", decklistID)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return MeleeDeckInfo{}, fmt.Errorf("failed to create request: %w", err)
	}
	
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return MeleeDeckInfo{}, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return MeleeDeckInfo{}, fmt.Errorf("failed to read response: %w", err)
	}
	
	html := string(body)
	
	// Parse the HTML to extract decklist information
	deck := MeleeDeckInfo{
		PlayerName: playerName,
		DecklistID: decklistID,
	}
	
	// Extract archetype from title or meta tags
	deck.Archetype = extractArchetype(html)
	
	// Try to extract from JSON embedded in the page
	mainDeck, sideboard := extractCardsFromMeleeHTML(html)
	deck.MainDeck = mainDeck
	deck.Sideboard = sideboard
	
	return deck, nil
}

// extractArchetype extracts the archetype name from HTML
func extractArchetype(html string) string {
	// Try meta description first
	metaPattern := regexp.MustCompile(`<meta[^>]*content="([^"]*?)\s*-\s*[^"]*?"[^>]*name="description"`)
	if matches := metaPattern.FindStringSubmatch(html); len(matches) >= 2 {
		return strings.TrimSpace(matches[1])
	}
	
	// Try og:title
	ogPattern := regexp.MustCompile(`<meta[^>]*property="og:title"[^>]*content="([^"]*?)"`)
	if matches := ogPattern.FindStringSubmatch(html); len(matches) >= 2 {
		return strings.TrimSpace(matches[1])
	}
	
	return "Unknown"
}

// extractCardsFromMeleeHTML extracts cards from melee.gg HTML
func extractCardsFromMeleeHTML(html string) ([]CardInfo, []CardInfo) {
	var mainDeck []CardInfo
	var sideboard []CardInfo
	
	// Try to find JSON data in script tags
	jsonPattern := regexp.MustCompile(`(?s)var\s+decklistData\s*=\s*({.*?});`)
	if matches := jsonPattern.FindStringSubmatch(html); len(matches) >= 2 {
		var data map[string]interface{}
		if err := json.Unmarshal([]byte(matches[1]), &data); err == nil {
			// Parse the JSON structure (format may vary)
			// This is a placeholder - actual implementation depends on melee.gg's format
		}
	}
	
	// Fallback: Parse visible card list from HTML
	mainDeck = parseCardListFromHTML(html, "main-deck", "sideboard")
	sideboard = parseCardListFromHTML(html, "sideboard", "")
	
	return mainDeck, sideboard
}

// parseCardListFromHTML parses card list from HTML sections
func parseCardListFromHTML(html, startMarker, endMarker string) []CardInfo {
	var cards []CardInfo
	
	// Find the section between markers
	var section string
	if endMarker != "" {
		pattern := regexp.MustCompile(fmt.Sprintf(`(?si)%s(.*?)%s`, regexp.QuoteMeta(startMarker), regexp.QuoteMeta(endMarker)))
		if matches := pattern.FindStringSubmatch(html); len(matches) >= 2 {
			section = matches[1]
		}
	} else {
		pattern := regexp.MustCompile(fmt.Sprintf(`(?si)%s(.*?)(?:</div>|</section>)`, regexp.QuoteMeta(startMarker)))
		if matches := pattern.FindStringSubmatch(html); len(matches) >= 2 {
			section = matches[1]
		}
	}
	
	if section == "" {
		return cards
	}
	
	// Pattern: <span class="quantity">4</span> Card Name
	// or similar variations
	cardPattern := regexp.MustCompile(`(?i)<span[^>]*class="[^"]*quantity[^"]*"[^>]*>(\d+)</span>\s*([^<]+)`)
	cardMatches := cardPattern.FindAllStringSubmatch(section, -1)
	
	for _, match := range cardMatches {
		if len(match) >= 3 {
			quantity := 0
			fmt.Sscanf(match[1], "%d", &quantity)
			cardName := strings.TrimSpace(match[2])
			
			// Clean up HTML entities and extra whitespace
			cardName = strings.ReplaceAll(cardName, "&nbsp;", " ")
			cardName = regexp.MustCompile(`\s+`).ReplaceAllString(cardName, " ")
			cardName = strings.TrimSpace(cardName)
			
			if cardName != "" && quantity > 0 {
				cards = append(cards, CardInfo{
					Quantity: quantity,
					Name:     cardName,
				})
			}
		}
	}
	
	return cards
}
