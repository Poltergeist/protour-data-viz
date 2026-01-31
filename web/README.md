# Pro Tour Data Visualization - Web App

Interactive web application for visualizing Pro Tour tournament statistics built with Astro and React.

## Features

- **Statistics Dashboard**: Win rates by archetype with color-coded bar charts
- **Matchup Matrix**: Interactive head-to-head matchup table with percentage breakdowns
- **Decklists Browser**: Search and filter through all player decklists with full card lists
- **Magic.gg Styling**: Dark theme matching official Magic tournament site

## Tech Stack

- **Astro** 5.1.4 - Static site generator
- **React** 19.0.0 - UI components
- **Recharts** 2.15.0 - Data visualization
- **TypeScript** 5.7.2 - Type safety

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Data Sources

The app loads tournament data from JSON files in `/data`:
- `tournament-394299-matches.json` - Raw match data (735 matches)
- `tournament-394299-decklists.json` - Complete decklists (306 players)
- `tournament-394299-stats.json` - Aggregated statistics (40 archetypes)

## Pages

- `/` - Home page with tournament overview
- `/statistics` - Win rates and matchup matrix
- `/decklists` - Searchable decklist browser

## Styling

Custom CSS using magic.gg color palette:
- Background: `#121212` (primary), `#1a1a1e` (secondary)
- Accent: `#ff6000` (orange), `#e83411` (hover)
- Font: Open Sans (Google Fonts)

## Deployment

Static site ready for deployment to:
- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

Build output is in `/dist` directory.
