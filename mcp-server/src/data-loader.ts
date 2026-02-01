/**
 * Secure data loading module
 * 
 * Security features:
 * - Allowlist of specific JSON files only
 * - No arbitrary file access
 * - Path validation to prevent directory traversal
 * - Error handling for missing/malformed data
 */

import { readFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  MatchesByRound,
  DeckList,
  PlayerDecks,
  TournamentStats,
} from './types.js';

// Get directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Absolute path to data directory
const DATA_DIR = resolve(__dirname, '../../data');

// SECURITY: Allowlist of specific files that can be accessed
const ALLOWED_FILES = [
  'tournament-394299-matches.json',
  'tournament-394299-decklists.json',
  'tournament-394299-player-decks.json',
  'tournament-394299-stats.json',
] as const;

type AllowedFileName = typeof ALLOWED_FILES[number];

/**
 * Validate that a filename is in the allowlist
 * @throws Error if filename is not allowed
 */
function validateFileName(filename: string): asserts filename is AllowedFileName {
  if (!ALLOWED_FILES.includes(filename as AllowedFileName)) {
    throw new Error(`Invalid file: ${filename}. File not in allowlist.`);
  }
}

/**
 * Safely load a JSON file from the data directory
 * SECURITY: Only allows files from the allowlist
 * 
 * @param filename - Name of the file (must be in ALLOWED_FILES)
 * @returns Parsed JSON data
 * @throws Error if file doesn't exist, is not allowed, or contains invalid JSON
 */
function loadDataFile<T>(filename: string): T {
  // SECURITY: Validate filename is in allowlist
  validateFileName(filename);
  
  // Construct safe file path
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

/**
 * Load match data organized by round
 */
export function loadMatches(): MatchesByRound {
  return loadDataFile<MatchesByRound>('tournament-394299-matches.json');
}

/**
 * Load deck lists
 */
export function loadDecklists(): DeckList[] {
  return loadDataFile<DeckList[]>('tournament-394299-decklists.json');
}

/**
 * Load player to archetype mappings
 */
export function loadPlayerDecks(): PlayerDecks {
  return loadDataFile<PlayerDecks>('tournament-394299-player-decks.json');
}

/**
 * Load tournament statistics
 */
export function loadStats(): TournamentStats {
  return loadDataFile<TournamentStats>('tournament-394299-stats.json');
}

/**
 * Load all tournament data at once
 */
export function loadAllData() {
  return {
    matches: loadMatches(),
    decklists: loadDecklists(),
    playerDecks: loadPlayerDecks(),
    stats: loadStats(),
  };
}

/**
 * Get list of available data files
 */
export function getAvailableFiles(): readonly string[] {
  return ALLOWED_FILES;
}
