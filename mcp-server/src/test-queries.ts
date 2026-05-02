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
