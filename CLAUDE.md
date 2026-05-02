# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo shape

Three independent subprojects in a single repo, joined only by the JSON files in `data/`:

- `scraper/` — Go CLI that pulls match + deck data from melee.gg and writes JSON
- `web/` — Astro + React static site that imports the JSON at build time
- `mcp-server/` — TypeScript MCP server + REST API (Express) that reads the JSON at runtime, deployable to AWS Lambda via CDK

There is no root `package.json` and no workspaces; each subproject manages its own dependencies. `cd` into the relevant directory before running anything.

## The data contract

Five files in `data/` form the contract:

- `tournaments.json` — registry of all known tournaments (id, slug, name, format, date, rounds, completed). Hand-maintained; drives the scraper and (post-Stage-2) the MCP/REST allowlist and the web routing.
- `tournament-<id>-matches.json` — per-tournament matches keyed by round number
- `tournament-<id>-decklists.json` — per-tournament full 60+15 decklists per player
- `tournament-<id>-player-decks.json` — per-tournament player → archetype map
- `tournament-<id>-stats.json` — per-tournament aggregated archetype stats + matchup matrix

The scraper, MCP server, and web app all read `tournaments.json` — no hardcoded tournament IDs anywhere. The MCP server's data-loader builds its allowlist dynamically from the registry; the web app's `getStaticPaths` enumerates per-slug routes from it.

If the scraper output schema changes, update `mcp-server/src/types.ts` and `web/src/utils/tournaments.ts` together (the loose `any`/`Record<string, string>` typings in the web util mean type errors won't surface there, but rendering will break).

## Common commands

### Scraper (Go)
```bash
cd scraper
go run .                            # sweep: scrape all completed:false tournaments in data/tournaments.json
go run . -tournament 415628         # targeted: scrape one tournament (must be in registry)
go run . -tournament 415628 -rounds "4-8"   # override registry rounds for this run
go test ./...                       # run scraper unit tests
go build -o scraper                 # build binary
```
Output goes to `../data/`. The scraper reads `data/tournaments.json` to know what to scrape; `completed: true` entries are skipped. Round IDs are discovered from the tournament page on each run via regex over `<button class="round-selector" data-id="...">` (no hardcoded mapping). Polite 1s delay between rounds and between tournaments — don't remove it.

### Web (Astro)
```bash
cd web
npm install
npm run dev      # dev server (http://localhost:4321)
npm run build    # runs prebuild (fetchCardImages.ts across all tournaments) → astro build
npm run preview
```
`npm run prebuild` fetches Scryfall card images for the union of cards across every tournament in the registry into `public/card-images.json`. `npm run build` always runs it; the dev server does not.

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

**Scraper approach.** The `/Match/GetRoundMatches/{roundId}` endpoint on melee.gg is reachable via a DataTables-style `application/x-www-form-urlencoded` POST (see `scraper/ANALYSIS.md` for the param shape). Round IDs differ per tournament — `scraper/round_ids.go` resolves them by GETting `https://melee.gg/Tournament/View/{id}` and parsing `<button class="round-selector" data-id="...">` elements. Decklist HTML is scraped separately in `melee_decklists.go`. The dependency tree includes `chromedp` and `go-rod`, but the working path is the API call; browser automation is a fallback.

**Web rendering.** All pages are static (`output: 'static'`). The root `/` is a tournaments index that lists registered tournaments from `data/tournaments.json`. Per-tournament pages live under `/<slug>/` and use Astro's `getStaticPaths()` (via `src/utils/tournaments.ts`) to enumerate slugs from the registry; data files are loaded at build time via the same util. React components (`.tsx`) handle interactivity. The site URL in `astro.config.mjs` is the GitHub Pages custom domain — changing it affects generated absolute URLs.

**MCP server dual interface.** Same query layer (`queries.ts`) backs both the MCP tools (registered in `http-server.ts` / `mcp-server.ts`) and the REST routes (`api-routes.ts`). Validation is centralized in `validation.ts` (Zod). Read-only by design; the file allowlist in `data-loader.ts` is the trust boundary.

**Lambda packaging.** `lambda.ts` wraps the Express app with `@vendia/serverless-express`. `build:lambda` literally `cp -r ../data dist/` — Lambda has no access to the repo `data/` directory at runtime.

## Deployment

- **Web** → GitHub Pages on push to `main` via `.github/workflows/deploy.yml`. Uses Node 22, builds `web/`, uploads `web/dist`. Custom domain set in `web/public/CNAME`.
- **MCP server** → AWS Lambda + API Gateway via CDK stack at `mcp-server/cdk/lib/mcp-server-stack.ts`.

## Conventions

- Conventional Commits (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`). Atomic commits — one logical change each. The git log on `main` follows this strictly; match the existing style.
- Tournament data treated as small enough to commit; the JSON files in `data/` are versioned.
- Note the tournament name discrepancy in existing docs: root README and Astro site call it "Pro Tour Lorwyn Eclipsed"; `mcp-server/README.md` calls it "Pro Tour - Aetherdrift". Same tournament (394299), inconsistent naming — don't "fix" one without the other.
