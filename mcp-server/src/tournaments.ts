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
