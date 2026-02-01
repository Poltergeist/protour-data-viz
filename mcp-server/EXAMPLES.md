# Example Prompts and Use Cases

Sample prompts and queries to explore ProTour tournament data with AI assistants.

## Getting Started

### Tournament Overview

```
"What tournament is this data from?"

"How many players participated?"

"What formats were played?"
```

**Expected Response:**
- Tournament name (Pro Tour - Aetherdrift)
- Player count (304)
- Format (Standard)
- Available rounds

---

## Archetype Analysis

### List and Compare Archetypes

```
"List all deck archetypes sorted by win rate"

"What are the top 5 most played archetypes?"

"Compare the win rates of Izzet Spellementals vs Bant Rhythm"

"Which archetypes have the best matchup against Azorius Control?"
```

### Specific Archetype Deep Dive

```
"Tell me about the Izzet Spellementals archetype"

"What's the win rate for Dimir Control?"

"Show me all matchup data for Bant Rhythm"

"How many players brought Sultai Reanimator?"
```

---

## Deck Lists

### Find Specific Decks

```
"Show me Gabriel Nicholas's deck list"

"Get all Izzet Blink deck lists"

"What cards are in the Azorius Control decks?"

"Compare the main decks of all Izzet Spellementals players"
```

### Card Analysis

```
"Which decks play Quantum Riddler?"

"What's the most played card across all decks?"

"Show me all decks with Ral, Crackling Wit"

"What are the common sideboard cards in control decks?"
```

---

## Match Results

### Round Analysis

```
"Show me all matches from round 5"

"What happened in round 8?"

"How did the top tables in round 4 play out?"
```

### Player Performance

```
"How did Gabriel Nicholas perform in the tournament?"

"Show me all of Allen Wu's matches"

"Who did Arne Huschenbeth play against?"

"What was the result of Marco Belacca's matches?"
```

### Archetype Matchups

```
"Show me matches between Izzet and Control decks"

"What were the results of Bant Rhythm vs Simic Rhythm matches?"

"Find all mirror matches in round 7"
```

---

## Statistical Analysis

### Win Rate Analysis

```
"What archetype has the highest win rate?"

"Which archetypes are overperforming vs their play rate?"

"Show me archetypes with at least 10 players and 60%+ win rate"

"What's the win rate of aggro vs control decks?"
```

### Matchup Matrix

```
"Create a matchup table for the top 5 archetypes"

"What are Azorius Control's best and worst matchups?"

"Show me how Izzet decks performed against other archetypes"

"Which archetype beats Bant Rhythm most consistently?"
```

### Meta Analysis

```
"What's the metagame breakdown by archetype count?"

"Which color combinations are most represented?"

"Are there any rogue decks that performed well?"

"What's the diversity of the tournament meta?"
```

---

## Complex Queries

### Multi-Filter Searches

```
"Show me round 5 matches where an Izzet deck won"

"Find all players who played control decks and went undefeated"

"What were the match results between control and aggro in rounds 6-8?"
```

### Data Combination

```
"For each top archetype, show me a sample deck list and its win rate"

"Compare Gabriel Nicholas's deck to other Izzet Blink players"

"Show me the evolution of match results for Bant Rhythm across rounds"
```

### Strategic Questions

```
"What deck would you recommend based on the meta?"

"Which matchups should I prepare for if I'm playing Izzet?"

"What are the key cards in the best-performing decks?"

"How did the meta shift between early and late rounds?"
```

---

## ChatGPT Custom GPT Examples

### Conversational Style

```
User: "Hey, what's the most popular deck?"
GPT: Lists archetypes by count

User: "Interesting! How does Bant Rhythm perform?"
GPT: Shows win rate and matchup data

User: "Can I see a sample deck list?"
GPT: Shows a Bant Rhythm deck

User: "What are its best matchups?"
GPT: Lists favorable matchups with percentages
```

### Analytical Style

```
"Analyze the tournament meta and tell me:
1. Top 3 archetypes by performance
2. Most played archetypes
3. Any underplayed but successful decks
4. Key matchups to prepare for"
```

### Educational Style

```
"I'm new to this format. Explain:
- What are the main deck archetypes?
- What does each archetype try to do?
- Which decks are good for beginners?
- Show me a sample deck from each category"
```

---

## Claude Desktop Examples

### Research Mode

```
"Help me research Izzet Spellementals:
@query_stats archetype: Izzet Spellementals
@query_decks archetype: Izzet Spellementals limit: 3
@query_matches archetype: Izzet round: 8"
```

### Deck Building

```
"I want to build Azorius Control. Show me:
1. Top performing Azorius Control lists
2. Common card choices across lists
3. How the deck performed in the tournament
4. Key matchups to consider"
```

---

## API Integration Examples

### JavaScript

```javascript
// Get tournament overview
const info = await fetch('http://localhost:3000/api/tournament').then(r => r.json());
console.log(`${info.data.name}: ${info.data.stats.totalPlayers} players`);

// Find top archetypes
const archetypes = await fetch('http://localhost:3000/api/archetypes').then(r => r.json());
const top5 = archetypes.data
  .sort((a, b) => b.winRate - a.winRate)
  .slice(0, 5);
console.log('Top 5 archetypes:', top5.map(a => `${a.name} (${a.winRate}%)`));
```

### Python

```python
import requests

# Get player's performance
player = "Gabriel Nicholas"
response = requests.get(f'http://localhost:3000/api/players/{player}/deck')
data = response.json()

print(f"{data['data']['playerName']}:")
print(f"  Archetype: {data['data']['archetype']}")
print(f"  Matches: {data['data']['matchCount']}")
```

---

## Expected Response Formats

### List Results
- Clear numbered/bulleted lists
- Summary statistics (total count, averages)
- Sorted by relevance (win rate, alphabetical, etc.)

### Deck Lists
- Main deck organized by card type
- Sideboard separate
- Total card counts
- Archetype classification

### Match Results
- Round and table number
- Player names and decks
- Match outcome
- Any notable details

### Statistics
- Win/loss/draw records
- Percentages formatted (e.g., "58.8%")
- Matchup breakdowns
- Sample sizes for context

---

## Tips for Better Queries

1. **Be specific** - "Show Izzet Spellementals win rate" vs "How is Izzet doing?"
2. **Use filters** - Limit results, specify rounds, name players
3. **Ask follow-ups** - Build on previous queries
4. **Combine data** - Ask for correlations and comparisons
5. **Request summaries** - Ask AI to synthesize multiple queries
