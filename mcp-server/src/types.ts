/**
 * Core data types for ProTour tournament data
 */

// Card in a deck
export interface Card {
  quantity: number;
  name: string;
}

// Deck list with main deck and sideboard
export interface DeckList {
  playerName: string;
  archetype: string;
  mainDeck: Card[];
  sideboard: Card[];
}

// Player information from match data
export interface Player {
  ID: number;
  DisplayName: string;
  ScreenName: string;
}

// Decklist metadata from match data
export interface DecklistMetadata {
  DecklistId: string;
  PlayerId: number;
  DecklistName: string;
  Format: string;
  FormatId: string;
}

// Competitor in a match
export interface Competitor {
  Decklists: DecklistMetadata[];
  Team: {
    Players: Player[];
  };
}

// Match result
export interface Match {
  TableNumber: number;
  ResultString: string;
  Competitors: Competitor[];
}

// Matches organized by round
export interface MatchesByRound {
  [round: string]: Match[];
}

// Player to archetype mapping
export interface PlayerDecks {
  [playerName: string]: string; // player name -> archetype
}

// Matchup statistics
export interface MatchupStats {
  wins: number;
  losses: number;
  draws: number;
  percentage: number;
}

// Archetype statistics
export interface ArchetypeStats {
  archetype: string;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  matchups: {
    [opponentArchetype: string]: MatchupStats;
  };
}

// Tournament statistics
export interface TournamentStats {
  archetypes: {
    [archetypeName: string]: ArchetypeStats;
  };
}

// Tournament metadata
export interface TournamentInfo {
  id: string;
  name?: string;
  url?: string;
  dataFiles: string[];
}
