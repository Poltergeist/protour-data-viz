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
