/**
 * Query functions for tournament data.
 * Each function takes the tournament_id as the first parameter.
 *
 * Per-tournament data is cached in a Map to avoid re-reading JSON files on
 * every query.
 */

import type { Match } from './types.js';
import { loadAllData } from './data-loader.js';
import { findTournament, loadTournaments } from './tournaments.js';
import type {
  MatchQuery,
  DeckQuery,
  StatsQuery,
  CardQuery,
} from './validation.js';

type LoadedData = ReturnType<typeof loadAllData>;
const dataCache = new Map<string, LoadedData>();

function getData(tournamentId: string): LoadedData {
  let data = dataCache.get(tournamentId);
  if (!data) {
    data = loadAllData(tournamentId);
    dataCache.set(tournamentId, data);
  }
  return data;
}

export function clearCache(): void {
  dataCache.clear();
}

export function queryMatches(params: MatchQuery) {
  const data = getData(params.tournament_id);
  const { round, player, archetype, limit = 100 } = params;

  let matches: Match[] = [];
  if (round !== undefined) {
    matches = data.matches[round.toString()] ?? [];
  } else {
    matches = Object.values(data.matches).flat();
  }

  if (player) {
    const p = player.toLowerCase();
    matches = matches.filter((m) =>
      m.Competitors.some((c) =>
        c.Team.Players.some((pl) => pl.DisplayName.toLowerCase().includes(p))
      )
    );
  }

  if (archetype) {
    const a = archetype.toLowerCase();
    matches = matches.filter((m) =>
      m.Competitors.some((c) =>
        c.Decklists.some((d) => d.DecklistName.toLowerCase().includes(a))
      )
    );
  }

  return matches.slice(0, limit);
}

export function queryDecks(params: DeckQuery) {
  const data = getData(params.tournament_id);
  const { player, archetype, limit = 100 } = params;

  let decks = data.decklists;
  if (player) {
    const p = player.toLowerCase();
    decks = decks.filter((d) => d.playerName.toLowerCase().includes(p));
  }
  if (archetype) {
    const a = archetype.toLowerCase();
    decks = decks.filter((d) => d.archetype.toLowerCase().includes(a));
  }

  return decks.slice(0, limit);
}

export function queryStats(params: StatsQuery) {
  const data = getData(params.tournament_id);
  const { archetype } = params;

  if (archetype) {
    const archLower = archetype.toLowerCase();
    const match = Object.keys(data.stats.archetypes).find(
      (k) => k.toLowerCase() === archLower
    );
    if (match) {
      return { archetype: match, stats: data.stats.archetypes[match] };
    }
    return null;
  }

  return data.stats;
}

export function queryPlayerDeck(tournamentId: string, playerName: string) {
  const data = getData(tournamentId);
  const playerLower = playerName.toLowerCase();
  const matchingPlayer = Object.keys(data.playerDecks).find(
    (n) => n.toLowerCase() === playerLower
  );
  if (!matchingPlayer) return null;

  const archetype = data.playerDecks[matchingPlayer];
  const deckList = data.decklists.find(
    (d) => d.playerName.toLowerCase() === playerLower
  );
  const matches = queryMatches({ tournament_id: tournamentId, player: playerName });

  return {
    playerName: matchingPlayer,
    archetype,
    deckList,
    matches,
    matchCount: matches.length,
  };
}

export function queryPlayerStats(tournamentId: string, playerName: string) {
  const data = getData(tournamentId);
  const playerLower = playerName.toLowerCase();
  const matchingPlayer = Object.keys(data.playerDecks).find(
    (n) => n.toLowerCase() === playerLower
  );
  if (!matchingPlayer) return null;

  const archetype = data.playerDecks[matchingPlayer];
  const deckList = data.decklists.find(
    (d) => d.playerName.toLowerCase() === playerLower
  );
  const matches = queryMatches({ tournament_id: tournamentId, player: playerName });

  let wins = 0;
  let losses = 0;
  let draws = 0;
  const matchupStats: Record<string, { wins: number; losses: number; draws: number; percentage: number }> = {};

  matches.forEach((match) => {
    const playerCompetitorIndex = match.Competitors.findIndex((c) =>
      c.Team.Players.some((p) => p.DisplayName.toLowerCase().includes(playerLower))
    );
    if (playerCompetitorIndex === -1) return;

    const playerDisplayName = match.Competitors[playerCompetitorIndex].Team.Players[0].DisplayName;
    const opponentIndex = playerCompetitorIndex === 0 ? 1 : 0;
    const opponentArchetype = match.Competitors[opponentIndex]?.Decklists[0]?.DecklistName ?? 'Unknown';
    const result = match.ResultString.toLowerCase();
    const ensureBucket = (k: string) => {
      if (!matchupStats[k]) matchupStats[k] = { wins: 0, losses: 0, draws: 0, percentage: 0 };
    };

    if (result.includes(playerDisplayName.toLowerCase()) && result.includes('won')) {
      wins++; ensureBucket(opponentArchetype); matchupStats[opponentArchetype].wins++;
    } else if (result.includes(playerDisplayName.toLowerCase()) && result.includes('lost')) {
      losses++; ensureBucket(opponentArchetype); matchupStats[opponentArchetype].losses++;
    } else if (result.includes('draw') || result.includes('tie')) {
      draws++; ensureBucket(opponentArchetype); matchupStats[opponentArchetype].draws++;
    } else {
      const opponentName = match.Competitors[opponentIndex].Team.Players[0].DisplayName;
      if (result.includes(opponentName.toLowerCase()) && result.includes('won')) {
        losses++; ensureBucket(opponentArchetype); matchupStats[opponentArchetype].losses++;
      }
    }
  });

  Object.keys(matchupStats).forEach((opp) => {
    const s = matchupStats[opp];
    const total = s.wins + s.losses + s.draws;
    s.percentage = total > 0 ? (s.wins / total) * 100 : 0;
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
      .map(([opp, s]) => ({ opponent: opp, ...s, percentage: parseFloat(s.percentage.toFixed(2)) })),
    deckList,
  };
}

export function listArchetypes(tournamentId: string) {
  const data = getData(tournamentId);
  return Object.keys(data.stats.archetypes)
    .sort()
    .map((name) => ({
      name,
      count: data.decklists.filter((d) => d.archetype === name).length,
      winRate: data.stats.archetypes[name].winRate,
      wins: data.stats.archetypes[name].wins,
      losses: data.stats.archetypes[name].losses,
      draws: data.stats.archetypes[name].draws,
    }));
}

export function queryDecksByCard(params: CardQuery) {
  const data = getData(params.tournament_id);
  const { card, limit = 100 } = params;
  const cardLower = card.toLowerCase();

  const decksWithCard = data.decklists.filter((deck) => {
    const inMain = deck.mainDeck.some((c) => c.name.toLowerCase().includes(cardLower));
    const inSide = deck.sideboard.some((c) => c.name.toLowerCase().includes(cardLower));
    return inMain || inSide;
  });

  const archetypeBreakdown: Record<string, { count: number; wins: number; losses: number; draws: number; winRate: number }> = {};
  let totalWins = 0;
  let totalLosses = 0;
  let totalDraws = 0;

  decksWithCard.forEach((deck) => {
    const archetype = deck.archetype;
    const archStats = data.stats.archetypes[archetype];
    if (archStats) {
      if (!archetypeBreakdown[archetype]) {
        archetypeBreakdown[archetype] = {
          count: 0,
          wins: archStats.wins,
          losses: archStats.losses,
          draws: archStats.draws,
          winRate: archStats.winRate,
        };
      }
      archetypeBreakdown[archetype].count += 1;
      totalWins += archStats.wins;
      totalLosses += archStats.losses;
      totalDraws += archStats.draws;
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
      .map(([name, s]) => ({ archetype: name, ...s })),
    decks: decksWithCard.slice(0, limit),
  };
}

/** Tournament metadata + per-tournament summary. */
export function getTournamentInfo(tournamentId: string) {
  const tournament = findTournament(tournamentId);
  if (!tournament) return null;

  const data = getData(tournamentId);

  return {
    tournamentId: tournament.id,
    slug: tournament.slug,
    name: tournament.name,
    format: tournament.format,
    date: tournament.date,
    completed: tournament.completed,
    url: `https://melee.gg/Tournament/View/${tournament.id}`,
    rounds: tournament.rounds,
    stats: {
      totalPlayers: Object.keys(data.playerDecks).length,
      totalArchetypes: Object.keys(data.stats.archetypes).length,
      totalRounds: Object.keys(data.matches).length,
      totalDecklists: data.decklists.length,
    },
    dataFiles: [
      `tournament-${tournament.id}-matches.json`,
      `tournament-${tournament.id}-decklists.json`,
      `tournament-${tournament.id}-player-decks.json`,
      `tournament-${tournament.id}-stats.json`,
    ],
  };
}

/** New: list all registered tournaments for discovery. */
export function listTournamentsBrief() {
  return loadTournaments().map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    format: t.format,
    date: t.date,
    completed: t.completed,
  }));
}
