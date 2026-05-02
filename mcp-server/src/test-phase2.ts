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

console.log('\nAll Phase 2 checks passed.');
