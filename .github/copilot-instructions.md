# Copilot Instructions for ProTour Data Viz

## Project Overview

This is a monorepo containing two interconnected projects for collecting and visualizing Pokémon TCG tournament data:

1. **Scraper** (`/scraper`): Data collection tool that scrapes tournament match information and deck configurations from melee.gg (specifically tournament rounds 4-8)
2. **Web App** (`/web`): Static website built with Astro + React to visualize the scraped tournament data

## Monorepo Structure

```
/scraper    # Data scraper (Go, Rust, or TypeScript - TBD)
/web        # Astro + React static site
/data       # Shared tournament data (JSON/output from scraper)
```

## Build & Run Commands

### Scraper

```bash
cd scraper
# Commands TBD based on chosen language:
# - Go: go run main.go / go build
# - Rust: cargo run / cargo build
# - TypeScript: npm run dev / npm run build
```

### Web App

```bash
cd web
npm install              # Install dependencies
npm run dev              # Start dev server
npm run build            # Build static site
npm run preview          # Preview production build
```

## Key Architecture Patterns

### Data Flow

1. Scraper fetches data from melee.gg tournament pages
2. Outputs structured data (likely JSON) to `/data` directory
3. Web app reads from `/data` at build time to generate static pages

### Scraper Target Data

- **Source**: https://melee.gg/Tournament/View/394299
- **Match Information**: Rounds 4-8 with player matchups and results
- **Deck Data**: 
  - Complete deck lists (card configurations)
  - Deck archetypes
  - Player information

### Web App

- **Framework**: Astro (static site generation)
- **UI Components**: React
- **Data Loading**: Import scraped JSON during build time (Astro's content collections or direct imports)
- **Output**: Static HTML/JS/CSS for deployment

## Key Conventions

### Data Schema

Design a consistent JSON schema for tournament data early. Both projects depend on this contract:
- Match records (round, player1, player2, result)
- Deck lists (player, archetype, cards)
- Ensure scraper output matches web app expectations

### Scraping Best Practices

- Respect rate limits (add delays between requests)
- Cache responses to avoid re-scraping
- Handle pagination for multi-page tournament results
- Implement error handling for network failures and DOM changes

### Astro Patterns

- Use `.astro` files for pages and layouts
- Use React components (`.tsx`) for interactive visualizations
- Leverage Astro's `getStaticPaths()` for dynamic routes based on scraped data
- Keep client-side JavaScript minimal (use `client:load` directive sparingly)

## Testing Strategy

### Scraper
- Test against sample HTML fixtures (avoid hitting live site repeatedly)
- Validate output JSON schema
- Test error handling (network failures, missing data)

### Web App
- Test data loading and transformation
- Visual regression testing for charts/visualizations
- Validate static build output

## Development Workflow

1. **First time setup**: Build scraper first to establish data schema
2. **Iterative development**: Run scraper → inspect output → adjust web app
3. **Data updates**: Re-run scraper when tournament data changes
4. **Deployment**: Build static site and host (Netlify, Vercel, GitHub Pages)

## Git Conventions

- **Use atomic commits**: Each commit should represent a single logical change
- **Follow Conventional Commits**: Format commit messages as `<type>(<scope>): <description>`
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
  - Examples:
    - `feat(scraper): add deck archetype detection`
    - `fix(web): correct tournament round filtering`
    - `docs: update setup instructions in README`
    - `chore(deps): update astro to v4.0`

## External Dependencies

- **melee.gg**: Primary data source (no official API, web scraping required)
- Be prepared for site structure changes requiring scraper updates
