# MCP Tools Reference

Complete reference for all 6 tools provided by the ProTour MCP Server.

## Available Tools

1. [query_matches](#query_matches) - Query tournament matches
2. [query_decks](#query_decks) - Query deck lists
3. [query_stats](#query_stats) - Get archetype statistics
4. [query_player_deck](#query_player_deck) - Get player's deck and performance
5. [list_archetypes](#list_archetypes) - List all archetypes
6. [get_tournament_info](#get_tournament_info) - Get tournament metadata

---

## query_matches

Query tournament matches by round, player name, or archetype.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `round` | number | No | Round number (1-20) |
| `player` | string | No | Player name or partial name |
| `archetype` | string | No | Deck archetype name or partial |
| `limit` | number | No | Max results (default: 100, max: 1000) |

### Returns

Array of match objects with:
- `TableNumber` - Table/match number
- `ResultString` - Match outcome description
- `Competitors` - Array of 2 competitors with player info and decklists

### Examples

**Query all matches from round 5:**
```json
{
  "round": 5
}
```

**Find matches for a specific player:**
```json
{
  "player": "Gabriel Nicholas",
  "limit": 10
}
```

**Find matches with a specific archetype:**
```json
{
  "archetype": "Izzet Blink"
}
```

**Combined filters:**
```json
{
  "round": 8,
  "archetype": "Control",
  "limit": 20
}
```

### Sample Response

```json
[
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
]
```

---

## query_decks

Query complete deck lists by player name or archetype.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `player` | string | No | Player name or partial name |
| `archetype` | string | No | Deck archetype name or partial |
| `limit` | number | No | Max results (default: 100, max: 1000) |

### Returns

Array of deck list objects with:
- `playerName` - Player's full name
- `archetype` - Deck archetype
- `mainDeck` - Array of cards with quantity and name
- `sideboard` - Array of sideboard cards

### Examples

**Get all Izzet decks:**
```json
{
  "archetype": "Izzet"
}
```

**Get a specific player's deck:**
```json
{
  "player": "Gabriel Nicholas"
}
```

**Get first 10 decks:**
```json
{
  "limit": 10
}
```

### Sample Response

```json
[
  {
    "playerName": "Gabriel Nicholas",
    "archetype": "Izzet Blink",
    "mainDeck": [
      { "quantity": 4, "name": "Quantum Riddler" },
      { "quantity": 4, "name": "Thundertrap Trainer" },
      { "quantity": 2, "name": "Ral, Crackling Wit" }
    ],
    "sideboard": [
      { "quantity": 2, "name": "Negate" },
      { "quantity": 2, "name": "Mystical Dispute" }
    ]
  }
]
```

---

## query_stats

Retrieve archetype statistics including win rates and matchup data.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `archetype` | string | No | Specific archetype (returns all if omitted) |

### Returns

- If `archetype` specified: Single archetype stats object
- If no archetype: All tournament statistics

Each archetype includes:
- `wins`, `losses`, `draws` - Overall record
- `winRate` - Win percentage
- `matchups` - Head-to-head stats vs other archetypes

### Examples

**Get all archetype statistics:**
```json
{}
```

**Get specific archetype stats:**
```json
{
  "archetype": "Azorius Control"
}
```

### Sample Response (specific archetype)

```json
{
  "archetype": "Azorius Control",
  "stats": {
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
      },
      "Izzet Spellementals": {
        "wins": 3,
        "losses": 2,
        "draws": 0,
        "percentage": 60.0
      }
    }
  }
}
```

---

## query_player_deck

Get a specific player's complete information including deck, archetype, and match history.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `player` | string | Yes | Player name (exact or partial) |

### Returns

Player object with:
- `playerName` - Player's full name
- `archetype` - Deck archetype they played
- `deckList` - Complete deck list (mainDeck + sideboard)
- `matches` - All matches the player participated in
- `matchCount` - Number of matches played

Returns `null` if player not found.

### Examples

**Get player information:**
```json
{
  "player": "Gabriel Nicholas"
}
```

### Sample Response

```json
{
  "playerName": "Gabriel Nicholas",
  "archetype": "Izzet Blink",
  "deckList": {
    "playerName": "Gabriel Nicholas",
    "archetype": "Izzet Blink",
    "mainDeck": [ /* ... */ ],
    "sideboard": [ /* ... */ ]
  },
  "matches": [ /* array of Match objects */ ],
  "matchCount": 10
}
```

---

## list_archetypes

List all deck archetypes in the tournament with play counts and win rates.

### Parameters

None

### Returns

Array of archetype summary objects, sorted alphabetically:
- `name` - Archetype name
- `count` - Number of players using this archetype
- `winRate` - Win percentage
- `wins`, `losses`, `draws` - Overall record

### Examples

**Get all archetypes:**
```json
{}
```

### Sample Response

```json
[
  {
    "name": "Azorius Control",
    "count": 5,
    "winRate": 58.82,
    "wins": 20,
    "losses": 14,
    "draws": 1
  },
  {
    "name": "Bant Rhythm",
    "count": 22,
    "winRate": 55.45,
    "wins": 61,
    "losses": 49,
    "draws": 0
  },
  {
    "name": "Izzet Spellementals",
    "count": 15,
    "winRate": 69.3,
    "wins": 88,
    "losses": 39,
    "draws": 0
  }
]
```

---

## get_tournament_info

Get tournament metadata and summary statistics.

### Parameters

None

### Returns

Tournament information object with:
- `tournamentId` - Tournament ID
- `name` - Tournament name
- `url` - melee.gg URL
- `format` - Tournament format
- `stats` - Summary statistics (players, archetypes, rounds, decklists)
- `rounds` - Array of round numbers available
- `dataFiles` - List of source data files

### Examples

**Get tournament info:**
```json
{}
```

### Sample Response

```json
{
  "tournamentId": "394299",
  "name": "Pro Tour - Aetherdrift",
  "url": "https://melee.gg/Tournament/View/394299",
  "format": "Standard",
  "stats": {
    "totalPlayers": 304,
    "totalArchetypes": 43,
    "totalRounds": 10,
    "totalDecklists": 304
  },
  "rounds": [4, 5, 6, 7, 8, 12, 13, 14, 15, 16],
  "dataFiles": [
    "tournament-394299-matches.json",
    "tournament-394299-decklists.json",
    "tournament-394299-player-decks.json",
    "tournament-394299-stats.json"
  ]
}
```

---

## Security & Limits

All tools enforce the following security constraints:

- **String length**: Max 100 characters
- **Character validation**: Only alphanumeric, spaces, hyphens, apostrophes
- **Round numbers**: 1-20
- **Result limits**: 1-1000 (default 100)
- **No file access**: Only reads from 4 specific JSON files
- **No writes**: All tools are read-only

## Error Handling

Tools return error objects for invalid input:

```json
{
  "error": "Validation error: Invalid characters in string"
}
```

Common errors:
- Invalid characters in player/archetype names
- Round number out of range (1-20)
- Limit exceeds maximum (1000)
- Player not found (query_player_deck returns null)
