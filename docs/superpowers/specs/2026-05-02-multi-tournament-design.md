# Multi-tournament support

**Status:** Approved (design phase)
**Date:** 2026-05-02
**Trigger:** Adding melee.gg tournament 415628 alongside existing 394299 (Pro Tour Lorwyn Eclipsed).

## Goal

Convert the repo from accidentally-single-tournament (394299 hardcoded throughout) to genuinely multi-tournament: both 394299 and 415628 (and future tournaments) coexist, each visible on the website, queryable via the MCP/REST API, and refreshable via the scraper.

## Non-goals

- Cross-tournament comparison features (e.g. "this archetype's win rate across both tournaments"). The data shape supports it later; no UI/API for it now.
- Per-block (Day 1 vs Day 2) UI breakdowns. Round ranges are stored as flat arrays without block labels.
- Auto-detection of tournament completion from melee.gg. The `completed` flag is human-maintained.
- Renaming any data file or breaking JSON schemas. Per-tournament filenames already exist (`tournament-{id}-*.json`).
- Backwards-compatible API aliases. The flat `/api/matches` shape goes away cleanly.

## Architectural decisions

### 1. Tournament registry: `data/tournaments.json`

Hand-maintained JSON array, single source of truth for what tournaments exist and how they appear:

```json
[
  {
    "id": "415628",
    "slug": "<filled in by user when seeding>",
    "name": "<filled in by user when seeding>",
    "format": "Standard",
    "date": "<filled in by user when seeding>",
    "rounds": ["4-8", "12-16"],
    "completed": false
  },
  {
    "id": "394299",
    "slug": "lorwyn-eclipsed",
    "name": "Pro Tour Lorwyn Eclipsed",
    "format": "Standard",
    "date": "2026-01-31",
    "rounds": ["4-8"],
    "completed": true
  }
]
```

**Field semantics:**
- `id` — melee.gg tournament ID; embedded in data filenames.
- `slug` — URL-safe identifier; drives `/<slug>/...` web routing; must be unique.
- `name` — display name shown in UI and API responses.
- `format` — e.g. "Standard". Free-text.
- `date` — ISO date for sort order on the tournaments index page.
- `rounds` — array of range strings (`["4-8", "12-16"]`). The scraper joins them into the comma-form its existing `parseRounds` already handles.
- `completed` — when `true`, scraper skips it. Web/MCP still serve it as a finished archive. To re-scrape, flip to `false` (no `--force` flag).

Order in the array = display order on the home page (newest first by convention).

### 2. Scraper

Hardcoded `tournamentID` and `tournamentURL` constants in `scraper/main.go` are removed. Scraper becomes registry-driven.

**Invocation:**
```bash
./scraper                          # sweep: scrape every entry where completed: false
./scraper -tournament 415628       # targeted: just this one (must exist in registry)
./scraper -tournament 415628 -rounds "4-8"   # override registry rounds for this run
```

**Behavior:**
- On startup, load `data/tournaments.json`. Error out if missing or malformed.
- Default mode iterates non-`completed` entries in registry order.
- Targeted mode requires the ID to exist in the registry; refuses unknown IDs (forces a registry edit before first scrape).
- `-rounds` flag overrides registry `rounds` only for the current run; doesn't write back.
- `completed: true` entries silently skipped in sweep mode. In targeted mode, scraping a `completed` tournament prints a warning and exits non-zero.
- Existing 1s polite delay between rounds preserved; same delay added between tournaments in sweep mode.
- Output filenames unchanged: `tournament-{id}-{matches,decklists,player-decks,stats}.json`.
- Scraper does not write tournament metadata. The registry is the source of truth for `name`, `format`, `date`, `slug`.

### 3. Web app routing

**URL shape:**
```
/                              tournaments index (root intro)
/<slug>/                       tournament home (current home page content, scoped)
/<slug>/statistics
/<slug>/decklists
/<slug>/archetypes
```

**Astro implementation:**
- Existing pages (`statistics.astro`, `decklists.astro`, `archetypes.astro`, current `index.astro`) move under `src/pages/[slug]/` and become dynamic via `getStaticPaths()`. The path generator reads `data/tournaments.json`, emits one path per slug, and passes the tournament's data files as props.
- Direct JSON imports (`import decklists from '../../../data/tournament-394299-decklists.json'`) are replaced with a small loader: given a tournament ID, returns `{ matches, decklists, playerDecks, stats }`. Used by `getStaticPaths` to inject data into each page.
- A new `src/pages/index.astro` becomes the root tournaments index — lists every registry entry with summary cards (player count, archetype count, completed/in-progress badge), sorted by `date` descending. Each card links to `/<slug>/`. Player count derives from `decklists.length`; archetype count from `Object.keys(stats.archetypes).length`. Tournaments that haven't been scraped yet (no data files on disk) render a placeholder card showing only registry metadata and an "in progress" badge.

**Layout / component changes:**
- `Layout.astro` — title and header currently hardcode "Pro Tour Lorwyn Eclipsed". Becomes prop-driven (`<Layout title={tournament.name} ...>`).
- React components (`WinRateChart`, `MatchupTable`, `ArchetypeBreakdown`, `DeckListViewer`, `CardImage`) — already take data as props; no changes expected. Verify during implementation.
- `astro.config.mjs` `site` URL unchanged. The Lorwyn Eclipsed–branded subdomain remains the umbrella host for multi-tournament; no per-tournament domains.
- `web/scripts/fetchCardImages.ts` — currently builds one `card-images.json`. Updates to union cards across **all** registered tournaments into a single global image cache (cards are shared, no point splitting).

**SEO/links:**
- Old URLs (`/statistics`, `/decklists`) break. The home page becoming a tournaments index means `/` still works for anyone who bookmarked the root. No redirects added unless a known consumer breaks.

### 4. MCP / REST API

Tournament ID becomes mandatory in the URL path; no default fallback, no implicit "current" tournament.

**REST endpoint shape:**
```
GET /api/tournaments                                            list all tournaments (registry)
GET /api/tournaments/:id                                        tournament metadata
GET /api/tournaments/:id/matches?round=&player=&archetype=
GET /api/tournaments/:id/decks?archetype=&player=
GET /api/tournaments/:id/stats
GET /api/tournaments/:id/players/:player/deck
GET /api/tournaments/:id/archetypes
```

The current flat `/api/matches` etc. routes are removed (not aliased).

**MCP tools:**
- All existing tools (`query_matches`, `query_decks`, `query_stats`, `query_player_deck`, `list_archetypes`, `get_tournament_info`) gain a required `tournament_id: string` argument in their input schemas.
- New tool: `list_tournaments` (no args) — returns the registry so consumers can discover IDs/slugs.
- Tool descriptions updated to mention the requirement and reference `list_tournaments` for discovery.

**Data loader changes (`mcp-server/src/data-loader.ts`):**
- `ALLOWED_FILES` becomes dynamic — built at module load time from the registry: for each registered `id`, the four `tournament-{id}-{matches,decklists,player-decks,stats}.json` files are allowed. The allowlist principle is preserved (only files matching the pattern for *registered* IDs); arbitrary file access still blocked.
- `tournaments.json` itself is added to the allowlist.
- A new `getTournaments()` helper reads `tournaments.json`.
- All loader functions (`loadMatches()`, etc.) gain a `tournamentId` parameter.
- Lambda packaging (`build:lambda`) is unchanged — `cp -r ../data dist/` already includes `tournaments.json` and any new tournament data files automatically.

**Validation (`mcp-server/src/validation.ts`):**
- New `tournamentIdSchema` (Zod) — string matching registered IDs. Used as a required field on every existing query schema.
- Unknown tournament ID → 404 (REST) / structured error (MCP).

**Documentation:**
- `mcp-server/openapi.json` regenerated for the new shape.
- `mcp-server/README.md`, `API.md`, `TOOLS.md`, `CHATGPT-INSTRUCTIONS*.md`, `EXAMPLES.md` updated for new URLs/tool args.
- `mcp-server/CHATGPT-INSTRUCTIONS-COMPACT.md` and the OpenAPI spec drive the existing ChatGPT custom GPT; that integration must be re-imported after deploy.

## Migration & rollout

Three independent stages, one PR per stage:

### Stage 1 — Registry + scraper
- Add `data/tournaments.json` with the 394299 entry (`completed: true`) and the 415628 entry (`completed: false`, with name/slug/date/rounds filled in).
- Refactor scraper per Section 2.
- Run scraper for 415628 → produces `tournament-415628-*.json` in `data/`.
- After this stage: data exists, web and MCP still work for 394299 only.

### Stage 2 — MCP server
- Refactor data-loader, queries, validation, REST routes, MCP tools.
- Update `openapi.json` and all docs listed above.
- Bump `mcp-server` to `0.2.0` (signals the breaking shape change).
- Deploy to Lambda.
- Notify ChatGPT custom GPT owner to re-import OpenAPI spec; notify Claude Desktop / Cursor / etc. users that tool calls now require `tournament_id`.

### Stage 3 — Web app
- Restructure routes per Section 3.
- Prop-drive `Layout.astro`.
- Update `fetchCardImages.ts` to span all tournaments.
- Push to `main` → GitHub Pages auto-deploys.

## Cleanup folded in

Since these files are being touched anyway:
- Resolve the "Lorwyn Eclipsed" vs "Aetherdrift" naming inconsistency in `mcp-server/README.md`. The registry's `name` field becomes canonical; tournament-specific copy in docs gets generalized.
- Move hardcoded `Pro Tour Lorwyn Eclipsed` strings in `web/src/layouts/Layout.astro` and other Astro pages to the registry / props.

## Risks

- **ChatGPT integration breaks on Stage 2 deploy** until the OpenAPI spec is re-imported. Stage MCP deploy when timing is acceptable.
- **React component assumption** — the design assumes `web/src/components/*.tsx` take data as props with no hardcoded references. Verify during implementation; fix any holdouts in Stage 3.
- **Card image cache size** — unioning across tournaments grows `card-images.json`. Acceptable now (two tournaments share most cards within a format); revisit if it becomes large.
