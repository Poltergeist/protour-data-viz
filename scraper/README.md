# Scraper

Data scraper for collecting Pokémon TCG tournament information from melee.gg.

## Purpose

Scrapes tournament data including:
- Match results from rounds 4-8
- Complete deck lists
- Deck archetypes
- Player information

## Target

- **Tournament URL**: https://melee.gg/Tournament/View/394299

## Tech Stack

- **Language**: Go 1.21+
- **Framework**: [Colly](https://github.com/gocolly/colly) - web scraping framework
- **HTML Parsing**: goquery (jQuery-like selectors)

## Setup

1. Ensure Go 1.21+ is installed:
   ```bash
   go version
   ```

2. Install dependencies:
   ```bash
   go mod download
   ```

## Development

```bash
cd scraper

# Run with default rounds (4-8)
go run .

# Specify custom rounds
go run . --rounds 4-8,12-16

# Build executable
go build -o scraper

# Run built executable
./scraper --rounds 4-8
```

## Output

Scraped data is saved to `../data/` in JSON format:

### tournament-394299-matches.json
Raw match results organized by round. Contains:
- Player names
- Match results (e.g., "Player won 2-1-0")
- Table numbers
- 735 total matches from Rounds 4-8

### tournament-394299-decklists.json  
Complete deck lists for all 306 players. Each entry includes:
- Player name
- Deck archetype
- **Main deck**: Array of cards with quantities (60 cards)
- **Sideboard**: Array of cards with quantities (15 cards)
- 341 unique cards across all decks

Example:
```json
{
  "playerName": "David Åberg",
  "archetype": "Izzet Lessons",
  "mainDeck": [
    {"quantity": 4, "name": "Monument to Endurance"},
    {"quantity": 4, "name": "Accumulate Wisdom"},
    ...
  ],
  "sideboard": [
    {"quantity": 2, "name": "Soul-Guide Lantern"},
    ...
  ]
}
```

### tournament-394299-stats.json
Aggregated statistics for visualization. Contains:
- Overall W-L-D records per archetype
- Win rate percentages
- Head-to-head matchup matrix with percentages
- 40 archetypes with statistics

## Example Output

```
=== Tournament Statistics Summary ===

Top Archetypes (10+ matches):
  Azorius Tempo: 8-2 (80.0% win rate)
  Grixis Elementals: 21-6 (77.8% win rate)
  Izzet Spellementals: 44-17 (72.1% win rate)
  Izzet Prowess: 15-9 (62.5% win rate)
  Izzet Lessons: 31-22 (58.5% win rate)

Total archetypes: 40
=====================================
```

## Project Structure

```
scraper/
├── main.go          # Entry point and scraping logic
├── go.mod           # Go module definition
└── go.sum           # Dependency checksums
```
