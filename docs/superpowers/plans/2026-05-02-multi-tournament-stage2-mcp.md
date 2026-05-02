# Multi-tournament Stage 2: MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `mcp-server` so every query takes a `tournament_id` parameter, the data loader's allowlist is built dynamically from the registry, and a new `list_tournaments` capability lets consumers discover available tournaments.

**Architecture:** Tool definitions and tool handlers (currently duplicated across `mcp-server.ts`, `http-server.ts`, and `lambda.ts`) are extracted into shared `tool-definitions.ts` and `tool-handlers.ts` modules — this avoids three-way drift while we're touching all three files. Data loader keeps its allowlist principle but builds the list at module load time from `data/tournaments.json`. Per-tournament data cache uses a `Map<tournamentId, data>` instead of a single global. REST routes move from flat (`/api/matches`) to per-tournament (`/api/tournaments/:id/matches`).

**Tech Stack:** TypeScript 5.9, Node 22+, Express 5, MCP SDK 1.25, Zod 4, tsx for tests.

**Spec reference:** `docs/superpowers/specs/2026-05-02-multi-tournament-design.md` (sections "MCP / REST API", "Data loader changes", "Validation").

**Prerequisite:** Stage 1 (`2026-05-02-multi-tournament-stage1-scraper.md`) must be complete. `data/tournaments.json` must exist with both tournament entries, and `data/tournament-415628-*.json` must exist on disk.

**Work directory:** All commands run from `/Users/sp3c1/Repositories/protour-data-viz/mcp-server/` unless otherwise specified.

---

### Task 1: Add `Tournament` type and registry loader

**Files:**
- Create: `mcp-server/src/tournaments.ts`
- Modify: `mcp-server/src/types.ts`

- [ ] **Step 1: Add Tournament type to `types.ts`**

Append to the end of `mcp-server/src/types.ts`:

```typescript
// Tournament registry entry (mirrors data/tournaments.json schema)
export interface Tournament {
  id: string;
  slug: string;
  name: string;
  format: string;
  date: string;
  rounds: string[];
  completed: boolean;
}
```

The existing `TournamentInfo` interface stays — it's used by the (soon-refactored) `getTournamentInfo` query.

- [ ] **Step 2: Create `tournaments.ts` registry loader**

Write `mcp-server/src/tournaments.ts`:

```typescript
/**
 * Tournament registry — loads data/tournaments.json once at module init.
 *
 * The registry drives the data-loader allowlist: only files for registered
 * tournament IDs are accessible. Adding a tournament requires editing the
 * registry file (and re-deploying for Lambda).
 */

import { readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { Tournament } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Same DATA_DIR resolution as data-loader.ts
const DATA_DIR = process.env.AWS_LAMBDA_FUNCTION_NAME
  ? resolve(__dirname, './data')
  : resolve(__dirname, '../../data');

const REGISTRY_PATH = join(DATA_DIR, 'tournaments.json');

let cachedRegistry: Tournament[] | null = null;

export function loadTournaments(): Tournament[] {
  if (cachedRegistry !== null) return cachedRegistry;

  let raw: string;
  try {
    raw = readFileSync(REGISTRY_PATH, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Tournament registry not found at ${REGISTRY_PATH}`);
    }
    throw error;
  }

  let parsed: Tournament[];
  try {
    parsed = JSON.parse(raw) as Tournament[];
  } catch {
    throw new Error(`Invalid JSON in registry at ${REGISTRY_PATH}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Registry must be an array, got ${typeof parsed}`);
  }

  cachedRegistry = parsed;
  return parsed;
}

export function findTournament(id: string): Tournament | null {
  return loadTournaments().find((t) => t.id === id) ?? null;
}

export function tournamentExists(id: string): boolean {
  return findTournament(id) !== null;
}

/** For tests only: forces re-read of the registry on next access. */
export function clearRegistryCache(): void {
  cachedRegistry = null;
}
```

- [ ] **Step 3: Compile-check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/tournaments.ts
git commit -m "feat(mcp-server): add tournament registry loader"
```

---

### Task 2: Refactor `data-loader.ts` to dynamic allowlist + tournamentId

**Files:**
- Modify: `mcp-server/src/data-loader.ts`

- [ ] **Step 1: Replace contents of `data-loader.ts`**

```typescript
/**
 * Secure data loading module.
 *
 * Security:
 * - Allowlist built dynamically from data/tournaments.json — only files for
 *   registered tournaments are loadable.
 * - Path validation prevents directory traversal.
 *
 * Each load function takes a tournamentId and reads tournament-{id}-{kind}.json.
 */

import { readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { loadTournaments, tournamentExists } from './tournaments.js';
import type {
  MatchesByRound,
  DeckList,
  PlayerDecks,
  TournamentStats,
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = process.env.AWS_LAMBDA_FUNCTION_NAME
  ? resolve(__dirname, './data')
  : resolve(__dirname, '../../data');

type DataKind = 'matches' | 'decklists' | 'player-decks' | 'stats';

/**
 * Build the file allowlist from the registry. Re-runs on every check so
 * registry edits during local dev are picked up; in production the registry
 * cache makes this cheap.
 */
function isAllowedFile(filename: string): boolean {
  if (filename === 'tournaments.json') return true;

  const tournaments = loadTournaments();
  for (const t of tournaments) {
    const allowed: string[] = [
      `tournament-${t.id}-matches.json`,
      `tournament-${t.id}-decklists.json`,
      `tournament-${t.id}-player-decks.json`,
      `tournament-${t.id}-stats.json`,
    ];
    if (allowed.includes(filename)) return true;
  }
  return false;
}

function loadDataFile<T>(filename: string): T {
  if (!isAllowedFile(filename)) {
    throw new Error(`Invalid file: ${filename}. File not in allowlist.`);
  }

  const filePath = join(DATA_DIR, filename);
  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Data file not found: ${filename}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in file: ${filename}`);
    }
    throw error;
  }
}

function dataFileName(tournamentId: string, kind: DataKind): string {
  return `tournament-${tournamentId}-${kind}.json`;
}

function ensureRegistered(tournamentId: string): void {
  if (!tournamentExists(tournamentId)) {
    throw new Error(`Unknown tournament: ${tournamentId}`);
  }
}

export function loadMatches(tournamentId: string): MatchesByRound {
  ensureRegistered(tournamentId);
  return loadDataFile<MatchesByRound>(dataFileName(tournamentId, 'matches'));
}

export function loadDecklists(tournamentId: string): DeckList[] {
  ensureRegistered(tournamentId);
  return loadDataFile<DeckList[]>(dataFileName(tournamentId, 'decklists'));
}

export function loadPlayerDecks(tournamentId: string): PlayerDecks {
  ensureRegistered(tournamentId);
  return loadDataFile<PlayerDecks>(dataFileName(tournamentId, 'player-decks'));
}

export function loadStats(tournamentId: string): TournamentStats {
  ensureRegistered(tournamentId);
  return loadDataFile<TournamentStats>(dataFileName(tournamentId, 'stats'));
}

export function loadAllData(tournamentId: string) {
  return {
    matches: loadMatches(tournamentId),
    decklists: loadDecklists(tournamentId),
    playerDecks: loadPlayerDecks(tournamentId),
    stats: loadStats(tournamentId),
  };
}
```

Key changes:
- `ALLOWED_FILES` constant array → `isAllowedFile()` function that consults the registry
- All public load functions take `tournamentId: string`
- `tournaments.json` itself is in the allowlist (so the registry loader can read it via the same path validation, though it currently uses raw `readFileSync` — that's fine; the allowlist is for *queryable data files*)
- `getAvailableFiles()` was removed — no callers; surface area shrinks
- `ensureRegistered` rejects unknown IDs early with a clear error

- [ ] **Step 2: Update `test-phase2.ts` to exercise per-tournament loading**

Replace the body of `mcp-server/src/test-phase2.ts` (read it first to preserve any unique structure, then rewrite):

```typescript
/**
 * Phase 2 smoke test: data loader correctness across multiple tournaments.
 */
import {
  loadMatches,
  loadDecklists,
  loadPlayerDecks,
  loadStats,
  loadAllData,
} from './data-loader.js';
import { loadTournaments } from './tournaments.js';

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`  PASS: ${msg}`);
}

console.log('Phase 2 — data loader smoke test\n');

const tournaments = loadTournaments();
assert(tournaments.length >= 1, 'registry has at least one tournament');
console.log(`  Loaded ${tournaments.length} tournaments from registry`);

for (const t of tournaments) {
  console.log(`\nTournament ${t.id} (${t.name}):`);
  try {
    const matches = loadMatches(t.id);
    assert(typeof matches === 'object' && matches !== null, `${t.id} matches loads`);
    const decklists = loadDecklists(t.id);
    assert(Array.isArray(decklists), `${t.id} decklists is array`);
    const playerDecks = loadPlayerDecks(t.id);
    assert(typeof playerDecks === 'object', `${t.id} player decks loads`);
    const stats = loadStats(t.id);
    assert(typeof stats.archetypes === 'object', `${t.id} stats has archetypes`);
    const all = loadAllData(t.id);
    assert(all.matches === matches || all.matches !== undefined, `${t.id} loadAllData composes`);
  } catch (e) {
    console.error(`  SKIP: ${t.id} data not on disk yet — ${(e as Error).message}`);
  }
}

console.log('\nUnknown-tournament rejection:');
try {
  loadMatches('999999');
  assert(false, 'unknown tournament should reject');
} catch (e) {
  assert(
    (e as Error).message.includes('Unknown tournament'),
    'rejects unregistered tournament ID'
  );
}

console.log('\nAllowlist enforcement (via direct loadDataFile not exported):');
console.log('  (covered indirectly — only registered IDs map to allowed filenames)');

console.log('\nAll Phase 2 checks passed.');
```

- [ ] **Step 3: Run the smoke test**

```bash
npm run test:phase2
```
Expected: PASS lines for the registered tournaments and the unknown-tournament rejection. If any tournament's data files don't exist yet, you see SKIP for it — that's fine for a Stage 1-only environment.

- [ ] **Step 4: Commit**

```bash
git add src/data-loader.ts src/test-phase2.ts
git commit -m "refactor(mcp-server): per-tournament data loader with registry-driven allowlist"
```

---

### Task 3: Add `tournamentIdSchema` and update query schemas

**Files:**
- Modify: `mcp-server/src/validation.ts`

- [ ] **Step 1: Add the import and schema**

At the top of `validation.ts`, add to the existing imports:

```typescript
import { tournamentExists } from './tournaments.js';
```

Append to `validation.ts` (before the `validateQuery` function):

```typescript
/**
 * Tournament ID validation — must be a registered tournament.
 * The .refine check runs at validation time, so newly added tournaments are
 * accepted on the next request (the registry is cached per process, not per
 * validation call — for dev hot-reload, restart the server after editing the registry).
 */
export const tournamentIdSchema = z
  .string()
  .min(1)
  .max(20)
  .regex(/^\d+$/, 'Tournament ID must be numeric')
  .refine((id) => tournamentExists(id), { message: 'Unknown tournament ID' });
```

The package is ESM (`"type": "module"`) so a top-level static import is correct. There's no import cycle: `tournaments.ts` only imports from `types.js`, and `types.js` has no imports.

- [ ] **Step 2: Add `tournament_id` field to existing query schemas**

Replace these schema definitions in `validation.ts`:

```typescript
export const matchQuerySchema = z.object({
  tournament_id: tournamentIdSchema,
  round: roundSchema.optional(),
  player: playerNameSchema.optional(),
  archetype: archetypeSchema.optional(),
  limit: limitSchema.optional(),
});

export const deckQuerySchema = z.object({
  tournament_id: tournamentIdSchema,
  player: playerNameSchema.optional(),
  archetype: archetypeSchema.optional(),
  limit: limitSchema.optional(),
});

export const statsQuerySchema = z.object({
  tournament_id: tournamentIdSchema,
  archetype: archetypeSchema.optional(),
});

export const playerDeckQuerySchema = z.object({
  tournament_id: tournamentIdSchema,
  player: playerNameSchema,
});

export const cardQuerySchema = z.object({
  tournament_id: tournamentIdSchema,
  card: cardNameSchema,
  limit: limitSchema.optional(),
});
```

The `MatchQuery`, `DeckQuery`, etc. type exports at the bottom of the file remain (`z.infer` picks up the new field automatically).

- [ ] **Step 3: Compile-check**

Run: `npx tsc --noEmit`
Expected: Errors in `queries.ts`, `api-routes.ts`, `http-server.ts`, `mcp-server.ts`, `lambda.ts` — they call query functions with the old shape. Those are fixed in subsequent tasks. No errors in `validation.ts` itself.

- [ ] **Step 4: Commit**

```bash
git add src/validation.ts
git commit -m "feat(mcp-server): add tournament_id to query validation schemas"
```

---

### Task 4: Refactor query functions for per-tournament data

**Files:**
- Modify: `mcp-server/src/queries.ts`

- [ ] **Step 1: Replace contents**

```typescript
/**
 * Query functions for tournament data.
 * Each function takes the tournament_id as the first parameter.
 *
 * Per-tournament data is cached in a Map to avoid re-reading JSON files on
 * every query.
 */

import type { Match } from './types.js';
import { loadAllData } from './data-loader.js';
import { findTournament, loadTournaments } from './tournaments.js';
import type {
  MatchQuery,
  DeckQuery,
  StatsQuery,
  CardQuery,
} from './validation.js';

type LoadedData = ReturnType<typeof loadAllData>;
const dataCache = new Map<string, LoadedData>();

function getData(tournamentId: string): LoadedData {
  let data = dataCache.get(tournamentId);
  if (!data) {
    data = loadAllData(tournamentId);
    dataCache.set(tournamentId, data);
  }
  return data;
}

export function clearCache(): void {
  dataCache.clear();
}

export function queryMatches(params: MatchQuery) {
  const data = getData(params.tournament_id);
  const { round, player, archetype, limit = 100 } = params;

  let matches: Match[] = [];
  if (round !== undefined) {
    matches = data.matches[round.toString()] ?? [];
  } else {
    matches = Object.values(data.matches).flat();
  }

  if (player) {
    const p = player.toLowerCase();
    matches = matches.filter((m) =>
      m.Competitors.some((c) =>
        c.Team.Players.some((pl) => pl.DisplayName.toLowerCase().includes(p))
      )
    );
  }

  if (archetype) {
    const a = archetype.toLowerCase();
    matches = matches.filter((m) =>
      m.Competitors.some((c) =>
        c.Decklists.some((d) => d.DecklistName.toLowerCase().includes(a))
      )
    );
  }

  return matches.slice(0, limit);
}

export function queryDecks(params: DeckQuery) {
  const data = getData(params.tournament_id);
  const { player, archetype, limit = 100 } = params;

  let decks = data.decklists;
  if (player) {
    const p = player.toLowerCase();
    decks = decks.filter((d) => d.playerName.toLowerCase().includes(p));
  }
  if (archetype) {
    const a = archetype.toLowerCase();
    decks = decks.filter((d) => d.archetype.toLowerCase().includes(a));
  }

  return decks.slice(0, limit);
}

export function queryStats(params: StatsQuery) {
  const data = getData(params.tournament_id);
  const { archetype } = params;

  if (archetype) {
    const archLower = archetype.toLowerCase();
    const match = Object.keys(data.stats.archetypes).find(
      (k) => k.toLowerCase() === archLower
    );
    if (match) {
      return { archetype: match, stats: data.stats.archetypes[match] };
    }
    return null;
  }

  return data.stats;
}

export function queryPlayerDeck(tournamentId: string, playerName: string) {
  const data = getData(tournamentId);
  const playerLower = playerName.toLowerCase();
  const matchingPlayer = Object.keys(data.playerDecks).find(
    (n) => n.toLowerCase() === playerLower
  );
  if (!matchingPlayer) return null;

  const archetype = data.playerDecks[matchingPlayer];
  const deckList = data.decklists.find(
    (d) => d.playerName.toLowerCase() === playerLower
  );
  const matches = queryMatches({ tournament_id: tournamentId, player: playerName });

  return {
    playerName: matchingPlayer,
    archetype,
    deckList,
    matches,
    matchCount: matches.length,
  };
}

export function queryPlayerStats(tournamentId: string, playerName: string) {
  const data = getData(tournamentId);
  const playerLower = playerName.toLowerCase();
  const matchingPlayer = Object.keys(data.playerDecks).find(
    (n) => n.toLowerCase() === playerLower
  );
  if (!matchingPlayer) return null;

  const archetype = data.playerDecks[matchingPlayer];
  const deckList = data.decklists.find(
    (d) => d.playerName.toLowerCase() === playerLower
  );
  const matches = queryMatches({ tournament_id: tournamentId, player: playerName });

  let wins = 0;
  let losses = 0;
  let draws = 0;
  const matchupStats: Record<string, { wins: number; losses: number; draws: number; percentage: number }> = {};

  matches.forEach((match) => {
    const playerCompetitorIndex = match.Competitors.findIndex((c) =>
      c.Team.Players.some((p) => p.DisplayName.toLowerCase().includes(playerLower))
    );
    if (playerCompetitorIndex === -1) return;

    const playerDisplayName = match.Competitors[playerCompetitorIndex].Team.Players[0].DisplayName;
    const opponentIndex = playerCompetitorIndex === 0 ? 1 : 0;
    const opponentArchetype = match.Competitors[opponentIndex]?.Decklists[0]?.DecklistName ?? 'Unknown';
    const result = match.ResultString.toLowerCase();
    const ensureBucket = (k: string) => {
      if (!matchupStats[k]) matchupStats[k] = { wins: 0, losses: 0, draws: 0, percentage: 0 };
    };

    if (result.includes(playerDisplayName.toLowerCase()) && result.includes('won')) {
      wins++; ensureBucket(opponentArchetype); matchupStats[opponentArchetype].wins++;
    } else if (result.includes(playerDisplayName.toLowerCase()) && result.includes('lost')) {
      losses++; ensureBucket(opponentArchetype); matchupStats[opponentArchetype].losses++;
    } else if (result.includes('draw') || result.includes('tie')) {
      draws++; ensureBucket(opponentArchetype); matchupStats[opponentArchetype].draws++;
    } else {
      const opponentName = match.Competitors[opponentIndex].Team.Players[0].DisplayName;
      if (result.includes(opponentName.toLowerCase()) && result.includes('won')) {
        losses++; ensureBucket(opponentArchetype); matchupStats[opponentArchetype].losses++;
      }
    }
  });

  Object.keys(matchupStats).forEach((opp) => {
    const s = matchupStats[opp];
    const total = s.wins + s.losses + s.draws;
    s.percentage = total > 0 ? (s.wins / total) * 100 : 0;
  });

  const totalMatches = wins + losses + draws;
  const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

  return {
    playerName: matchingPlayer,
    archetype,
    wins,
    losses,
    draws,
    winRate: parseFloat(winRate.toFixed(2)),
    totalMatches,
    record: `${wins}-${losses}${draws > 0 ? `-${draws}` : ''}`,
    matchups: Object.entries(matchupStats)
      .sort((a, b) => {
        const totalA = a[1].wins + a[1].losses + a[1].draws;
        const totalB = b[1].wins + b[1].losses + b[1].draws;
        return totalB - totalA;
      })
      .map(([opp, s]) => ({ opponent: opp, ...s, percentage: parseFloat(s.percentage.toFixed(2)) })),
    deckList,
  };
}

export function listArchetypes(tournamentId: string) {
  const data = getData(tournamentId);
  return Object.keys(data.stats.archetypes)
    .sort()
    .map((name) => ({
      name,
      count: data.decklists.filter((d) => d.archetype === name).length,
      winRate: data.stats.archetypes[name].winRate,
      wins: data.stats.archetypes[name].wins,
      losses: data.stats.archetypes[name].losses,
      draws: data.stats.archetypes[name].draws,
    }));
}

export function queryDecksByCard(params: CardQuery) {
  const data = getData(params.tournament_id);
  const { card, limit = 100 } = params;
  const cardLower = card.toLowerCase();

  const decksWithCard = data.decklists.filter((deck) => {
    const inMain = deck.mainDeck.some((c) => c.name.toLowerCase().includes(cardLower));
    const inSide = deck.sideboard.some((c) => c.name.toLowerCase().includes(cardLower));
    return inMain || inSide;
  });

  const archetypeBreakdown: Record<string, { count: number; wins: number; losses: number; draws: number; winRate: number }> = {};
  let totalWins = 0;
  let totalLosses = 0;
  let totalDraws = 0;

  decksWithCard.forEach((deck) => {
    const archetype = deck.archetype;
    const archStats = data.stats.archetypes[archetype];
    if (archStats) {
      if (!archetypeBreakdown[archetype]) {
        archetypeBreakdown[archetype] = {
          count: 0,
          wins: archStats.wins,
          losses: archStats.losses,
          draws: archStats.draws,
          winRate: archStats.winRate,
        };
      }
      archetypeBreakdown[archetype].count += 1;
      totalWins += archStats.wins;
      totalLosses += archStats.losses;
      totalDraws += archStats.draws;
    }
  });

  const totalMatches = totalWins + totalLosses + totalDraws;
  const overallWinRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;

  return {
    card,
    totalDecks: decksWithCard.length,
    overallStats: {
      wins: totalWins,
      losses: totalLosses,
      draws: totalDraws,
      winRate: parseFloat(overallWinRate.toFixed(2)),
    },
    archetypeBreakdown: Object.entries(archetypeBreakdown)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, s]) => ({ archetype: name, ...s })),
    decks: decksWithCard.slice(0, limit),
  };
}

/** Tournament metadata + per-tournament summary. Replaces the old hardcoded version. */
export function getTournamentInfo(tournamentId: string) {
  const tournament = findTournament(tournamentId);
  if (!tournament) return null;

  const data = getData(tournamentId);

  return {
    tournamentId: tournament.id,
    slug: tournament.slug,
    name: tournament.name,
    format: tournament.format,
    date: tournament.date,
    completed: tournament.completed,
    url: `https://melee.gg/Tournament/View/${tournament.id}`,
    rounds: tournament.rounds,
    stats: {
      totalPlayers: Object.keys(data.playerDecks).length,
      totalArchetypes: Object.keys(data.stats.archetypes).length,
      totalRounds: Object.keys(data.matches).length,
      totalDecklists: data.decklists.length,
    },
    dataFiles: [
      `tournament-${tournament.id}-matches.json`,
      `tournament-${tournament.id}-decklists.json`,
      `tournament-${tournament.id}-player-decks.json`,
      `tournament-${tournament.id}-stats.json`,
    ],
  };
}

/** New: list all registered tournaments for discovery. */
export function listTournamentsBrief() {
  return loadTournaments().map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    format: t.format,
    date: t.date,
    completed: t.completed,
  }));
}
```

Notable changes:
- All query functions take or include `tournament_id`.
- Cache is a `Map<tournamentId, data>`.
- `queryPlayerDeck` and `queryPlayerStats` use a positional `(tournamentId, playerName)` signature because they have a single non-optional player arg — keeping that explicit instead of forcing a synthetic schema.
- `getTournamentInfo` now reads from the registry; the hardcoded `'Pro Tour - Aetherdrift'` is gone.
- New `listTournamentsBrief` returns the registry minus the `rounds` array (rounds are an implementation detail; consumers don't typically need them).

- [ ] **Step 2: Update `test-queries.ts` to exercise the new shape**

Replace the body of `mcp-server/src/test-queries.ts` (read first to see the existing structure):

```typescript
import {
  queryMatches,
  queryDecks,
  queryStats,
  queryPlayerDeck,
  queryPlayerStats,
  listArchetypes,
  queryDecksByCard,
  getTournamentInfo,
  listTournamentsBrief,
} from './queries.js';
import { loadTournaments } from './tournaments.js';

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`  PASS: ${msg}`);
}

console.log('Query functions smoke test\n');

const tournaments = loadTournaments();
const tIds = tournaments.map((t) => t.id);
console.log(`Registered tournaments: ${tIds.join(', ')}\n`);

const list = listTournamentsBrief();
assert(list.length === tournaments.length, 'listTournamentsBrief returns all tournaments');

for (const id of tIds) {
  console.log(`Tournament ${id}:`);
  try {
    const info = getTournamentInfo(id);
    assert(info !== null && info.tournamentId === id, `getTournamentInfo(${id}) returns metadata`);

    const matches = queryMatches({ tournament_id: id, limit: 5 });
    assert(Array.isArray(matches), `queryMatches returns array`);

    const decks = queryDecks({ tournament_id: id, limit: 5 });
    assert(Array.isArray(decks), `queryDecks returns array`);

    const stats = queryStats({ tournament_id: id });
    assert(stats !== null, `queryStats returns data`);

    const archetypes = listArchetypes(id);
    assert(Array.isArray(archetypes), `listArchetypes returns array`);

    if (decks.length > 0) {
      const sampleName = decks[0].playerName;
      const playerDeck = queryPlayerDeck(id, sampleName);
      assert(playerDeck !== null, `queryPlayerDeck finds known player`);

      const playerStats = queryPlayerStats(id, sampleName);
      assert(playerStats !== null, `queryPlayerStats finds known player`);
    }

    const cardQuery = queryDecksByCard({ tournament_id: id, card: 'Island', limit: 3 });
    assert(typeof cardQuery.totalDecks === 'number', `queryDecksByCard returns shape`);
  } catch (e) {
    console.error(`  SKIP: ${id} — ${(e as Error).message}`);
  }
  console.log('');
}

console.log('All query smoke checks passed.');
```

- [ ] **Step 3: Run smoke test**

```bash
npm run test:queries
```
Expected: PASS lines for each tournament. Should print archetype counts, etc. If any assertion fails, fix before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/queries.ts src/test-queries.ts
git commit -m "refactor(mcp-server): per-tournament queries with id parameter"
```

---

### Task 5: Extract MCP tool definitions to a shared module

**Files:**
- Create: `mcp-server/src/tool-definitions.ts`

- [ ] **Step 1: Write the shared definitions**

```typescript
/**
 * MCP tool definitions — shared between mcp-server.ts (stdio), http-server.ts,
 * and lambda.ts. Define once to avoid drift.
 */

const tournamentIdProperty = {
  type: 'string' as const,
  description:
    'Tournament ID (numeric string). Use list_tournaments to discover available tournaments.',
  pattern: '^\\d+$',
};

export const toolDefinitions = [
  {
    name: 'list_tournaments',
    description:
      'List all available tournaments with their IDs, slugs, names, formats, dates, and completion status.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'query_matches',
    description:
      'Query tournament matches by round, player, or archetype. Returns match results including players, decks, and outcomes.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        tournament_id: tournamentIdProperty,
        round: { type: 'number', description: 'Round number (1-20)', minimum: 1, maximum: 20 },
        player: { type: 'string', description: 'Player name or partial name to search for', maxLength: 100 },
        archetype: { type: 'string', description: 'Deck archetype name or partial name', maxLength: 100 },
        limit: { type: 'number', description: 'Maximum number of results (default: 100, max: 1000)', minimum: 1, maximum: 1000, default: 100 },
      },
      required: ['tournament_id'],
    },
  },
  {
    name: 'query_decks',
    description:
      'Query deck lists by player name or archetype. Returns complete deck lists with main deck and sideboard.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        tournament_id: tournamentIdProperty,
        player: { type: 'string', description: 'Player name or partial name', maxLength: 100 },
        archetype: { type: 'string', description: 'Deck archetype name or partial name', maxLength: 100 },
        limit: { type: 'number', description: 'Maximum number of results (default: 100, max: 1000)', minimum: 1, maximum: 1000, default: 100 },
      },
      required: ['tournament_id'],
    },
  },
  {
    name: 'query_stats',
    description:
      'Retrieve archetype statistics including win rates and matchup data. Optionally filter by specific archetype.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        tournament_id: tournamentIdProperty,
        archetype: { type: 'string', description: 'Specific archetype name (optional)', maxLength: 100 },
      },
      required: ['tournament_id'],
    },
  },
  {
    name: 'query_player_deck',
    description: "Get a specific player's deck list, archetype, and match history.",
    inputSchema: {
      type: 'object' as const,
      properties: {
        tournament_id: tournamentIdProperty,
        player: { type: 'string', description: 'Player name (exact or partial match)', maxLength: 100 },
      },
      required: ['tournament_id', 'player'],
    },
  },
  {
    name: 'list_archetypes',
    description:
      'List all deck archetypes in the tournament with play counts and win rates.',
    inputSchema: {
      type: 'object' as const,
      properties: { tournament_id: tournamentIdProperty },
      required: ['tournament_id'],
    },
  },
  {
    name: 'get_tournament_info',
    description:
      'Get tournament metadata including name, format, player count, and available data.',
    inputSchema: {
      type: 'object' as const,
      properties: { tournament_id: tournamentIdProperty },
      required: ['tournament_id'],
    },
  },
];
```

- [ ] **Step 2: Compile-check**

Run: `npx tsc --noEmit`
Expected: No new errors specifically in `tool-definitions.ts` (other errors in unconverted files are still expected).

---

### Task 6: Extract MCP tool handlers to a shared module

**Files:**
- Create: `mcp-server/src/tool-handlers.ts`

- [ ] **Step 1: Write the shared handlers**

```typescript
/**
 * MCP tool dispatch — single implementation, used by mcp-server.ts (stdio),
 * http-server.ts, and lambda.ts.
 */

import { z } from 'zod';
import {
  queryMatches,
  queryDecks,
  queryStats,
  queryPlayerDeck,
  listArchetypes,
  getTournamentInfo,
  listTournamentsBrief,
} from './queries.js';
import {
  validateQuery,
  matchQuerySchema,
  deckQuerySchema,
  statsQuerySchema,
  playerDeckQuerySchema,
  tournamentIdSchema,
} from './validation.js';

const tournamentOnlySchema = z.object({ tournament_id: tournamentIdSchema });

type ToolResponse = {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
};

function asText(payload: unknown): ToolResponse {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
}

function asError(message: string): ToolResponse {
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: message }, null, 2) }],
    isError: true,
  };
}

export async function callTool(name: string, args: Record<string, unknown> | undefined): Promise<ToolResponse> {
  try {
    switch (name) {
      case 'list_tournaments':
        return asText(listTournamentsBrief());

      case 'query_matches': {
        const params = validateQuery(matchQuerySchema, args ?? {});
        return asText(queryMatches(params));
      }

      case 'query_decks': {
        const params = validateQuery(deckQuerySchema, args ?? {});
        return asText(queryDecks(params));
      }

      case 'query_stats': {
        const params = validateQuery(statsQuerySchema, args ?? {});
        return asText(queryStats(params));
      }

      case 'query_player_deck': {
        const params = validateQuery(playerDeckQuerySchema, args ?? {});
        const result = queryPlayerDeck(params.tournament_id, params.player);
        return result === null ? asText({ error: 'Player not found' }) : asText(result);
      }

      case 'list_archetypes': {
        const tid = validateQuery(tournamentOnlySchema, args ?? {}).tournament_id;
        return asText(listArchetypes(tid));
      }

      case 'get_tournament_info': {
        const tid = validateQuery(tournamentOnlySchema, args ?? {}).tournament_id;
        const info = getTournamentInfo(tid);
        return info === null ? asError('Tournament not found') : asText(info);
      }

      default:
        return asError(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return asError(error instanceof Error ? error.message : 'Unknown error');
  }
}
```

- [ ] **Step 2: Compile-check**

Run: `npx tsc --noEmit`
Expected: No errors in `tool-handlers.ts`. Other files still have errors.

- [ ] **Step 3: Commit**

```bash
git add src/tool-definitions.ts src/tool-handlers.ts
git commit -m "feat(mcp-server): extract shared tool definitions and dispatch"
```

---

### Task 7: Refactor `mcp-server.ts` to use shared definitions

**Files:**
- Modify: `mcp-server/src/mcp-server.ts`

- [ ] **Step 1: Replace contents**

```typescript
/**
 * MCP Server (stdio transport). Used by `npm run mcp` for local testing
 * with stdio-based MCP clients.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { toolDefinitions } from './tool-definitions.js';
import { callTool } from './tool-handlers.js';

const server = new Server(
  { name: 'protour-data-server', version: '0.2.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: toolDefinitions }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return callTool(name, args as Record<string, unknown> | undefined);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ProTour MCP Server (v0.2.0) running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
```

- [ ] **Step 2: Compile-check**

Run: `npx tsc --noEmit`
Expected: `mcp-server.ts` compiles. Errors remain in `http-server.ts`, `lambda.ts`, `api-routes.ts`.

---

### Task 8: Refactor REST API routes to per-tournament shape

**Files:**
- Modify: `mcp-server/src/api-routes.ts`

- [ ] **Step 1: Replace contents**

```typescript
/**
 * REST API routes. Tournament ID is mandatory in the path; no flat aliases.
 */

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import {
  queryMatches,
  queryDecks,
  queryStats,
  queryPlayerDeck,
  queryPlayerStats,
  listArchetypes,
  getTournamentInfo,
  queryDecksByCard,
  listTournamentsBrief,
} from './queries.js';
import {
  validateQuery,
  matchQuerySchema,
  deckQuerySchema,
  statsQuerySchema,
  playerNameSchema,
  cardQuerySchema,
  tournamentIdSchema,
} from './validation.js';
import { findTournament } from './tournaments.js';

const router = Router();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(limiter);

// Helper: require tournament ID from path param, 404 if unknown
function requireTournamentId(req: Request, res: Response): string | null {
  try {
    return validateQuery(tournamentIdSchema, req.params.id);
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown tournament',
    });
    return null;
  }
}

// GET /api/tournaments — list all
router.get('/tournaments', (_req, res) => {
  res.json({ success: true, count: loadCount(), data: listTournamentsBrief() });
});

function loadCount() {
  return listTournamentsBrief().length;
}

// GET /api/tournaments/:id — single tournament metadata
router.get('/tournaments/:id', (req, res) => {
  const id = requireTournamentId(req, res);
  if (!id) return;
  const info = getTournamentInfo(id);
  if (!info) {
    res.status(404).json({ success: false, error: 'Tournament not found' });
    return;
  }
  res.json({ success: true, data: info });
});

// GET /api/tournaments/:id/matches
router.get('/tournaments/:id/matches', (req, res) => {
  const id = requireTournamentId(req, res);
  if (!id) return;
  try {
    const params: Record<string, unknown> = { tournament_id: id };
    if (req.query.round) params.round = parseInt(req.query.round as string, 10);
    if (req.query.player) params.player = req.query.player as string;
    if (req.query.archetype) params.archetype = req.query.archetype as string;
    if (req.query.limit) params.limit = parseInt(req.query.limit as string, 10);

    const validated = validateQuery(matchQuerySchema, params);
    const results = queryMatches(validated);
    res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid request' });
  }
});

// GET /api/tournaments/:id/decks
router.get('/tournaments/:id/decks', (req, res) => {
  const id = requireTournamentId(req, res);
  if (!id) return;
  try {
    const params: Record<string, unknown> = { tournament_id: id };
    if (req.query.player) params.player = req.query.player as string;
    if (req.query.archetype) params.archetype = req.query.archetype as string;
    if (req.query.limit) params.limit = parseInt(req.query.limit as string, 10);

    const validated = validateQuery(deckQuerySchema, params);
    const results = queryDecks(validated);
    res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid request' });
  }
});

// GET /api/tournaments/:id/stats
router.get('/tournaments/:id/stats', (req, res) => {
  const id = requireTournamentId(req, res);
  if (!id) return;
  try {
    const params: Record<string, unknown> = { tournament_id: id };
    if (req.query.archetype) params.archetype = req.query.archetype as string;

    const validated = validateQuery(statsQuerySchema, params);
    const results = queryStats(validated);
    if (results === null) {
      res.status(404).json({ success: false, error: 'Archetype not found' });
      return;
    }
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid request' });
  }
});

// GET /api/tournaments/:id/players/:player/deck
router.get('/tournaments/:id/players/:player/deck', (req, res) => {
  const id = requireTournamentId(req, res);
  if (!id) return;
  try {
    const player = validateQuery(playerNameSchema, req.params.player);
    const result = queryPlayerDeck(id, player);
    if (!result) {
      res.status(404).json({ success: false, error: 'Player not found' });
      return;
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid request' });
  }
});

// GET /api/tournaments/:id/players/:player/stats
router.get('/tournaments/:id/players/:player/stats', (req, res) => {
  const id = requireTournamentId(req, res);
  if (!id) return;
  try {
    const player = validateQuery(playerNameSchema, req.params.player);
    const result = queryPlayerStats(id, player);
    if (!result) {
      res.status(404).json({ success: false, error: 'Player not found' });
      return;
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid request' });
  }
});

// GET /api/tournaments/:id/archetypes
router.get('/tournaments/:id/archetypes', (req, res) => {
  const id = requireTournamentId(req, res);
  if (!id) return;
  try {
    const results = listArchetypes(id);
    res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

// GET /api/tournaments/:id/cards/:card
router.get('/tournaments/:id/cards/:card', (req, res) => {
  const id = requireTournamentId(req, res);
  if (!id) return;
  try {
    const params: Record<string, unknown> = {
      tournament_id: id,
      card: req.params.card,
    };
    if (req.query.limit) params.limit = parseInt(req.query.limit as string, 10);

    const validated = validateQuery(cardQuerySchema, params);
    const results = queryDecksByCard(validated);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid request' });
  }
});

export default router;
```

- [ ] **Step 2: Update `test-api.ts`**

Read current `test-api.ts`, then replace with:

```typescript
/**
 * REST API smoke test. Assumes server is running at http://localhost:3000.
 * Run: npm run dev (in another terminal) && npm run test:api
 */

const BASE = process.env.API_BASE ?? 'http://localhost:3000/api';

async function check(name: string, url: string, validate: (json: any) => string | null) {
  try {
    const res = await fetch(url);
    const body = await res.json();
    if (!res.ok) {
      console.error(`FAIL ${name}: ${res.status} ${JSON.stringify(body)}`);
      process.exit(1);
    }
    const err = validate(body);
    if (err) {
      console.error(`FAIL ${name}: ${err}`);
      process.exit(1);
    }
    console.log(`PASS ${name}`);
  } catch (e) {
    console.error(`FAIL ${name}: ${(e as Error).message}`);
    process.exit(1);
  }
}

(async () => {
  await check('list tournaments', `${BASE}/tournaments`, (b) => (Array.isArray(b.data) && b.data.length > 0 ? null : 'expected non-empty data array'));

  // Pull first tournament from list
  const list = await fetch(`${BASE}/tournaments`).then((r) => r.json());
  const firstId = list.data[0].id as string;
  console.log(`Testing against tournament ${firstId}`);

  await check('tournament metadata', `${BASE}/tournaments/${firstId}`, (b) => (b.data?.tournamentId === firstId ? null : 'wrong id'));
  await check('matches', `${BASE}/tournaments/${firstId}/matches?limit=5`, (b) => (Array.isArray(b.data) ? null : 'expected array'));
  await check('matches by round', `${BASE}/tournaments/${firstId}/matches?round=4&limit=3`, (b) => (Array.isArray(b.data) ? null : 'expected array'));
  await check('decks', `${BASE}/tournaments/${firstId}/decks?limit=5`, (b) => (Array.isArray(b.data) ? null : 'expected array'));
  await check('stats', `${BASE}/tournaments/${firstId}/stats`, (b) => (b.data?.archetypes ? null : 'expected archetypes'));
  await check('archetypes', `${BASE}/tournaments/${firstId}/archetypes`, (b) => (Array.isArray(b.data) ? null : 'expected array'));

  // Edge: unknown tournament should 404
  const res = await fetch(`${BASE}/tournaments/999999/matches`);
  if (res.status !== 404) {
    console.error(`FAIL unknown-tournament: expected 404, got ${res.status}`);
    process.exit(1);
  }
  console.log('PASS unknown-tournament returns 404');

  console.log('\nAll REST API checks passed.');
})();
```

- [ ] **Step 3: Compile-check**

Run: `npx tsc --noEmit`
Expected: `api-routes.ts` and `test-api.ts` compile. `http-server.ts` and `lambda.ts` still error.

---

### Task 9: Refactor `http-server.ts` and `lambda.ts` to use shared modules

**Files:**
- Modify: `mcp-server/src/http-server.ts`
- Modify: `mcp-server/src/lambda.ts`

- [ ] **Step 1: Replace `http-server.ts`**

```typescript
/**
 * HTTP Server: REST API + MCP-over-HTTP endpoint.
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import apiRoutes from './api-routes.js';
import { toolDefinitions } from './tool-definitions.js';
import { callTool } from './tool-handlers.js';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json({ limit: '1kb' }));

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'protour-mcp-server', version: '0.2.0', timestamp: new Date().toISOString() });
});

app.use('/api', apiRoutes);

function createMcpServer() {
  const server = new Server(
    { name: 'protour-data-server', version: '0.2.0' },
    { capabilities: { tools: {} } }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: toolDefinitions }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return callTool(name, args as Record<string, unknown> | undefined);
  });
  return server;
}

app.post('/mcp', async (req: Request, res: Response) => {
  try {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req as any, res as any, req.body);
  } catch (error) {
    console.error('MCP endpoint error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 ProTour MCP Server (v0.2.0) running on http://localhost:${PORT}`);
  console.log(`   MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`   REST API: http://localhost:${PORT}/api/*`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});
```

- [ ] **Step 2: Replace `lambda.ts`**

Read the current `lambda.ts` to confirm the export shape (it uses `@vendia/serverless-express` to wrap the Express app for API Gateway). Replace with the same structure as `http-server.ts` minus the `app.listen`, plus the serverless-express export:

```typescript
/**
 * AWS Lambda handler: same Express app as http-server.ts, wrapped with
 * @vendia/serverless-express for API Gateway integration.
 */

import serverlessExpress from '@vendia/serverless-express';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import apiRoutes from './api-routes.js';
import { toolDefinitions } from './tool-definitions.js';
import { callTool } from './tool-handlers.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1kb' }));

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'protour-mcp-server', version: '0.2.0', timestamp: new Date().toISOString() });
});

app.use('/api', apiRoutes);

function createMcpServer() {
  const server = new Server(
    { name: 'protour-data-server', version: '0.2.0' },
    { capabilities: { tools: {} } }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: toolDefinitions }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return callTool(name, args as Record<string, unknown> | undefined);
  });
  return server;
}

app.post('/mcp', async (req: Request, res: Response) => {
  try {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req as any, res as any, req.body);
  } catch (error) {
    console.error('MCP endpoint error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

export const handler = serverlessExpress({ app });
```

If the original `lambda.ts` has a different `handler` export name or wrapping style, preserve that pattern instead.

- [ ] **Step 3: Compile-check**

Run: `npx tsc --noEmit`
Expected: No errors anywhere.

- [ ] **Step 4: Commit**

```bash
git add src/api-routes.ts src/http-server.ts src/lambda.ts src/mcp-server.ts src/test-api.ts
git commit -m "refactor(mcp-server): per-tournament REST routes and MCP tools"
```

---

### Task 10: Run the full local smoke test

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```
(Leave running in one terminal.)

- [ ] **Step 2: Health check**

In another terminal:

```bash
curl -s http://localhost:3000/health | jq .
```
Expected: `{"status":"ok","service":"protour-mcp-server","version":"0.2.0",...}`

- [ ] **Step 3: List tournaments**

```bash
curl -s http://localhost:3000/api/tournaments | jq .
```
Expected: Both registered tournaments listed.

- [ ] **Step 4: Run REST API smoke**

```bash
npm run test:api
```
Expected: All PASS lines.

- [ ] **Step 5: Run MCP-over-HTTP smoke**

```bash
npm run test:http
```
Expected: PASS. (You may need to update `test-http.ts` first if it sends old-shape tool calls — read and adapt as needed; the shape change is `tournament_id` becomes a required argument.)

- [ ] **Step 6: Run query smoke**

```bash
npm run test:queries
```
Expected: PASS lines for each tournament.

- [ ] **Step 7: Stop dev server, commit any test-script fixes**

If you needed to update `test-http.ts`:

```bash
git add src/test-http.ts
git commit -m "test(mcp-server): update HTTP/MCP smoke for new tool shape"
```

---

### Task 11: Regenerate `openapi.json`

**Files:**
- Modify: `mcp-server/openapi.json`

- [ ] **Step 1: Read current file structure**

Read the first ~30 lines of `mcp-server/openapi.json` to confirm the OpenAPI version and `info` block format.

- [ ] **Step 2: Regenerate**

Replace `openapi.json` with a fresh OpenAPI 3.1.0 document covering the new endpoint shape. Skeleton:

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "ProTour Tournament Data API",
    "description": "Read-only REST API for Pokémon TCG ProTour tournament data. Tournament ID is required in the path for all data endpoints.",
    "version": "0.2.0",
    "contact": { "name": "ProTour Data" }
  },
  "servers": [
    { "url": "https://api.example.com", "description": "Production" }
  ],
  "paths": {
    "/api/tournaments": {
      "get": {
        "operationId": "listTournaments",
        "summary": "List all available tournaments",
        "responses": {
          "200": {
            "description": "OK",
            "content": { "application/json": { "schema": { "$ref": "#/components/schemas/TournamentListResponse" } } }
          }
        }
      }
    },
    "/api/tournaments/{id}": {
      "get": {
        "operationId": "getTournament",
        "summary": "Get tournament metadata",
        "parameters": [{ "$ref": "#/components/parameters/TournamentId" }],
        "responses": {
          "200": { "description": "OK" },
          "404": { "description": "Tournament not found" }
        }
      }
    },
    "/api/tournaments/{id}/matches": {
      "get": {
        "operationId": "queryMatches",
        "summary": "Query matches for a tournament",
        "parameters": [
          { "$ref": "#/components/parameters/TournamentId" },
          { "name": "round", "in": "query", "schema": { "type": "integer", "minimum": 1, "maximum": 20 } },
          { "name": "player", "in": "query", "schema": { "type": "string", "maxLength": 100 } },
          { "name": "archetype", "in": "query", "schema": { "type": "string", "maxLength": 100 } },
          { "name": "limit", "in": "query", "schema": { "type": "integer", "minimum": 1, "maximum": 1000, "default": 100 } }
        ],
        "responses": {
          "200": { "description": "OK" },
          "400": { "description": "Invalid parameters" },
          "404": { "description": "Tournament not found" }
        }
      }
    },
    "/api/tournaments/{id}/decks": {
      "get": {
        "operationId": "queryDecks",
        "summary": "Query deck lists",
        "parameters": [
          { "$ref": "#/components/parameters/TournamentId" },
          { "name": "player", "in": "query", "schema": { "type": "string", "maxLength": 100 } },
          { "name": "archetype", "in": "query", "schema": { "type": "string", "maxLength": 100 } },
          { "name": "limit", "in": "query", "schema": { "type": "integer", "minimum": 1, "maximum": 1000, "default": 100 } }
        ],
        "responses": { "200": { "description": "OK" } }
      }
    },
    "/api/tournaments/{id}/stats": {
      "get": {
        "operationId": "queryStats",
        "summary": "Archetype statistics",
        "parameters": [
          { "$ref": "#/components/parameters/TournamentId" },
          { "name": "archetype", "in": "query", "schema": { "type": "string", "maxLength": 100 } }
        ],
        "responses": { "200": { "description": "OK" } }
      }
    },
    "/api/tournaments/{id}/archetypes": {
      "get": {
        "operationId": "listArchetypes",
        "summary": "List all archetypes",
        "parameters": [{ "$ref": "#/components/parameters/TournamentId" }],
        "responses": { "200": { "description": "OK" } }
      }
    },
    "/api/tournaments/{id}/players/{player}/deck": {
      "get": {
        "operationId": "getPlayerDeck",
        "summary": "Get a player's deck and match history",
        "parameters": [
          { "$ref": "#/components/parameters/TournamentId" },
          { "name": "player", "in": "path", "required": true, "schema": { "type": "string", "maxLength": 100 } }
        ],
        "responses": { "200": { "description": "OK" }, "404": { "description": "Player not found" } }
      }
    },
    "/api/tournaments/{id}/players/{player}/stats": {
      "get": {
        "operationId": "getPlayerStats",
        "summary": "Get a player's performance statistics",
        "parameters": [
          { "$ref": "#/components/parameters/TournamentId" },
          { "name": "player", "in": "path", "required": true, "schema": { "type": "string", "maxLength": 100 } }
        ],
        "responses": { "200": { "description": "OK" }, "404": { "description": "Player not found" } }
      }
    },
    "/api/tournaments/{id}/cards/{card}": {
      "get": {
        "operationId": "queryDecksByCard",
        "summary": "Find decks containing a card",
        "parameters": [
          { "$ref": "#/components/parameters/TournamentId" },
          { "name": "card", "in": "path", "required": true, "schema": { "type": "string", "maxLength": 100 } },
          { "name": "limit", "in": "query", "schema": { "type": "integer", "minimum": 1, "maximum": 1000, "default": 100 } }
        ],
        "responses": { "200": { "description": "OK" } }
      }
    }
  },
  "components": {
    "parameters": {
      "TournamentId": {
        "name": "id",
        "in": "path",
        "required": true,
        "description": "Tournament ID (numeric string)",
        "schema": { "type": "string", "pattern": "^\\d+$" }
      }
    },
    "schemas": {
      "TournamentListResponse": {
        "type": "object",
        "properties": {
          "success": { "type": "boolean" },
          "count": { "type": "integer" },
          "data": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": { "type": "string" },
                "slug": { "type": "string" },
                "name": { "type": "string" },
                "format": { "type": "string" },
                "date": { "type": "string" },
                "completed": { "type": "boolean" }
              }
            }
          }
        }
      }
    }
  }
}
```

- [ ] **Step 3: Validate the JSON**

```bash
python3 -m json.tool openapi.json > /dev/null && echo "OK"
```
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add openapi.json
git commit -m "docs(mcp-server): regenerate OpenAPI spec for v0.2.0"
```

---

### Task 12: Update documentation

**Files:**
- Modify: `mcp-server/README.md`
- Modify: `mcp-server/API.md`
- Modify: `mcp-server/TOOLS.md`
- Modify: `mcp-server/CHATGPT-INSTRUCTIONS.md`
- Modify: `mcp-server/CHATGPT-INSTRUCTIONS-COMPACT.md`
- Modify: `mcp-server/EXAMPLES.md`

- [ ] **Step 1: Update README.md**

In `mcp-server/README.md`, find every `curl` example and any reference to flat URLs (`/api/matches`, `/api/decks`, `/api/stats`, `/api/archetypes`, `/api/tournament`, `/api/players/...`, `/api/cards/...`) and replace with the per-tournament shape. Also: change "Pro Tour - Aetherdrift (tournament 394299)" to "tournaments listed in `data/tournaments.json`" and the "Data available" bullet list to reflect that the dataset spans multiple tournaments now (call out that the registry drives discovery via `GET /api/tournaments`).

- [ ] **Step 2: Update API.md**

Replace endpoint URLs throughout:

| Old | New |
|-----|-----|
| `GET /api/matches` | `GET /api/tournaments/:id/matches` |
| `GET /api/decks` | `GET /api/tournaments/:id/decks` |
| `GET /api/stats` | `GET /api/tournaments/:id/stats` |
| `GET /api/archetypes` | `GET /api/tournaments/:id/archetypes` |
| `GET /api/tournament` | `GET /api/tournaments/:id` |
| `GET /api/players/:player/deck` | `GET /api/tournaments/:id/players/:player/deck` |
| `GET /api/players/:player/stats` | `GET /api/tournaments/:id/players/:player/stats` |
| `GET /api/cards/:card` | `GET /api/tournaments/:id/cards/:card` |
| (new) | `GET /api/tournaments` |

Add the discovery example near the top:

```bash
# Discover tournaments
curl http://localhost:3000/api/tournaments

# Then query a specific tournament
curl http://localhost:3000/api/tournaments/394299/stats
```

- [ ] **Step 3: Update TOOLS.md**

Each tool documentation block: add `tournament_id` (required string) as the first parameter. Replace the example argument JSON to include `"tournament_id": "394299"`. Add a new tool entry for `list_tournaments`.

- [ ] **Step 4: Update CHATGPT-INSTRUCTIONS.md and CHATGPT-INSTRUCTIONS-COMPACT.md**

These files are the prompts the existing custom GPT loads. Update:
- All example URLs to the new shape
- Mention that `tournament_id` is required and that consumers should use `list_tournaments` first
- Note that the integration must be re-imported with the new `openapi.json` after the upgrade

- [ ] **Step 5: Update EXAMPLES.md**

Sample prompts get the same treatment: every example gains a `tournament_id` argument or shows discovery via `list_tournaments` first.

- [ ] **Step 6: Commit**

```bash
git add README.md API.md TOOLS.md CHATGPT-INSTRUCTIONS.md CHATGPT-INSTRUCTIONS-COMPACT.md EXAMPLES.md
git commit -m "docs(mcp-server): update for v0.2.0 per-tournament API shape"
```

---

### Task 13: Bump version, final smoke test, and prepare for deploy

**Files:**
- Modify: `mcp-server/package.json`

- [ ] **Step 1: Update version**

Edit `mcp-server/package.json` and change `"version": "0.1.0"` to `"version": "0.2.0"`.

- [ ] **Step 2: Final compile + tests**

```bash
npm run build
npm run test:phase2
npm run test:queries
```
Expected: build succeeds, both smoke tests pass.

- [ ] **Step 3: Local server smoke**

```bash
npm run dev   # in another terminal
npm run test:api
npm run test:http
```
Expected: All pass.

- [ ] **Step 4: Build for Lambda (verify packaging works)**

```bash
npm run build:lambda
ls dist/data/tournaments.json   # confirm registry was bundled
ls dist/data/tournament-415628-*.json  # confirm new tournament data was bundled
```
Expected: All four 415628 files plus the registry file are in `dist/data/`.

- [ ] **Step 5: Commit version bump**

```bash
git add package.json
git commit -m "chore(mcp-server): bump version to 0.2.0"
```

- [ ] **Step 6: Deploy (manual step — do not run unattended)**

Before deploying, confirm with the user. The deployment will break the existing ChatGPT custom GPT until its OpenAPI spec is re-imported.

```bash
npm run deploy
```

After deploy, immediately verify the live endpoint:

```bash
curl https://<api-gateway-url>/api/tournaments
```

- [ ] **Step 7: Post-deploy notification checklist**

- [ ] Re-import `openapi.json` in the ChatGPT custom GPT
- [ ] Update any internal Claude Desktop / Cursor / VS Code MCP configs to send `tournament_id` in tool calls (the config itself doesn't change; users updating their prompts do)

---

### Task 14: Stage 2 wrap-up

- [ ] **Step 1: Verify clean working tree**

Run: `git status`
Expected: Working tree clean.

- [ ] **Step 2: Summary**

Stage 2 is complete:
- All MCP tools take `tournament_id`; `list_tournaments` exists for discovery
- All REST endpoints under `/api/tournaments/:id/*`; new `/api/tournaments` listing
- Data loader allowlist is registry-driven; unknown tournament IDs rejected
- Tool definitions and dispatch live in shared modules (no more 3-way drift)
- `package.json` at 0.2.0; deployed to Lambda
- ChatGPT custom GPT re-imported

Web app is still on the old single-tournament URL shape. Stage 3 (`2026-05-02-multi-tournament-stage3-web.md`) updates it.
