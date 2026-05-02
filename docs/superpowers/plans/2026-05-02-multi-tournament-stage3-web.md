# Multi-tournament Stage 3: Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the Astro site so each tournament has its own URL prefix (`/<slug>/...`), the root page becomes a tournaments index, and all hardcoded references to "Lorwyn Eclipsed" / 394299 are removed in favor of registry-driven props.

**Architecture:** A new `web/src/utils/tournaments.ts` reads `data/tournaments.json` and the per-tournament JSON files. Pages move from `src/pages/*.astro` to `src/pages/[slug]/*.astro` and use `getStaticPaths()` to emit one path per registered tournament, passing the tournament's data through props. `Layout.astro` accepts a `tournament` prop that drives the page title, header text, and nav `href`s. A new `src/pages/index.astro` replaces the old per-tournament home and lists registered tournaments.

**Tech Stack:** Astro 5, React 19, TypeScript 5, no new dependencies.

**Spec reference:** `docs/superpowers/specs/2026-05-02-multi-tournament-design.md` (section "Web app routing").

**Prerequisite:** Stage 1 (`2026-05-02-multi-tournament-stage1-scraper.md`) must be complete. `data/tournaments.json` must exist with both tournament entries, and `data/tournament-415628-*.json` must exist on disk. Stage 2 is *not* required — the web app reads JSON files directly at build time and does not depend on the MCP server.

**Work directory:** All commands run from `/Users/sp3c1/Repositories/protour-data-viz/web/` unless otherwise specified.

---

### Task 1: Create the tournaments data utility

**Files:**
- Create: `web/src/utils/tournaments.ts`

- [ ] **Step 1: Write the utility**

```typescript
/**
 * Tournament registry + per-tournament data loaders for build-time use.
 * Loads from ../../data/* relative to this file (i.e. the repo's data/ dir).
 */

import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = resolve(__dirname, '../../../data');

export interface Tournament {
  id: string;
  slug: string;
  name: string;
  format: string;
  date: string;
  rounds: string[];
  completed: boolean;
}

export interface TournamentData {
  tournament: Tournament;
  matches: any;       // MatchesByRound — kept loose since web doesn't import shared types
  decklists: any[];
  playerDecks: Record<string, string>;
  stats: any;
}

let registryCache: Tournament[] | null = null;

export function loadTournamentsRegistry(): Tournament[] {
  if (registryCache) return registryCache;
  const raw = readFileSync(resolve(DATA_DIR, 'tournaments.json'), 'utf-8');
  registryCache = JSON.parse(raw) as Tournament[];
  // Sort newest-first by date for consistent display order
  registryCache.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return registryCache;
}

export function findTournamentBySlug(slug: string): Tournament | null {
  return loadTournamentsRegistry().find((t) => t.slug === slug) ?? null;
}

/** Build-time check: do the four data files exist for this tournament? */
export function hasData(tournamentId: string): boolean {
  try {
    readFileSync(resolve(DATA_DIR, `tournament-${tournamentId}-stats.json`));
    return true;
  } catch {
    return false;
  }
}

/** Load a tournament's full dataset for getStaticPaths/page props. */
export function loadTournamentData(tournament: Tournament): TournamentData {
  const file = (kind: string) =>
    JSON.parse(
      readFileSync(resolve(DATA_DIR, `tournament-${tournament.id}-${kind}.json`), 'utf-8')
    );
  return {
    tournament,
    matches: file('matches'),
    decklists: file('decklists'),
    playerDecks: file('player-decks'),
    stats: file('stats'),
  };
}

/** Convenience helper for getStaticPaths: returns one entry per slug, with full data preloaded. */
export function tournamentStaticPaths(): { params: { slug: string }; props: { data: TournamentData } }[] {
  return loadTournamentsRegistry()
    .filter((t) => hasData(t.id))
    .map((t) => ({
      params: { slug: t.slug },
      props: { data: loadTournamentData(t) },
    }));
}
```

- [ ] **Step 2: Type-check (Astro uses TypeScript at build time)**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: No errors specifically in `tournaments.ts`. (The `web/tsconfig.json` is minimal — if `noEmit` isn't supported, `npx astro check` is the alternative.)

- [ ] **Step 3: Commit**

```bash
git add src/utils/tournaments.ts
git commit -m "feat(web): add tournament registry and data loader util"
```

---

### Task 2: Refactor `Layout.astro` to be prop-driven

**Files:**
- Modify: `web/src/layouts/Layout.astro`

- [ ] **Step 1: Replace the frontmatter and header**

Replace the top of `web/src/layouts/Layout.astro` (lines 1-65) with:

```astro
---
interface Props {
  title: string;
  description?: string;
  // Tournament context — when present, header and nav are scoped to this tournament.
  // Omit on the root tournaments index.
  tournament?: {
    slug: string;
    name: string;
  };
}

const { title, description, tournament } = Astro.props;

const siteUrl = "https://pro-tour-lorwyn-eclipsed.alles-standard.social";
const ogImage = `${siteUrl}/og-image.png`;
const ogImageAlt = title;

const headerTitle = tournament?.name ?? "Pro Tour Tournament Data";
const navBase = tournament ? `/${tournament.slug}` : null;
const fallbackDescription = tournament
  ? `${tournament.name} statistics and decklists. Win rates, matchup matrices, and complete deck lists.`
  : "Pro Tour tournament data — multiple tournaments, decklists, and statistics.";
const finalDescription = description ?? fallbackDescription;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <meta name="description" content={finalDescription} />

    <link rel="icon" type="image/png" href="/favicon.png" />

    <meta property="og:type" content="website" />
    <meta property="og:url" content={siteUrl} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={finalDescription} />
    <meta property="og:image" content={ogImage} />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content={ogImageAlt} />
    <meta property="og:site_name" content="Alles Standard" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content={siteUrl} />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={finalDescription} />
    <meta name="twitter:image" content={ogImage} />
    <meta name="twitter:image:alt" content={ogImageAlt} />

    <title>{title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700;800&display=swap" rel="stylesheet">
  </head>
  <body>
    <header>
      <div class="container">
        <h1><a href="/">{headerTitle}</a></h1>
        {navBase && (
          <nav>
            <a href={navBase}>Home</a>
            <a href={`${navBase}/statistics`}>Statistics</a>
            <a href={`${navBase}/archetypes`}>Archetypes</a>
            <a href={`${navBase}/decklists`}>Decklists</a>
          </nav>
        )}
        {!navBase && (
          <nav>
            <a href="/">Tournaments</a>
          </nav>
        )}
      </div>
    </header>
    <main class="container">
      <slot />
    </main>
  </body>
</html>
```

The styles section (lines 66-end) remains unchanged.

- [ ] **Step 2: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "refactor(web): make Layout prop-driven for multi-tournament header/nav"
```

---

### Task 3: Move per-tournament pages under `[slug]/`

**Files:**
- Create: `web/src/pages/[slug]/index.astro`
- Create: `web/src/pages/[slug]/statistics.astro`
- Create: `web/src/pages/[slug]/decklists.astro`
- Create: `web/src/pages/[slug]/archetypes.astro`
- Delete: `web/src/pages/statistics.astro`
- Delete: `web/src/pages/decklists.astro`
- Delete: `web/src/pages/archetypes.astro`
- Replace: `web/src/pages/index.astro` (becomes tournaments index — Task 4)

For each new page, use `getStaticPaths()` from the shared utility. The bodies are adapted from the existing flat pages.

- [ ] **Step 1: Create `[slug]/index.astro` (tournament home — what the old `index.astro` was)**

```astro
---
import Layout from '../../layouts/Layout.astro';
import { calculatePlayerResults } from '../../utils/calculatePlayerResults';
import { tournamentStaticPaths } from '../../utils/tournaments';
import type { TournamentData } from '../../utils/tournaments';

export const getStaticPaths = () => tournamentStaticPaths();

interface Props { data: TournamentData }
const { data } = Astro.props as Props;
const { tournament, matches, decklists, stats } = data;

const playerResults = calculatePlayerResults(matches);
const playersWithoutResults = decklists.filter((deck: any) => !playerResults.has(deck.playerName));
const playersWithoutResultsCount = playersWithoutResults.length;

const totalMatches = Object.values(matches).flat().length;

const allCards = new Set<string>();
decklists.forEach((deck: any) => {
  deck.mainDeck.forEach((card: any) => allCards.add(card.name));
  deck.sideboard.forEach((card: any) => allCards.add(card.name));
});
const uniqueCardsCount = allCards.size;

const archetypeCount = Object.keys(stats.archetypes).length;
---

<Layout
  title={`${tournament.name} - Tournament Data`}
  description={`Complete tournament statistics from ${tournament.name}: ${decklists.length} players, ${archetypeCount} archetypes, ${totalMatches} matches.`}
  tournament={{ slug: tournament.slug, name: tournament.name }}
>
  <div class="hero">
    <h2>{tournament.name}</h2>
    <p class="subtitle">{tournament.format} Format - {tournament.completed ? 'Final' : 'In Progress'}</p>
  </div>

  <section class="stats-overview">
    <div class="stat-card">
      <h3>{decklists.length}</h3>
      <p>Players</p>
    </div>
    <div class="stat-card">
      <h3>{archetypeCount}</h3>
      <p>Archetypes</p>
    </div>
    <div class="stat-card">
      <h3>{totalMatches}</h3>
      <p>Matches</p>
    </div>
    <div class="stat-card">
      <h3>{uniqueCardsCount}</h3>
      <p>Unique Cards</p>
    </div>
  </section>

  {playersWithoutResultsCount > 0 && (
    <p class="data-note">{playersWithoutResultsCount} players have no recorded match results.</p>
  )}
</Layout>

<style>
  /* Adapted from the existing index.astro home-page styles. Verify by reading the
     pre-existing src/pages/index.astro and copying its <style> block here. */
</style>
```

The `<style>` block: read the original `web/src/pages/index.astro` (the about-to-be-deleted file) and copy its `<style>` block verbatim into the new `[slug]/index.astro`.

- [ ] **Step 2: Create `[slug]/statistics.astro`**

```astro
---
import Layout from '../../layouts/Layout.astro';
import WinRateChart from '../../components/WinRateChart';
import MatchupTable from '../../components/MatchupTable';
import { tournamentStaticPaths } from '../../utils/tournaments';
import type { TournamentData } from '../../utils/tournaments';

export const getStaticPaths = () => tournamentStaticPaths();

interface Props { data: TournamentData }
const { data } = Astro.props as Props;
const { tournament, stats: statsData } = data;
const stats = statsData.archetypes;
---

<Layout
  title={`${tournament.name} - Statistics`}
  description={`Tournament statistics: win rates by archetype and head-to-head matchup data for ${tournament.name}.`}
  tournament={{ slug: tournament.slug, name: tournament.name }}
>
  <div class="stats-page">
    <h2>Tournament Statistics</h2>
    <p class="subtitle">{tournament.format} format — aggregated from {tournament.rounds.join(', ')}</p>

    <section class="chart-section">
      <WinRateChart client:only="react" stats={stats} minGames={5} />
    </section>

    <section class="table-section">
      <MatchupTable client:only="react" stats={stats} topN={40} />
    </section>

    <section class="data-notes">
      <h3>Data Notes</h3>
      <ul>
        <li>Win rates calculated from {Object.keys(stats).length} different archetypes</li>
        <li>Minimum 5 games required for win rate chart</li>
        <li>Matchup percentages based on head-to-head results</li>
        <li>Colors indicate matchup favorability (Green = 60%+, Red = 40%-)</li>
      </ul>
    </section>
  </div>
</Layout>
```

The `<style>` block: copy verbatim from the existing `web/src/pages/statistics.astro` (the file being replaced).

- [ ] **Step 3: Create `[slug]/decklists.astro`**

```astro
---
import Layout from '../../layouts/Layout.astro';
import DeckListViewer from '../../components/DeckListViewer';
import { calculatePlayerResults } from '../../utils/calculatePlayerResults';
import { tournamentStaticPaths } from '../../utils/tournaments';
import type { TournamentData } from '../../utils/tournaments';

export const getStaticPaths = () => tournamentStaticPaths();

interface Props { data: TournamentData }
const { data } = Astro.props as Props;
const { tournament, decklists, matches, stats: statsData } = data;

const playerResults = calculatePlayerResults(matches);
---

<Layout
  title={`Decklists - ${tournament.name}`}
  description={`Browse complete decklists from all ${decklists.length} players. Search by player name or filter by archetype.`}
  tournament={{ slug: tournament.slug, name: tournament.name }}
>
  <div class="decklists-page">
    <h2>Player Decklists</h2>
    <p class="subtitle">{decklists.length} complete decklists from the tournament</p>

    <section class="decklist-section">
      <DeckListViewer client:only="react" decklists={decklists} playerResults={playerResults} statsData={statsData} />
    </section>
  </div>
</Layout>
```

`<style>` block: copy verbatim from existing `web/src/pages/decklists.astro`.

- [ ] **Step 4: Create `[slug]/archetypes.astro`**

```astro
---
import Layout from '../../layouts/Layout.astro';
import ArchetypeBreakdown from '../../components/ArchetypeBreakdown';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { tournamentStaticPaths } from '../../utils/tournaments';
import type { TournamentData } from '../../utils/tournaments';

export const getStaticPaths = () => tournamentStaticPaths();

interface Props { data: TournamentData }
const { data } = Astro.props as Props;
const { tournament, decklists } = data;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Image cache is global across tournaments (single Scryfall lookup)
const imageCachePath = path.join(__dirname, '../../../public/card-images.json');
const imageCache = JSON.parse(readFileSync(imageCachePath, 'utf-8'));

const archetypes = Array.from(new Set(decklists.map((d: any) => d.archetype))).sort();
const defaultArchetype = archetypes[0];
---

<Layout
  title={`Archetype Breakdown - ${tournament.name}`}
  description="Detailed card-by-card breakdown for each archetype."
  tournament={{ slug: tournament.slug, name: tournament.name }}
>
  <div class="breakdown-page">
    <h2>Archetype Breakdown</h2>
    <p class="subtitle">Card-by-card analysis for each archetype</p>

    <div class="archetype-selector">
      <label for="archetype-select">Select Archetype:</label>
      <select id="archetype-select" class="archetype-dropdown">
        {archetypes.map((arch: string) => (
          <option value={arch}>{arch}</option>
        ))}
      </select>
    </div>

    <section class="breakdown-section">
      {archetypes.map((archetype: string) => (
        <div
          class="breakdown-container"
          data-archetype={archetype}
          style={archetype === defaultArchetype ? 'display: block;' : 'display: none;'}
        >
          <ArchetypeBreakdown
            client:only="react"
            decklists={decklists.filter((d: any) => d.archetype === archetype)}
            archetype={archetype}
            imageCache={imageCache}
          />
        </div>
      ))}
    </section>
  </div>
</Layout>
```

For the rest of the page body and `<style>` block plus any client-side `<script>`, copy the remainder of the existing `web/src/pages/archetypes.astro` (continuing past line 40 where the partial read ended). The only changes from the original are:
- The path adjustments (`'../layouts/...'` → `'../../layouts/...'`)
- Adding `getStaticPaths` and the `data` prop
- Switching the archetype source to `data.decklists`
- Image cache path: `'../../public/card-images.json'` → `'../../../public/card-images.json'` (one more level up because pages are nested deeper)
- Layout receives the `tournament` prop

- [ ] **Step 5: Verify the build still succeeds**

```bash
npm run build
```
Expected: Build succeeds; output includes `dist/<slug>/index.html`, `dist/<slug>/statistics/index.html`, etc., for each registered tournament. The build will FAIL the `index.astro` step until Task 4 — that's fine, run only `npx astro check` for now if you want a partial check.

- [ ] **Step 6: Delete the old flat pages and commit**

```bash
git rm src/pages/statistics.astro src/pages/decklists.astro src/pages/archetypes.astro
git add src/pages/[slug]/
git commit -m "refactor(web): move tournament pages under /[slug]/ dynamic routes"
```

(`src/pages/index.astro` is replaced in the next task — leave it for now; the old single-tournament version can coexist briefly until Task 4.)

---

### Task 4: Replace the root `index.astro` with a tournaments index

**Files:**
- Replace: `web/src/pages/index.astro`

- [ ] **Step 1: Write the new root index**

```astro
---
import Layout from '../layouts/Layout.astro';
import { loadTournamentsRegistry, hasData, loadTournamentData } from '../utils/tournaments';
import type { Tournament } from '../utils/tournaments';

interface CardData {
  tournament: Tournament;
  playerCount: number | null;
  archetypeCount: number | null;
  hasData: boolean;
}

const tournaments = loadTournamentsRegistry();
const cards: CardData[] = tournaments.map((t) => {
  if (!hasData(t.id)) {
    return { tournament: t, playerCount: null, archetypeCount: null, hasData: false };
  }
  const data = loadTournamentData(t);
  return {
    tournament: t,
    playerCount: data.decklists.length,
    archetypeCount: Object.keys(data.stats.archetypes).length,
    hasData: true,
  };
});
---

<Layout
  title="Pro Tour Tournament Data"
  description="Tournament statistics, decklists, and matchup data across multiple Pro Tours."
>
  <div class="tournaments-index">
    <h2>Pro Tour Tournament Data</h2>
    <p class="subtitle">{tournaments.length} tournament{tournaments.length === 1 ? '' : 's'} archived</p>

    <section class="cards-grid">
      {cards.map(({ tournament, playerCount, archetypeCount, hasData: ready }) => (
        <a class="tournament-card" href={ready ? `/${tournament.slug}` : '#'} aria-disabled={!ready}>
          <h3>{tournament.name}</h3>
          <p class="meta">{tournament.format} · {tournament.date}</p>
          {ready ? (
            <ul class="stats">
              <li><strong>{playerCount}</strong> players</li>
              <li><strong>{archetypeCount}</strong> archetypes</li>
            </ul>
          ) : (
            <p class="placeholder">Data not yet available</p>
          )}
          <span class={`badge ${tournament.completed ? 'badge-final' : 'badge-active'}`}>
            {tournament.completed ? 'Final' : 'In Progress'}
          </span>
        </a>
      ))}
    </section>
  </div>
</Layout>

<style>
  .tournaments-index {
    max-width: 1240px;
    margin: 0 auto;
  }
  h2 {
    font-size: 2.25rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }
  .subtitle {
    color: var(--text-secondary);
    margin-bottom: 3rem;
  }
  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
  }
  .tournament-card {
    background: var(--bg-secondary);
    border: 1px solid var(--grey-border);
    border-radius: 4px;
    padding: 1.5rem;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.2s;
    position: relative;
    display: block;
  }
  .tournament-card[aria-disabled="true"] {
    opacity: 0.55;
    pointer-events: none;
    cursor: default;
  }
  .tournament-card:hover {
    border-color: var(--primary-color);
  }
  .tournament-card h3 {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
  }
  .tournament-card .meta {
    color: var(--text-muted);
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }
  .tournament-card .stats {
    list-style: none;
    padding: 0;
    margin: 0 0 1rem 0;
    display: flex;
    gap: 1.5rem;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
  .tournament-card .stats strong {
    color: var(--primary-color);
    font-size: 1.25rem;
    display: inline-block;
    margin-right: 0.25rem;
  }
  .tournament-card .placeholder {
    color: var(--text-muted);
    font-style: italic;
    margin-bottom: 1rem;
  }
  .badge {
    position: absolute;
    top: 1.5rem;
    right: 1.5rem;
    padding: 0.25rem 0.5rem;
    border-radius: 2px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .badge-final {
    background: var(--bg-tertiary);
    color: var(--text-muted);
  }
  .badge-active {
    background: var(--primary-color);
    color: var(--text-primary);
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(web): add tournaments index at site root"
```

---

### Task 5: Update `fetchCardImages.ts` to span all tournaments

**Files:**
- Modify: `web/scripts/fetchCardImages.ts`

- [ ] **Step 1: Replace the `main()` function and the surrounding decklist-loading section**

In `web/scripts/fetchCardImages.ts`, replace the body of `main()` (lines 119-171 in the current file) with:

```typescript
async function main() {
  // Load tournament registry
  const registryPath = path.join(__dirname, '../../data/tournaments.json');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8')) as Array<{ id: string }>;

  // Collect cards across all tournaments that have decklist files
  const cardNames = new Set<string>();
  for (const t of registry) {
    const decklistsPath = path.join(__dirname, `../../data/tournament-${t.id}-decklists.json`);
    let decklists: any[];
    try {
      decklists = JSON.parse(fs.readFileSync(decklistsPath, 'utf-8'));
    } catch {
      console.warn(`Skipping tournament ${t.id} — no decklists file`);
      continue;
    }
    decklists.forEach((deck: any) => {
      deck.mainDeck.forEach((card: any) => cardNames.add(card.name));
      deck.sideboard.forEach((card: any) => cardNames.add(card.name));
    });
  }

  const sortedCards = Array.from(cardNames).sort();
  console.log(`Found ${sortedCards.length} unique cards across ${registry.length} tournaments`);

  const batches = chunk(sortedCards, 75);
  console.log(`Split into ${batches.length} batches\n`);

  const cache: CardImageCache = {};
  let processedCount = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const results = await fetchCardBatch(batch);

    results.forEach((imageUrl, cardName) => {
      cache[cardName] = imageUrl;
    });

    processedCount += batch.length;
    console.log(`Progress: ${processedCount}/${sortedCards.length} (batch ${i + 1}/${batches.length})\n`);

    if (i < batches.length - 1) {
      await sleep(100);
    }
  }

  const cachePath = path.join(__dirname, '../public/card-images.json');
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));

  const successCount = Object.values(cache).filter((url) => url !== null).length;
  const failCount = Object.values(cache).filter((url) => url === null).length;

  console.log(`✓ Successfully cached ${successCount} card images`);
  if (failCount > 0) {
    console.log(`⚠ Failed to fetch ${failCount} cards`);
  }
  console.log(`  Cache file: ${cachePath}`);
}

main().catch(console.error);
```

The changes from the original:
- Reads the registry instead of a single hardcoded decklist file path
- Iterates all tournaments and unions their cards before deduplicating
- Skips tournaments that don't have a decklists file yet (in-progress tournaments)

The Scryfall fetching logic (`fetchCardBatch`, `chunk`, `sleep`, type definitions) is unchanged.

- [ ] **Step 2: Run the prebuild step to verify**

```bash
npm run fetch-images
```
Expected: Completes without error, writes a fresh `public/card-images.json` containing cards from both tournaments. Console reports the union count (~ sum of both tournaments' unique cards minus shared cards).

- [ ] **Step 3: Commit**

```bash
git add scripts/fetchCardImages.ts
git commit -m "refactor(web): fetch card images across all registered tournaments"
```

---

### Task 6: Run the full build and smoke-test in a browser

- [ ] **Step 1: Build the site**

```bash
npm run build
```
Expected: Build succeeds. Output should include:
- `dist/index.html` — root tournaments index
- `dist/lorwyn-eclipsed/index.html` and subroutes
- `dist/<new-tournament-slug>/index.html` and subroutes

- [ ] **Step 2: Preview locally**

```bash
npm run preview
```

- [ ] **Step 3: Manually verify in a browser at http://localhost:4321**

- [ ] Root page lists both tournaments with their stats, badges, and links
- [ ] Click into Lorwyn Eclipsed → tournament home page shows its overview
- [ ] Navigate to Statistics, Archetypes, Decklists; each renders
- [ ] Header text matches the active tournament; nav links are scoped to its slug
- [ ] Click the header title (the `<h1><a href="/">`) — returns to root
- [ ] Repeat for the new tournament's slug
- [ ] Check browser console for errors — should be clean

- [ ] **Step 4: Address any issues**

If a React component breaks because it received unexpected data shape, the issue is almost certainly a JSON shape difference between tournaments — track it down and fix at the component boundary, not by mutating data files.

If a page silently 404s when expected to render, the slug almost certainly doesn't match the registry — check `data/tournaments.json` for the correct slug spelling.

- [ ] **Step 5: Commit any fixes**

If you needed component fixes:

```bash
git add src/components/<file>.tsx
git commit -m "fix(web): handle <specific-shape-issue> in <component>"
```

---

### Task 7: Update CLAUDE.md to reflect new web routing

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Find the "Web rendering" architectural note and the Web command block; update both**

Replace the `### Web (Astro)` command block:

```bash
cd web
npm install
npm run dev      # dev server (http://localhost:4321)
npm run build    # runs prebuild (fetchCardImages.ts across all tournaments) → astro build
npm run preview
```

Replace the "Web rendering" paragraph in the "Architectural notes" section:

> **Web rendering.** All pages are static (`output: 'static'`). The root `/` is a tournaments index that lists registered tournaments from `data/tournaments.json`. Per-tournament pages live under `/<slug>/` and use Astro's `getStaticPaths()` to enumerate slugs from the registry; data files are loaded at build time via `src/utils/tournaments.ts`. React components (`.tsx`) handle interactivity. The site URL in `astro.config.mjs` is the GitHub Pages custom domain — changing it affects generated absolute URLs.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for multi-tournament web routing"
```

---

### Task 8: Stage 3 wrap-up

- [ ] **Step 1: Verify clean working tree**

Run: `git status`
Expected: Working tree clean.

- [ ] **Step 2: Final build verification**

```bash
cd web && npm run build
```
Expected: Build succeeds with no warnings about missing data files or unresolved imports.

- [ ] **Step 3: Push & deploy**

```bash
git push origin <current-branch>
```

If on the main branch, GitHub Pages auto-deploys via `.github/workflows/deploy.yml` (Node 22). If on a feature branch, open a PR and merge when ready — the workflow runs on push to `main`.

- [ ] **Step 4: Live verification**

Once the GitHub Pages deploy completes, browse to the live site:
- Root tournaments index loads
- Both tournaments' subroutes work
- Headers, navigation, and links are correct
- No console errors on a fresh page load

- [ ] **Step 5: Summary**

Stage 3 is complete. The full multi-tournament feature is now live across all three subsystems:

- Stage 1: registry + scraper supports both tournaments, data files exist for 415628
- Stage 2: MCP server / REST API takes `tournament_id` on every endpoint, `list_tournaments` discovers what's available
- Stage 3: Web app has a tournaments index at `/` and per-tournament URLs under `/<slug>/`

Optional follow-ups (not part of this plan; offer the user a `/schedule` if relevant):
- Cross-tournament comparison features
- Per-block (Day 1 / Day 2) UI breakdowns
- Auto-detection of tournament completion from melee.gg
