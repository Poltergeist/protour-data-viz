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

**Option 1**: Browser Automation (Rod/Chromedp)
- ✅ Can execute JavaScript
- ❌ Complex, slower, heavier
- ❌ Browser automation hanging in tests

**Option 2**: Direct API with Authenticated Session
- Needs investigation if we can establish a session

**Option 3**: Alternative Data Source
- Check if data is available from other sources (mtggoldfish, mtgtop8, etc.)

## Recommended Next Steps

1. Test if we can establish an authenticated session to access API endpoints
2. If not, implement browser automation properly with headless mode
3. Alternative: Check if tournament organizers provide data exports

## CSS Selectors (for future reference)

```
Standings Section: #standings
Pairings Section: #pairings  
Round Buttons: button.round-selector[data-id="..."]
Player Links: a[href^="/Profile/Index/"]
Decklist Links: a[href^="/Decklist/View/"]
```
