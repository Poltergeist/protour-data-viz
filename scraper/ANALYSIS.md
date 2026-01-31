# Page Structure Analysis - melee.gg Tournament 394299

## Findings

### Page Architecture
- **Dynamic Content**: Site uses JavaScript to load round data dynamically
- **Templating**: Uses Mustache.js templates for rendering matches/players
- **API Protection**: Direct API endpoints are protected (403 Forbidden)

### Round Structure
- Rounds are accessible via buttons with `data-id` attributes:
  - Round 1: `data-id="1384568"`
  - Round 2: `data-id="1384570"`
  - Round 3: `data-id="1384572"`
  - Round 4: `data-id="1384574"` ⭐ (Start of Standard)
  - Round 5: `data-id="1384575"`
  - Round 6: `data-id="1384576"`
  - Round 7: `data-id="1384577"`
  - Round 8: `data-id="1384578"` ⭐ (End of Day 1 Standard)

### API Endpoints (Identified but Protected)
- `/Match/GetRoundMatches/{roundId}` - Returns match pairings
- `/Standing/GetRoundStandings/{roundId}` - Returns standings after round

### Data Templates
- Player links: `/Profile/Index/{Username}`
- Decklist links: `/Decklist/View/{DecklistId}`

## Approach Decision

**✅ CHOSEN: Direct API Access**
- Successfully accessed Match API with DataTables POST parameters
- No browser automation needed!
- Much simpler and faster implementation

**API Endpoint Discovered:**
```bash
POST /Match/GetRoundMatches/{roundId}
Content-Type: application/x-www-form-urlencoded

# Required Parameters:
draw=1
columns[0][data]=TableNumber
columns[0][searchable]=true
columns[0][orderable]=true
order[0][column]=0
order[0][dir]=asc
start=0
length=200
```

**Response includes:**
- Player names
- Match results (e.g., "Player won 2-0-0")
- Table numbers
- 152 matches in Round 4

**Still TODO:**
- Find deck list data source (player profiles, standings API, or separate endpoint)
- Extract archetype names

## CSS Selectors (for future reference)

```
Standings Section: #standings
Pairings Section: #pairings  
Round Buttons: button.round-selector[data-id="..."]
Player Links: a[href^="/Profile/Index/"]
Decklist Links: a[href^="/Decklist/View/"]
```
