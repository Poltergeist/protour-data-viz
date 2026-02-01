/**
 * Query functions for tournament data
 * These implement the business logic for each MCP tool
 */

import type {
  Match,
} from './types.js';
import { loadAllData } from './data-loader.js';
import type { MatchQuery, DeckQuery, StatsQuery, CardQuery } from './validation.js';

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
 * Query decks by card name and calculate performance
 */
export function queryDecksByCard(params: CardQuery) {
  const data = getData();
  const { card, limit = 100 } = params;
  const cardLower = card.toLowerCase();
  
  // Find all decks containing this card (in main deck or sideboard)
  const decksWithCard = data.decklists.filter(deck => {
    const hasInMainDeck = deck.mainDeck.some(c => 
      c.name.toLowerCase().includes(cardLower)
    );
    const hasInSideboard = deck.sideboard.some(c => 
      c.name.toLowerCase().includes(cardLower)
    );
    return hasInMainDeck || hasInSideboard;
  });
  
  // Calculate statistics for these decks
  const archetypeBreakdown: Record<string, {
    count: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
  }> = {};
  
  let totalWins = 0;
  let totalLosses = 0;
  let totalDraws = 0;
  
  decksWithCard.forEach(deck => {
    const archetype = deck.archetype;
    const archetypeStats = data.stats.archetypes[archetype];
    
    if (archetypeStats) {
      if (!archetypeBreakdown[archetype]) {
        archetypeBreakdown[archetype] = {
          count: 0,
          wins: archetypeStats.wins,
          losses: archetypeStats.losses,
          draws: archetypeStats.draws,
          winRate: archetypeStats.winRate,
        };
      }
      archetypeBreakdown[archetype].count += 1;
      totalWins += archetypeStats.wins;
      totalLosses += archetypeStats.losses;
      totalDraws += archetypeStats.draws;
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
      .map(([name, stats]) => ({ archetype: name, ...stats })),
    decks: decksWithCard.slice(0, limit),
  };
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
