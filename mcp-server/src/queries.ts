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
 * Get individual player's performance statistics
 */
export function queryPlayerStats(playerName: string) {
  const data = getData();
  
  // Find player
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
  
  // Find all player's matches
  const matches = queryMatches({ player: playerName });
  
  // Calculate player's individual stats
  let wins = 0;
  let losses = 0;
  let draws = 0;
  const matchupStats: Record<string, {
    wins: number;
    losses: number;
    draws: number;
    percentage: number;
  }> = {};
  
  matches.forEach(match => {
    // Find which competitor is our player
    const playerCompetitorIndex = match.Competitors.findIndex(comp =>
      comp.Team.Players.some(p => 
        p.DisplayName.toLowerCase().includes(playerLower)
      )
    );
    
    if (playerCompetitorIndex === -1) return;
    
    const playerName = match.Competitors[playerCompetitorIndex].Team.Players[0].DisplayName;
    const opponentIndex = playerCompetitorIndex === 0 ? 1 : 0;
    const opponentArchetype = match.Competitors[opponentIndex]?.Decklists[0]?.DecklistName || 'Unknown';
    
    // Parse result string (e.g., "Player Name won 2-0-0", "Player Name lost 0-2-0", "Match ended in a draw")
    const result = match.ResultString.toLowerCase();
    
    // Check if player won, lost, or drew
    if (result.includes(playerName.toLowerCase()) && result.includes('won')) {
      wins++;
      if (!matchupStats[opponentArchetype]) {
        matchupStats[opponentArchetype] = { wins: 0, losses: 0, draws: 0, percentage: 0 };
      }
      matchupStats[opponentArchetype].wins++;
    } else if (result.includes(playerName.toLowerCase()) && result.includes('lost')) {
      losses++;
      if (!matchupStats[opponentArchetype]) {
        matchupStats[opponentArchetype] = { wins: 0, losses: 0, draws: 0, percentage: 0 };
      }
      matchupStats[opponentArchetype].losses++;
    } else if (result.includes('draw') || result.includes('tie')) {
      draws++;
      if (!matchupStats[opponentArchetype]) {
        matchupStats[opponentArchetype] = { wins: 0, losses: 0, draws: 0, percentage: 0 };
      }
      matchupStats[opponentArchetype].draws++;
    } else {
      // If our player's name is not in the result string, they lost
      const opponentName = match.Competitors[opponentIndex].Team.Players[0].DisplayName;
      if (result.includes(opponentName.toLowerCase()) && result.includes('won')) {
        losses++;
        if (!matchupStats[opponentArchetype]) {
          matchupStats[opponentArchetype] = { wins: 0, losses: 0, draws: 0, percentage: 0 };
        }
        matchupStats[opponentArchetype].losses++;
      }
    }
  });
  
  // Calculate percentages for matchups
  Object.keys(matchupStats).forEach(opp => {
    const stats = matchupStats[opp];
    const total = stats.wins + stats.losses + stats.draws;
    stats.percentage = total > 0 ? (stats.wins / total) * 100 : 0;
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
      .map(([opp, stats]) => ({
        opponent: opp,
        ...stats,
        percentage: parseFloat(stats.percentage.toFixed(2)),
      })),
    deckList,
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
