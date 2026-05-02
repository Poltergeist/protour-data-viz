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
