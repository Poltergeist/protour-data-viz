# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo shape

Three independent subprojects in a single repo, joined only by the JSON files in `data/`:

- `scraper/` — Go CLI that pulls match + deck data from melee.gg and writes JSON
- `web/` — Astro + React static site that imports the JSON at build time
- `mcp-server/` — TypeScript MCP server + REST API (Express) that reads the JSON at runtime, deployable to AWS Lambda via CDK

There is no root `package.json` and no workspaces; each subproject manages its own dependencies. `cd` into the relevant directory before running anything.

## The data contract

Everything pivots on four files in `data/` produced by the scraper:

- `tournament-394299-matches.json` — matches keyed by round number
- `tournament-394299-decklists.json` — full 60+15 decklists per player
- `tournament-394299-player-decks.json` — player → archetype map
- `tournament-394299-stats.json` — aggregated archetype stats + matchup matrix

These filenames are **hard-coded** in two consumers and changing them is a breaking change:
- `web/src/pages/*.astro` import them via relative path (`../../../data/...`)
- `mcp-server/src/data-loader.ts` has them in an `ALLOWED_FILES` allowlist (security boundary — files not in the list cannot be read)

If the scraper output schema changes, update `mcp-server/src/types.ts` and the web page imports together.

The tournament ID `394299` is also hard-coded in `scraper/main.go` (`tournamentID` constant). The repo is currently single-tournament.

## Common commands

### Scraper (Go)
```bash
cd scraper
go run . -rounds "4-8"          # default; ~2-3 min, hits melee.gg
go run . -rounds "4,5,6"        # specific rounds
go run . -rounds "4-8,12-16"    # multiple ranges
go build -o scraper             # build binary
```
Output goes to `../data/`. Polite 1s delay between round requests is built in — don't remove it.

### Web (Astro)
```bash
cd web
npm install
npm run dev      # dev server (http://localhost:4321)
npm run build    # runs prebuild (fetchCardImages.ts) → astro build
npm run preview
```
`npm run prebuild` fetches Scryfall card images into `public/card-images.json`. `npm run build` always runs it; the dev server does not.

### MCP server (TypeScript)
```bash
cd mcp-server
npm install
npm run dev          # tsx watch on http-server.ts (port 3000)
npm run mcp          # MCP stdio mode for testing
npm run build        # tsc only
npm run build:lambda # tsc + copies ../data and package.json into dist/
npm run deploy       # build:lambda + cdk deploy from cdk/
npm run test:api     # hit local REST API
npm run test:http    # hit local MCP endpoint
npm run test:queries # exercise query functions directly
npm run test:phase2  # data loader validation
```
Requires Node 22+ (declared in `engines`). The Lambda build is special: `dist/data/` is bundled alongside the JS, and `data-loader.ts` switches its `DATA_DIR` based on `AWS_LAMBDA_FUNCTION_NAME` being set.

### CDK (within `mcp-server/cdk/`)
```bash
cd mcp-server/cdk
npm install
npx cdk bootstrap   # one-time per account/region
npm run deploy
npm run diff
npm run destroy
```

## Architectural notes

**Scraper approach.** The `/Match/GetRoundMatches/{roundId}` endpoint on melee.gg is reachable via a DataTables-style `application/x-www-form-urlencoded` POST (see `scraper/ANALYSIS.md` for the param shape). Round IDs are not the same as round numbers — the scraper resolves them. Decklist HTML is scraped separately in `melee_decklists.go`. The dependency tree includes `chromedp` and `go-rod`, but the working path is the API call; browser automation is a fallback.

**Web rendering.** All pages are static (`output: 'static'`). Astro pages import the JSON directly at build time and React components (`.tsx`) handle interactivity. The site URL in `astro.config.mjs` is the GitHub Pages custom domain — changing it affects generated absolute URLs.

**MCP server dual interface.** Same query layer (`queries.ts`) backs both the MCP tools (registered in `http-server.ts` / `mcp-server.ts`) and the REST routes (`api-routes.ts`). Validation is centralized in `validation.ts` (Zod). Read-only by design; the file allowlist in `data-loader.ts` is the trust boundary.

**Lambda packaging.** `lambda.ts` wraps the Express app with `@vendia/serverless-express`. `build:lambda` literally `cp -r ../data dist/` — Lambda has no access to the repo `data/` directory at runtime.

## Deployment

- **Web** → GitHub Pages on push to `main` via `.github/workflows/deploy.yml`. Uses Node 22, builds `web/`, uploads `web/dist`. Custom domain set in `web/public/CNAME`.
- **MCP server** → AWS Lambda + API Gateway via CDK stack at `mcp-server/cdk/lib/mcp-server-stack.ts`.

## Conventions

- Conventional Commits (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`). Atomic commits — one logical change each. The git log on `main` follows this strictly; match the existing style.
- Tournament data treated as small enough to commit; the JSON files in `data/` are versioned.
- Note the tournament name discrepancy in existing docs: root README and Astro site call it "Pro Tour Lorwyn Eclipsed"; `mcp-server/README.md` calls it "Pro Tour - Aetherdrift". Same tournament (394299), inconsistent naming — don't "fix" one without the other.
