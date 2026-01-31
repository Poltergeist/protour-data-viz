package main

import (
"fmt"
"io"
"net/http"
"regexp"
"strings"
"time"
)

// fetchDecklistsFromMelee fetches full decklists with card information from melee.gg
func fetchDecklistsFromMelee(allMatches map[int][]Match, playerArchetype map[string]string, playerNames map[string]string) ([]DeckInfo, error) {
// Build a map of player -> decklist ID (deduplicated)
decklistIDs := make(map[string]string) // normalized name -> decklist ID

for _, matches := range allMatches {
for _, match := range matches {
for _, competitor := range match.Competitors {
if len(competitor.Decklists) > 0 && len(competitor.Team.Players) > 0 {
decklistID := competitor.Decklists[0].DecklistID
playerName := competitor.Team.Players[0].DisplayName
normalizedName := normalizePlayerName(playerName)

if decklistID != "" {
decklistIDs[normalizedName] = decklistID
}
}
}
}
}

// Fetch each unique decklist
var decklists []DeckInfo
count := 0
total := len(decklistIDs)

for normalizedName, decklistID := range decklistIDs {
count++
if count%10 == 0 {
fmt.Printf("    Fetching decklist %d/%d...\n", count, total)
}

deck, err := fetchSingleMeleeDecklist(decklistID, playerNames[normalizedName], playerArchetype[normalizedName])
if err != nil {
fmt.Printf("    Warning: Failed to fetch decklist for %s: %v\n", playerNames[normalizedName], err)
// Create placeholder
deck = DeckInfo{
PlayerName: playerNames[normalizedName],
Archetype:  playerArchetype[normalizedName],
MainDeck:   []CardInfo{},
Sideboard:  []CardInfo{},
}
}

decklists = append(decklists, deck)

// Be polite - add delay between requests
time.Sleep(300 * time.Millisecond)
}

return decklists, nil
}

// fetchSingleMeleeDecklist fetches a single decklist from melee.gg
func fetchSingleMeleeDecklist(decklistID, playerName, archetype string) (DeckInfo, error) {
url := fmt.Sprintf("https://melee.gg/Decklist/View/%s", decklistID)

req, err := http.NewRequest("GET", url, nil)
if err != nil {
return DeckInfo{}, fmt.Errorf("failed to create request: %w", err)
}

req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

client := &http.Client{}
resp, err := client.Do(req)
if err != nil {
return DeckInfo{}, fmt.Errorf("failed to send request: %w", err)
}
defer resp.Body.Close()

body, err := io.ReadAll(resp.Body)
if err != nil {
return DeckInfo{}, fmt.Errorf("failed to read response: %w", err)
}

html := string(body)

// Parse the HTML to extract cards
mainDeck, sideboard := parseCardsFromMeleeHTML(html)

return DeckInfo{
PlayerName: playerName,
Archetype:  archetype,
MainDeck:   mainDeck,
Sideboard:  sideboard,
}, nil
}

// parseCardsFromMeleeHTML extracts cards from melee.gg HTML
func parseCardsFromMeleeHTML(html string) ([]CardInfo, []CardInfo) {
var mainDeck []CardInfo
var sideboard []CardInfo

// Pattern to find decklist records:
// <span class="decklist-record-quantity">4</span>
// <a class="decklist-record-name" ...>Lightning Helix</a>
recordPattern := regexp.MustCompile(`(?s)<span class="decklist-record-quantity">(\d+)</span>\s*<a class="decklist-record-name"[^>]*>([^<]+)</a>`)

// Find the main decklist container (before sideboard section)
// Split at sideboard section
parts := strings.Split(html, `<div class="decklist-category-title">Sideboard`)

if len(parts) > 0 {
// Parse main deck from first part
mainDeckHTML := parts[0]
matches := recordPattern.FindAllStringSubmatch(mainDeckHTML, -1)
for _, match := range matches {
if len(match) >= 3 {
quantity := 0
fmt.Sscanf(match[1], "%d", &quantity)
cardName := strings.TrimSpace(match[2])
// Decode HTML entities
cardName = strings.ReplaceAll(cardName, "&#39;", "'")
cardName = strings.ReplaceAll(cardName, "&amp;", "&")

mainDeck = append(mainDeck, CardInfo{
Quantity: quantity,
Name:     cardName,
})
}
}
}

if len(parts) > 1 {
// Parse sideboard from second part
sideboardHTML := parts[1]
matches := recordPattern.FindAllStringSubmatch(sideboardHTML, -1)
for _, match := range matches {
if len(match) >= 3 {
quantity := 0
fmt.Sscanf(match[1], "%d", &quantity)
cardName := strings.TrimSpace(match[2])
// Decode HTML entities
cardName = strings.ReplaceAll(cardName, "&#39;", "'")
cardName = strings.ReplaceAll(cardName, "&amp;", "&")

sideboard = append(sideboard, CardInfo{
Quantity: quantity,
Name:     cardName,
})
}
}
}

return mainDeck, sideboard
}
