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
# Run the scraper
go run main.go

# Build executable
go build -o scraper

# Run tests
go test ./...
```

## Output

Scraped data is saved to `../data/` in JSON format:
- `tournament-394299.json` - Main tournament data
- Additional files as needed for matches, decks, players

## Project Structure

```
scraper/
├── main.go          # Entry point and scraping logic
├── go.mod           # Go module definition
└── go.sum           # Dependency checksums
```
