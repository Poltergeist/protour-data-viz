// Tournament data types

export interface CardInfo {
  quantity: number;
  name: string;
}

export interface DeckInfo {
  playerName: string;
  archetype: string;
  mainDeck: CardInfo[];
  sideboard: CardInfo[];
}

export interface Competitor {
  Name: string;
  Points?: string;
}

export interface Match {
  TableNumber: number;
  ResultString: string;
  Competitors: Competitor[];
}

export interface MatchData {
  [round: string]: Match[];
}

export interface MatchupStats {
  wins: number;
  losses: number;
  draws: number;
  percentage: number;
}

export interface ArchetypeStats {
  archetype: string;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  matchups: {
    [opponent: string]: MatchupStats;
  };
}

export interface StatsData {
  archetypes: {
    [archetype: string]: ArchetypeStats;
  };
}
