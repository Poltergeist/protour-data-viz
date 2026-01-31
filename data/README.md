# Tournament Data

This directory contains scraped tournament data in JSON format.

## Structure

Data files will be organized as:

```
data/
├── tournament-394299.json    # Main tournament data
├── matches/                  # Match results by round
├── decks/                    # Deck lists
└── players/                  # Player information
```

*This directory structure may evolve as the scraper is developed.*

## Git

Add `.gitignore` rules if data files should not be committed (e.g., for large datasets).
For this project, data files are likely small enough to commit.
