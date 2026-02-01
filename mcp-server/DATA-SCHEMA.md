# Data Schema Documentation

This document describes the data structures used by the ProTour MCP Server.

## Data Sources

The server reads from four JSON files in the `../data` directory:

- `tournament-394299-matches.json` - Match results by round
- `tournament-394299-decklists.json` - Complete deck lists
- `tournament-394299-player-decks.json` - Player to archetype mappings
- `tournament-394299-stats.json` - Archetype statistics and matchups

## Type Definitions

### Card

Represents a single card in a deck.

```typescript
interface Card {
  quantity: number;
  name: string;
}
```

**Example:**
```json
{
  "quantity": 4,
  "name": "Lightning Bolt"
}
```

### DeckList

Complete deck list with main deck and sideboard.

```typescript
interface DeckList {
  playerName: string;
  archetype: string;
  mainDeck: Card[];
  sideboard: Card[];
}
```

**Example:**
```json
{
  "playerName": "Gabriel Nicholas",
  "archetype": "Izzet Blink",
  "mainDeck": [
    { "quantity": 4, "name": "Quantum Riddler" },
    { "quantity": 4, "name": "Thundertrap Trainer" }
  ],
  "sideboard": [
    { "quantity": 2, "name": "Negate" }
  ]
}
```

### Match

Represents a single match result.

```typescript
interface Match {
  TableNumber: number;
  ResultString: string;
  Competitors: Competitor[];
}

interface Competitor {
  Decklists: DecklistMetadata[];
  Team: {
    Players: Player[];
  };
}

interface Player {
  ID: number;
  DisplayName: string;
  ScreenName: string;
}
```

**Example:**
```json
{
  "TableNumber": 1,
  "ResultString": "Marco Belacca won 2-0-0",
  "Competitors": [
    {
      "Decklists": [{
        "DecklistId": "...",
        "PlayerId": 3767404,
        "DecklistName": "Jeskai Control",
        "Format": "Standard"
      }],
      "Team": {
        "Players": [{
          "ID": 3767404,
          "DisplayName": "Marco Belacca",
          "ScreenName": "N/A"
        }]
      }
    }
  ]
}
```

### MatchesByRound

Matches organized by round number (as string keys).

```typescript
interface MatchesByRound {
  [round: string]: Match[];
}
```

**Example:**
```json
{
  "4": [ /* array of Match objects */ ],
  "5": [ /* array of Match objects */ ],
  "6": [ /* array of Match objects */ ]
}
```

### PlayerDecks

Simple mapping of player names to archetypes.

```typescript
interface PlayerDecks {
  [playerName: string]: string;
}
```

**Example:**
```json
{
  "abe schnake": "Izzet Control",
  "adam brace": "Izzet Spellementals",
  "allen wu": "Izzet Spellementals"
}
```

### TournamentStats

Archetype statistics including win rates and matchup data.

```typescript
interface TournamentStats {
  archetypes: {
    [archetypeName: string]: ArchetypeStats;
  };
}

interface ArchetypeStats {
  archetype: string;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  matchups: {
    [opponentArchetype: string]: MatchupStats;
  };
}

interface MatchupStats {
  wins: number;
  losses: number;
  draws: number;
  percentage: number;
}
```

**Example:**
```json
{
  "archetypes": {
    "Azorius Control": {
      "archetype": "Azorius Control",
      "wins": 20,
      "losses": 14,
      "draws": 1,
      "winRate": 58.82,
      "matchups": {
        "Bant Rhythm": {
          "wins": 2,
          "losses": 1,
          "draws": 0,
          "percentage": 66.67
        }
      }
    }
  }
}
```

## Data Statistics

From tournament 394299:

- **Rounds**: 10 rounds (4-13)
- **Players**: 304 unique players
- **Archetypes**: 43 different deck archetypes
- **Deck Lists**: 304 complete deck lists
- **Matches**: Hundreds of matches across all rounds

## Security

All data access is restricted to the four files listed above. The data loader:

- Uses an allowlist of specific filenames
- Validates file paths to prevent directory traversal
- Handles missing or malformed data gracefully
- Never exposes filesystem paths in error messages

## Usage in Code

```typescript
import { loadMatches, loadDecklists, loadPlayerDecks, loadStats } from './data-loader.js';

// Load specific data
const matches = loadMatches();
const decklists = loadDecklists();
const playerDecks = loadPlayerDecks();
const stats = loadStats();

// Load all at once
import { loadAllData } from './data-loader.js';
const data = loadAllData();
```
