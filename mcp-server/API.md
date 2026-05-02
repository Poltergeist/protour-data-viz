# REST API Documentation

Complete reference for the ProTour Data REST API.

## Breaking change in v0.2.0

Tournament ID is now mandatory in the URL path for all data endpoints. The flat shape (`/api/matches`, `/api/decks`, etc.) has been removed. Use `GET /api/tournaments` to discover available tournaments.

| Old (v0.1.0) | New (v0.2.0) |
|---|---|
| `GET /api/matches` | `GET /api/tournaments/:id/matches` |
| `GET /api/decks` | `GET /api/tournaments/:id/decks` |
| `GET /api/stats` | `GET /api/tournaments/:id/stats` |
| `GET /api/archetypes` | `GET /api/tournaments/:id/archetypes` |
| `GET /api/tournament` | `GET /api/tournaments/:id` |
| `GET /api/players/:p/deck` | `GET /api/tournaments/:id/players/:p/deck` |
| `GET /api/players/:p/stats` | `GET /api/tournaments/:id/players/:p/stats` |
| `GET /api/cards/:c` | `GET /api/tournaments/:id/cards/:c` |
| _(new)_ | `GET /api/tournaments` |

## Base URL

```
http://localhost:3000/api
```

## Discovery

Start by listing tournaments:

```bash
curl http://localhost:3000/api/tournaments
```

Then query a specific tournament's data:

```bash
curl http://localhost:3000/api/tournaments/394299/stats
```

## Response Format

All endpoints return JSON with a consistent structure:

**Success Response:**
```json
{
  "success": true,
  "count": 10,
  "data": { ... }
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
- **Headers**: Rate limit info in response headers
- **Exceeded**: Returns `429 Too Many Requests`

## Endpoints

### List Tournaments

Returns the registry: id, slug, name, format, date, completion status for each tournament.

**Endpoint:** `GET /api/tournaments`

```bash
curl "http://localhost:3000/api/tournaments"
```

```json
{
  "success": true,
  "count": 2,
  "data": [
    { "id": "415628", "slug": "secrets-of-strixhaven", "name": "Pro Tour Secrets of Strixhaven", "format": "Standard", "date": "2026-05-01", "completed": false },
    { "id": "394299", "slug": "lorwyn-eclipsed", "name": "Pro Tour Lorwyn Eclipsed", "format": "Standard", "date": "2026-01-31", "completed": true }
  ]
}
```

### Tournament Metadata

**Endpoint:** `GET /api/tournaments/:id`

```bash
curl "http://localhost:3000/api/tournaments/394299"
```

Returns tournament metadata plus summary statistics (player count, archetype count, round count, etc.).

### Query Matches

Query tournament matches by round, player, or archetype.

**Endpoint:** `GET /api/tournaments/:id/matches`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `round` | number | No | Round number (1-20) |
| `player` | string | No | Player name (partial match) |
| `archetype` | string | No | Deck archetype (partial match) |
| `limit` | number | No | Max results (1-1000, default: 100) |

```bash
curl "http://localhost:3000/api/tournaments/394299/matches?round=5&limit=10"
curl "http://localhost:3000/api/tournaments/394299/matches?player=Gabriel%20Nicholas"
curl "http://localhost:3000/api/tournaments/394299/matches?archetype=Izzet&limit=20"
```

### Query Decks

**Endpoint:** `GET /api/tournaments/:id/decks`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `player` | string | No | Player name (partial match) |
| `archetype` | string | No | Deck archetype (partial match) |
| `limit` | number | No | Max results (1-1000, default: 100) |

```bash
curl "http://localhost:3000/api/tournaments/394299/decks?archetype=Izzet"
curl "http://localhost:3000/api/tournaments/394299/decks?player=Gabriel%20Nicholas"
```

### Query Stats

**Endpoint:** `GET /api/tournaments/:id/stats`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `archetype` | string | No | Specific archetype (returns all if omitted) |

```bash
curl "http://localhost:3000/api/tournaments/394299/stats"
curl "http://localhost:3000/api/tournaments/394299/stats?archetype=Azorius%20Control"
```

### List Archetypes

**Endpoint:** `GET /api/tournaments/:id/archetypes`

```bash
curl "http://localhost:3000/api/tournaments/394299/archetypes"
```

### Player Deck and History

**Endpoint:** `GET /api/tournaments/:id/players/:player/deck`

```bash
curl "http://localhost:3000/api/tournaments/394299/players/Gabriel%20Nicholas/deck"
```

### Player Stats

**Endpoint:** `GET /api/tournaments/:id/players/:player/stats`

```bash
curl "http://localhost:3000/api/tournaments/394299/players/Gabriel%20Nicholas/stats"
```

### Decks Containing a Card

**Endpoint:** `GET /api/tournaments/:id/cards/:card`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | No | Max decks returned (1-1000, default: 100) |

```bash
curl "http://localhost:3000/api/tournaments/394299/cards/Lightning%20Bolt"
```

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request — Invalid parameters |
| 404 | Not Found — Resource or tournament doesn't exist |
| 429 | Too Many Requests — Rate limit exceeded |
| 500 | Internal Server Error |

Unknown tournament IDs return 404 with a clear error message.

## Security

- **Input validation**: All parameters validated against Zod schemas
- **Allowlist**: Data files are only accessible for registered tournaments (`data/tournaments.json`)
- **Rate limiting**: 100 requests/minute per IP
- **Request size limit**: 1 KB max body
- **Security headers**: `X-Content-Type-Options`, `X-Frame-Options`, CSP
- **CORS**: Enabled for all origins (GET only)

## Integration Examples

### JavaScript/TypeScript

```typescript
// Discover tournaments
const tlist = await fetch('http://localhost:3000/api/tournaments').then(r => r.json());
const tid = tlist.data[0].id;

// Query against a specific tournament
const matches = await fetch(`http://localhost:3000/api/tournaments/${tid}/matches?player=Gabriel&limit=10`).then(r => r.json());
console.log(`Found ${matches.count} matches`);
```

### Python

```python
import requests

tlist = requests.get('http://localhost:3000/api/tournaments').json()
tid = tlist['data'][0]['id']

archetypes = requests.get(f'http://localhost:3000/api/tournaments/{tid}/archetypes').json()
for archetype in archetypes['data']:
    print(f"{archetype['name']}: {archetype['winRate']:.1f}% win rate")
```

### cURL

```bash
curl -G "http://localhost:3000/api/tournaments/394299/matches" \
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

If you previously imported a v0.1.0 spec, you must re-import — endpoint shapes have changed.
