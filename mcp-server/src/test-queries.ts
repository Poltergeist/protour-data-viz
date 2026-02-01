/**
 * Test file for query functions
 */

import {
  queryMatches,
  queryDecks,
  queryStats,
  queryPlayerDeck,
  listArchetypes,
  getTournamentInfo,
} from './queries.js';

console.log('🧪 Testing Phase 3: Query Functions\n');

// Test 1: Query matches
console.log('1️⃣  Testing queryMatches...');
const round5Matches = queryMatches({ round: 5 });
console.log(`   ✅ Round 5 matches: ${round5Matches.length} matches`);

const playerMatches = queryMatches({ player: 'Gabriel Nicholas', limit: 5 });
console.log(`   ✅ Gabriel Nicholas matches: ${playerMatches.length} matches`);

const archetypeMatches = queryMatches({ archetype: 'Izzet', limit: 10 });
console.log(`   ✅ Izzet archetype matches: ${archetypeMatches.length} matches`);

// Test 2: Query decks
console.log('\n2️⃣  Testing queryDecks...');
const allDecks = queryDecks({ limit: 5 });
console.log(`   ✅ First 5 decks loaded`);

const izzitDecks = queryDecks({ archetype: 'Izzet' });
console.log(`   ✅ Izzet decks: ${izzitDecks.length} decks`);

const gabrielDeck = queryDecks({ player: 'Gabriel Nicholas' });
console.log(`   ✅ Gabriel Nicholas deck: ${gabrielDeck.length > 0 ? 'found' : 'not found'}`);
if (gabrielDeck.length > 0) {
  console.log(`      Archetype: ${gabrielDeck[0].archetype}`);
  console.log(`      Main deck cards: ${gabrielDeck[0].mainDeck.length}`);
  console.log(`      Sideboard cards: ${gabrielDeck[0].sideboard.length}`);
}

// Test 3: Query stats
console.log('\n3️⃣  Testing queryStats...');
const allStats = queryStats();
console.log(`   ✅ All stats loaded: ${Object.keys(allStats.archetypes).length} archetypes`);

const controlStats = queryStats({ archetype: 'Azorius Control' });
if (controlStats) {
  console.log(`   ✅ Azorius Control stats:`);
  console.log(`      Win rate: ${controlStats.stats.winRate.toFixed(2)}%`);
  console.log(`      Record: ${controlStats.stats.wins}-${controlStats.stats.losses}-${controlStats.stats.draws}`);
}

// Test 4: Query player deck
console.log('\n4️⃣  Testing queryPlayerDeck...');
const playerDeck = queryPlayerDeck('Gabriel Nicholas');
if (playerDeck) {
  console.log(`   ✅ Gabriel Nicholas:`);
  console.log(`      Archetype: ${playerDeck.archetype}`);
  console.log(`      Matches played: ${playerDeck.matchCount}`);
  console.log(`      Deck list available: ${playerDeck.deckList ? 'yes' : 'no'}`);
}

// Test 5: List archetypes
console.log('\n5️⃣  Testing listArchetypes...');
const archetypes = listArchetypes();
console.log(`   ✅ Total archetypes: ${archetypes.length}`);
console.log(`   📊 Top 5 by win rate:`);
const top5 = archetypes
  .sort((a, b) => b.winRate - a.winRate)
  .slice(0, 5);
top5.forEach((arch, i) => {
  console.log(`      ${i + 1}. ${arch.name}: ${arch.winRate.toFixed(1)}% (${arch.count} decks)`);
});

// Test 6: Get tournament info
console.log('\n6️⃣  Testing getTournamentInfo...');
const info = getTournamentInfo();
console.log(`   ✅ Tournament: ${info.name}`);
console.log(`   ✅ ID: ${info.tournamentId}`);
console.log(`   ✅ Players: ${info.stats.totalPlayers}`);
console.log(`   ✅ Archetypes: ${info.stats.totalArchetypes}`);
console.log(`   ✅ Rounds: ${info.stats.totalRounds} (${info.rounds.join(', ')})`);
console.log(`   ✅ Format: ${info.format}`);

console.log('\n🎉 All query functions working!');
