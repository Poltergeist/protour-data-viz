/**
 * Query functions for tournament data
 * These implement the business logic for each MCP tool
 */

import type {
  Match,
  MatchesByRound,
  DeckList,
  PlayerDecks,
  TournamentStats,
  ArchetypeStats,
} from './types.js';
import { loadAllData } from './data-loader.js';
import type { MatchQuery, DeckQuery, StatsQuery } from './validation.js';

// Cache loaded data to avoid repeated file reads
let cachedData: ReturnType<typeof loadAllData> | null = null;

function getData() {
  if (!cachedData) {
    cachedData = loadAllData();
  }
  return cachedData;
}

/**
 * Query matches by round, player, or archetype
 */
export function queryMatches(params: MatchQuery = {}) {
  const data = getData();
  const { round, player, archetype, limit = 100 } = params;
  
  let matches: Match[] = [];
  
  // Filter by round if specified
  if (round !== undefined) {
    matches = data.matches[round.toString()] || [];
  } else {
    // Get all matches from all rounds
    matches = Object.values(data.matches).flat();
  }
  
  // Filter by player name if specified
  if (player) {
    const playerLower = player.toLowerCase();
    matches = matches.filter(match =>
      match.Competitors.some(comp =>
        comp.Team.Players.some(p =>
          p.DisplayName.toLowerCase().includes(playerLower)
        )
      )
    );
  }
  
  // Filter by archetype if specified
  if (archetype) {
    const archetypeLower = archetype.toLowerCase();
    matches = matches.filter(match =>
      match.Competitors.some(comp =>
        comp.Decklists.some(deck =>
          deck.DecklistName.toLowerCase().includes(archetypeLower)
        )
      )
    );
  }
  
  // Apply limit
  return matches.slice(0, limit);
}

/**
 * Query deck lists by player or archetype
 */
export function queryDecks(params: DeckQuery = {}) {
  const data = getData();
  const { player, archetype, limit = 100 } = params;
  
  let decks = data.decklists;
  
  // Filter by player name if specified
  if (player) {
    const playerLower = player.toLowerCase();
    decks = decks.filter(deck =>
      deck.playerName.toLowerCase().includes(playerLower)
    );
  }
  
  // Filter by archetype if specified
  if (archetype) {
    const archetypeLower = archetype.toLowerCase();
    decks = decks.filter(deck =>
      deck.archetype.toLowerCase().includes(archetypeLower)
    );
  }
  
  // Apply limit
  return decks.slice(0, limit);
}

/**
 * Query archetype statistics
 */
export function queryStats(params: StatsQuery = {}) {
  const data = getData();
  const { archetype } = params;
  
  if (archetype) {
    // Return specific archetype stats
    const archetypeLower = archetype.toLowerCase();
    const matchingArchetype = Object.keys(data.stats.archetypes).find(
      key => key.toLowerCase() === archetypeLower
    );
    
    if (matchingArchetype) {
      return {
        archetype: matchingArchetype,
        stats: data.stats.archetypes[matchingArchetype],
      };
    }
    
    return null;
  }
  
  // Return all stats
  return data.stats;
}

/**
 * Get specific player's deck and performance
 */
export function queryPlayerDeck(playerName: string) {
  const data = getData();
  
  // Find player's archetype
  const playerLower = playerName.toLowerCase();
  const matchingPlayer = Object.keys(data.playerDecks).find(
    name => name.toLowerCase() === playerLower
  );
  
  if (!matchingPlayer) {
    return null;
  }
  
  const archetype = data.playerDecks[matchingPlayer];
  
  // Find player's deck list
  const deckList = data.decklists.find(
    deck => deck.playerName.toLowerCase() === playerLower
  );
  
  // Find player's matches
  const matches = queryMatches({ player: playerName });
  
  return {
    playerName: matchingPlayer,
    archetype,
    deckList,
    matches,
    matchCount: matches.length,
  };
}

/**
 * List all available archetypes
 */
export function listArchetypes() {
  const data = getData();
  
  const archetypes = Object.keys(data.stats.archetypes)
    .sort()
    .map(name => ({
      name,
      count: data.decklists.filter(d => d.archetype === name).length,
      winRate: data.stats.archetypes[name].winRate,
      wins: data.stats.archetypes[name].wins,
      losses: data.stats.archetypes[name].losses,
      draws: data.stats.archetypes[name].draws,
    }));
  
  return archetypes;
}

/**
 * Get tournament metadata and summary
 */
export function getTournamentInfo() {
  const data = getData();
  
  return {
    tournamentId: '394299',
    name: 'Pro Tour - Aetherdrift',
    url: 'https://melee.gg/Tournament/View/394299',
    format: 'Standard',
    stats: {
      totalPlayers: Object.keys(data.playerDecks).length,
      totalArchetypes: Object.keys(data.stats.archetypes).length,
      totalRounds: Object.keys(data.matches).length,
      totalDecklists: data.decklists.length,
    },
    rounds: Object.keys(data.matches).map(Number).sort((a, b) => a - b),
    dataFiles: [
      'tournament-394299-matches.json',
      'tournament-394299-decklists.json',
      'tournament-394299-player-decks.json',
      'tournament-394299-stats.json',
    ],
  };
}

/**
 * Clear cached data (useful for testing)
 */
export function clearCache() {
  cachedData = null;
}
