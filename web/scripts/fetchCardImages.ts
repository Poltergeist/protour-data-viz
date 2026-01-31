import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ScryfallCard {
  image_uris?: {
    normal: string;
    large: string;
  };
  card_faces?: Array<{
    image_uris?: {
      normal: string;
      large: string;
    };
  }>;
}

interface CardImageCache {
  [cardName: string]: string | null;
}

// Sleep utility for rate limiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchCardImage(cardName: string): Promise<string | null> {
  try {
    console.log(`Fetching: ${cardName}`);
    const response = await fetch(
      `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`
    );
    
    if (!response.ok) {
      console.warn(`Card not found: ${cardName}`);
      return null;
    }

    const data: ScryfallCard = await response.json();
    
    // Get image URL (handle double-faced cards)
    if (data.image_uris) {
      return data.image_uris.normal;
    } else if (data.card_faces && data.card_faces[0]?.image_uris) {
      return data.card_faces[0].image_uris.normal;
    }
    
    return null;
  } catch (err) {
    console.error(`Error fetching ${cardName}:`, err);
    return null;
  }
}

async function main() {
  // Load decklists
  const decklistsPath = path.join(__dirname, '../../data/tournament-394299-decklists.json');
  const decklists = JSON.parse(fs.readFileSync(decklistsPath, 'utf-8'));

  // Collect all unique card names
  const cardNames = new Set<string>();
  decklists.forEach((deck: any) => {
    deck.mainDeck.forEach((card: any) => cardNames.add(card.name));
    deck.sideboard.forEach((card: any) => cardNames.add(card.name));
  });

  console.log(`Found ${cardNames.size} unique cards to fetch`);

  const cache: CardImageCache = {};
  let count = 0;

  // Fetch images with rate limiting (100ms between requests to respect Scryfall's rate limit)
  for (const cardName of Array.from(cardNames).sort()) {
    const imageUrl = await fetchCardImage(cardName);
    cache[cardName] = imageUrl;
    count++;
    
    if (count % 10 === 0) {
      console.log(`Progress: ${count}/${cardNames.size}`);
    }
    
    // Rate limit: Scryfall allows 10 requests per second
    await sleep(100);
  }

  // Save cache to public directory
  const cachePath = path.join(__dirname, '../public/card-images.json');
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  
  console.log(`\n✓ Successfully cached ${Object.keys(cache).length} card images`);
  console.log(`  Cache file: ${cachePath}`);
}

main().catch(console.error);
