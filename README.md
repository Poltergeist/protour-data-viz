# ProTour Data Viz

A monorepo for collecting and visualizing Pokémon TCG Pro Tour tournament data from melee.gg.

## Project Structure

```
protour-data-viz/
├── scraper/        # Go-based data scraper for melee.gg tournaments
├── web/            # Astro + React static website
└── data/           # Scraped tournament data (JSON)
```

## Quick Start

### Prerequisites

- Node.js 18+ (for web app)
- Go 1.21+ (for scraper)

### Setup

1. Clone the repository
2. Set up the scraper:
   ```bash
   cd scraper
   go build -o scraper .
   ```

3. Set up the web app:
   ```bash
   cd web
   npm install
   npm run dev
   ```

## Updating Tournament Data

To refresh the tournament data with the latest information from melee.gg:

### 1. Run the Scraper

```bash
cd scraper
./scraper -rounds "4-8"
```

**What this does:**
- Fetches match data for rounds 4-8 from melee.gg API
- Scrapes complete decklists (60-card main deck + 15-card sideboard) for all players
- Generates player-to-deck archetype mappings
- Calculates aggregated statistics and matchup data
- Outputs JSON files to `../data/`

**Options:**
- `-rounds "4-8"` - Scrape rounds 4 through 8 (default)
- `-rounds "4,5,6"` - Scrape specific rounds
- `-rounds "4-8,12-16"` - Scrape multiple ranges

**Duration:** ~2-3 minutes to fetch all 304 decklists from melee.gg

**Output files:**
- `tournament-394299-matches.json` - Raw match data
- `tournament-394299-decklists.json` - Complete decklists with cards
- `tournament-394299-player-decks.json` - Player-to-archetype mapping
- `tournament-394299-stats.json` - Aggregated statistics

### 2. Rebuild the Web App

After updating the data, rebuild the static site:

```bash
cd web
npm run build
```

The web app will automatically use the updated JSON files from `../data/`.

### 3. Deploy (Optional)

If hosting the site:

```bash
cd web
npm run preview  # Preview locally
# Or deploy the dist/ folder to your hosting service
```

## Workflow

1. **Run the scraper** to fetch latest tournament data from melee.gg
2. **Build the web app** to generate static site from scraped data
3. **Deploy** the static site (if applicable)

## Data Source

- **Tournament**: [Pro Tour Lorwyn Eclipsed](https://melee.gg/Tournament/View/394299)
- **Rounds**: 4-8 (Standard format, Day 1)
- **Data Points**: 
  - Match results and standings
  - Complete decklists with card quantities
  - Deck archetypes and player information
  - Win rates and head-to-head matchups

## Development

See [.github/copilot-instructions.md](.github/copilot-instructions.md) for detailed development guidelines.

## Git Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/):
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `chore`: Maintenance tasks
- `refactor`: Code refactoring
- `test`: Test additions/changes

Make atomic commits - one logical change per commit.
