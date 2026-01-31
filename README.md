# ProTour Data Viz

A monorepo for collecting and visualizing Pokémon TCG tournament data from melee.gg.

## Project Structure

```
protour-data-viz/
├── scraper/        # Data scraper for melee.gg tournaments
├── web/            # Astro + React static website
└── data/           # Scraped tournament data (JSON)
```

## Quick Start

### Prerequisites

- Node.js 18+ (for web app)
- Go/Rust/TypeScript runtime (for scraper - TBD)

### Setup

1. Clone the repository
2. Set up the scraper:
   ```bash
   cd scraper
   # Follow scraper/README.md for setup
   ```

3. Set up the web app:
   ```bash
   cd web
   npm install
   npm run dev
   ```

## Workflow

1. **Run the scraper** to fetch tournament data
2. **Build the web app** to generate static site from scraped data
3. **Deploy** the static site

## Target Data

- **Source**: [melee.gg Tournament](https://melee.gg/Tournament/View/394299)
- **Rounds**: 4-8
- **Data Points**: Match results, deck lists, archetypes, player information

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
