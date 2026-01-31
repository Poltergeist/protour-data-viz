# Web App

Static website built with Astro + React for visualizing Pokémon TCG tournament data.

## Tech Stack

- **Framework**: Astro
- **UI Library**: React
- **Output**: Static HTML/CSS/JS

## Setup

```bash
npm install
```

## Development

```bash
npm run dev       # Start dev server
npm run build     # Build for production
npm run preview   # Preview production build
```

## Data Source

The web app reads tournament data from `../data/` at build time and generates static pages.

## Project Structure

```
web/
├── src/
│   ├── pages/          # Astro pages (routes)
│   ├── components/     # React components
│   ├── layouts/        # Page layouts
│   └── content/        # Content collections (optional)
├── public/             # Static assets
└── astro.config.mjs    # Astro configuration
```
