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
- `tournament-394299-matches.json` - Raw match results by round
- `tournament-394299-decklists.json` - Player names and deck archetypes  
- `tournament-394299-stats.json` - Aggregated statistics (win rates, head-to-head matchups)

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
