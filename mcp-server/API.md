# REST API Documentation

Complete reference for the ProTour Data REST API.

## Base URL

```
http://localhost:3000/api
```

## Response Format

All endpoints return JSON with a consistent structure:

**Success Response:**
```json
{
  "success": true,
  "count": 10,      // For list endpoints
  "data": { ... }   // Response data
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message"
}
```

## Rate Limiting

- **Limit**: 100 requests per minute per IP address
- **Headers**: Rate limit info included in response headers
- **Exceeded**: Returns `429 Too Many Requests`

## Endpoints

### 1. Query Matches

Query tournament matches by round, player, or archetype.

**Endpoint:** `GET /api/matches`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `round` | number | No | Round number (1-20) |
| `player` | string | No | Player name (partial match) |
| `archetype` | string | No | Deck archetype (partial match) |
| `limit` | number | No | Max results (1-1000, default: 100) |

**Examples:**

```bash
# Get all matches from round 5
curl "http://localhost:3000/api/matches?round=5&limit=10"

# Find matches for a player
curl "http://localhost:3000/api/matches?player=Gabriel%20Nicholas"

# Find matches with Izzet decks
curl "http://localhost:3000/api/matches?archetype=Izzet&limit=20"

# Combined filters
curl "http://localhost:3000/api/matches?round=8&archetype=Control"
```

**Response:**

```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "TableNumber": 1,
      "ResultString": "Player A won 2-1-0",
      "Competitors": [...]
    }
  ]
}
```

---

### 2. Query Decks

Query complete deck lists by player or archetype.

**Endpoint:** `GET /api/decks`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `player` | string | No | Player name (partial match) |
| `archetype` | string | No | Deck archetype (partial match) |
| `limit` | number | No | Max results (1-1000, default: 100) |

**Examples:**

```bash
# Get all Izzet decks
curl "http://localhost:3000/api/decks?archetype=Izzet"

# Get a specific player's deck
curl "http://localhost:3000/api/decks?player=Gabriel%20Nicholas"

# Get first 10 decks
curl "http://localhost:3000/api/decks?limit=10"
```

**Response:**

```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "playerName": "Gabriel Nicholas",
      "archetype": "Izzet Blink",
      "mainDeck": [
        { "quantity": 4, "name": "Quantum Riddler" }
      ],
      "sideboard": [
        { "quantity": 2, "name": "Negate" }
      ]
    }
  ]
}
```

---

### 3. Query Stats

Get archetype statistics including win rates and matchup data.

**Endpoint:** `GET /api/stats`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `archetype` | string | No | Specific archetype (returns all if omitted) |

**Examples:**

```bash
# Get all archetype statistics
curl "http://localhost:3000/api/stats"

# Get specific archetype stats
curl "http://localhost:3000/api/stats?archetype=Azorius%20Control"
```

**Response (specific archetype):**

```json
{
  "success": true,
  "data": {
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
        }
      }
    }
  }
}
```

**Response (all archetypes):**

```json
{
  "success": true,
  "data": {
    "archetypes": {
      "Azorius Control": { ... },
      "Bant Rhythm": { ... }
    }
  }
}
```

---

### 4. Query Player Deck

Get a specific player's complete information including deck, archetype, and match history.

**Endpoint:** `GET /api/players/:player/deck`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `player` | string | Yes | Player name (exact or partial match) |

**Examples:**

```bash
# Get player information
curl "http://localhost:3000/api/players/Gabriel%20Nicholas/deck"

# Partial name match
curl "http://localhost:3000/api/players/gabriel/deck"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "playerName": "Gabriel Nicholas",
    "archetype": "Izzet Blink",
    "deckList": {
      "playerName": "Gabriel Nicholas",
      "archetype": "Izzet Blink",
      "mainDeck": [...],
      "sideboard": [...]
    },
    "matches": [...],
    "matchCount": 10
  }
}
```

**Error Response (404):**

```json
{
  "success": false,
  "error": "Player not found"
}
```

---

### 5. List Archetypes

List all deck archetypes with play counts and win rates.

**Endpoint:** `GET /api/archetypes`

**Parameters:** None

**Examples:**

```bash
# Get all archetypes
curl "http://localhost:3000/api/archetypes"
```

**Response:**

```json
{
  "success": true,
  "count": 43,
  "data": [
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
    }
  ]
}
```

---

### 6. Get Tournament Info

Get tournament metadata and summary statistics.

**Endpoint:** `GET /api/tournament`

**Parameters:** None

**Examples:**

```bash
# Get tournament information
curl "http://localhost:3000/api/tournament"
```

**Response:**

```json
{
  "success": true,
  "data": {
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
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

## Security

- **Input Validation**: All parameters validated and sanitized
- **Rate Limiting**: 100 requests/minute per IP
- **Request Size Limit**: 1KB maximum
- **CORS**: Enabled for all origins (GET only)
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, CSP

## CORS

CORS is enabled for all origins with the following configuration:
- **Allowed Origins**: `*` (all)
- **Allowed Methods**: GET, POST, OPTIONS
- **Credentials**: Not allowed

## Integration Examples

### JavaScript/TypeScript

```typescript
// Fetch matches for a player
const response = await fetch('http://localhost:3000/api/matches?player=Gabriel&limit=10');
const data = await response.json();

if (data.success) {
  console.log(`Found ${data.count} matches`);
  data.data.forEach(match => {
    console.log(match.ResultString);
  });
}
```

### Python

```python
import requests

# Get all archetypes
response = requests.get('http://localhost:3000/api/archetypes')
data = response.json()

if data['success']:
    for archetype in data['data']:
        print(f"{archetype['name']}: {archetype['winRate']:.1f}% win rate")
```

### cURL

```bash
# Query with multiple parameters
curl -G "http://localhost:3000/api/matches" \
  --data-urlencode "player=Gabriel Nicholas" \
  --data-urlencode "limit=5"
```

## ChatGPT Integration

To use with ChatGPT Custom GPTs:

1. Deploy the server to a public URL
2. Create a Custom GPT
3. Add Actions using the OpenAPI spec (see `openapi.json`)
4. Set the server URL
5. Test the integration

Example Action configuration:
```json
{
  "servers": [
    {
      "url": "https://your-domain.com/api"
    }
  ]
}
```
