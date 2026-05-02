# MCP Tools Reference

Complete reference for the 7 tools provided by the ProTour MCP Server (v0.2.0).

## Breaking change in v0.2.0

Tournament ID is now required for every data tool. Use `list_tournaments` first to discover available tournaments.

## Available Tools

1. [list_tournaments](#list_tournaments) — Discover available tournaments
2. [query_matches](#query_matches) — Query tournament matches
3. [query_decks](#query_decks) — Query deck lists
4. [query_stats](#query_stats) — Get archetype statistics
5. [query_player_deck](#query_player_deck) — Get player's deck and performance
6. [list_archetypes](#list_archetypes) — List all archetypes
7. [get_tournament_info](#get_tournament_info) — Get tournament metadata

---

## list_tournaments

List all available tournaments with their IDs, slugs, names, formats, dates, and completion status. Call this first to discover the `tournament_id` values needed by every other tool.

### Parameters

None.

### Returns

Array of tournament summary objects:
- `id` — numeric string used as `tournament_id`
- `slug` — URL-safe identifier
- `name` — display name
- `format` — e.g. "Standard"
- `date` — ISO date
- `completed` — true once the event is finalized

### Sample Response

```json
[
  { "id": "415628", "slug": "secrets-of-strixhaven", "name": "Pro Tour Secrets of Strixhaven", "format": "Standard", "date": "2026-05-01", "completed": false },
  { "id": "394299", "slug": "lorwyn-eclipsed", "name": "Pro Tour Lorwyn Eclipsed", "format": "Standard", "date": "2026-01-31", "completed": true }
]
```

---

## query_matches

Query tournament matches by round, player name, or archetype.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tournament_id` | string | **Yes** | Numeric tournament ID (from `list_tournaments`) |
| `round` | number | No | Round number (1-20) |
| `player` | string | No | Player name (partial match) |
| `archetype` | string | No | Deck archetype (partial match) |
| `limit` | number | No | Max results (default 100, max 1000) |

### Examples

```json
{ "tournament_id": "394299", "round": 5 }
{ "tournament_id": "394299", "player": "Gabriel Nicholas", "limit": 10 }
{ "tournament_id": "394299", "archetype": "Izzet Blink" }
{ "tournament_id": "394299", "round": 8, "archetype": "Control", "limit": 20 }
```

### Returns

Array of match objects with `TableNumber`, `ResultString`, and `Competitors` (player + decklist info).

---

## query_decks

Query complete deck lists by player or archetype.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tournament_id` | string | **Yes** | Numeric tournament ID |
| `player` | string | No | Player name (partial match) |
| `archetype` | string | No | Deck archetype (partial match) |
| `limit` | number | No | Max results (default 100, max 1000) |

### Examples

```json
{ "tournament_id": "394299", "archetype": "Izzet" }
{ "tournament_id": "394299", "player": "Gabriel Nicholas" }
```

### Returns

Array of deck list objects with `playerName`, `archetype`, `mainDeck` (60 cards), `sideboard` (15 cards).

---

## query_stats

Retrieve archetype statistics including win rates and matchup data.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tournament_id` | string | **Yes** | Numeric tournament ID |
| `archetype` | string | No | Specific archetype (returns all if omitted) |

### Examples

```json
{ "tournament_id": "394299" }
{ "tournament_id": "394299", "archetype": "Azorius Control" }
```

### Returns

Either a single archetype's stats (with `wins`, `losses`, `draws`, `winRate`, `matchups`) or the full archetypes map for the tournament.

---

## query_player_deck

Get a specific player's complete information including deck, archetype, and match history.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tournament_id` | string | **Yes** | Numeric tournament ID |
| `player` | string | **Yes** | Player name (exact or partial) |

### Example

```json
{ "tournament_id": "394299", "player": "Gabriel Nicholas" }
```

### Returns

Player object with `playerName`, `archetype`, `deckList`, `matches`, `matchCount`. Returns `null` if not found.

---

## list_archetypes

List all deck archetypes in a tournament with play counts and win rates.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tournament_id` | string | **Yes** | Numeric tournament ID |

### Example

```json
{ "tournament_id": "394299" }
```

### Returns

Array of archetype summaries, sorted alphabetically: `name`, `count`, `winRate`, `wins`, `losses`, `draws`.

---

## get_tournament_info

Get a tournament's metadata and summary statistics.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tournament_id` | string | **Yes** | Numeric tournament ID |

### Example

```json
{ "tournament_id": "394299" }
```

### Returns

Tournament info: `tournamentId`, `slug`, `name`, `format`, `date`, `completed`, `url`, `rounds`, `stats` (player count, archetype count, round count, decklist count), `dataFiles`.

---

## Security & Limits

- **Tournament allowlist**: only registered tournaments (in `data/tournaments.json`) are accessible. Unknown IDs error.
- **String length**: max 100 characters
- **Character validation**: alphanumeric, spaces, hyphens, apostrophes (player names allow periods)
- **Round numbers**: 1-20
- **Result limits**: 1-1000 (default 100)
- **Read-only**: no write tools

## Error Handling

Tools return error objects for invalid input:

```json
{ "error": "Validation error: Unknown tournament ID" }
```

Common errors:
- Missing `tournament_id`
- Unknown tournament (not in registry)
- Invalid characters in player/archetype names
- Round number out of range
- Limit exceeds maximum
- Player not found (`query_player_deck` returns `null`)
