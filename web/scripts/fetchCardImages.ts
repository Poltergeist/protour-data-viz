import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ScryfallCard {
  name: string;
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

interface CollectionRequest {
  identifiers: Array<{ name: string }>;
}

// Sleep utility for rate limiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Chunk array into smaller arrays
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function fetchCardBatch(cardNames: string[]): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  
  try {
    // For double-faced cards (with //), we need to use just the front face name
    const identifiers = cardNames.map(name => {
      // If card has //, use only the front face
      if (name.includes(' // ')) {
        const frontFace = name.split(' // ')[0].trim();
        return { name: frontFace };
      }
      return { name };
    });

    const requestBody: CollectionRequest = { identifiers };

    console.log(`Fetching batch of ${cardNames.length} cards...`);
    const response = await fetch('https://api.scryfall.com/cards/collection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      console.error(`Batch request failed: ${response.status}`);
      // Fall back to marking all as null
      cardNames.forEach(name => results.set(name, null));
      return results;
    }

    const data = await response.json();
    
    if (data.data) {
      data.data.forEach((card: ScryfallCard, index: number) => {
        // Map back to original card name
        const originalName = cardNames[index];
        let imageUrl: string | null = null;
        
        // Get image URL (handle double-faced cards)
        if (card.image_uris) {
          imageUrl = card.image_uris.normal;
        } else if (card.card_faces && card.card_faces[0]?.image_uris) {
          imageUrl = card.card_faces[0].image_uris.normal;
        }
        
        results.set(originalName, imageUrl);
      });
    }

    // Handle not found cards
    if (data.not_found) {
      data.not_found.forEach((item: any, index: number) => {
        const originalName = cardNames[index];
        if (!results.has(originalName)) {
          console.warn(`Card not found: ${originalName}`);
          results.set(originalName, null);
        }
      });
    }

    // Mark any remaining cards as not found
    cardNames.forEach(name => {
      if (!results.has(name)) {
        results.set(name, null);
      }
    });

    return results;
  } catch (err) {
    console.error(`Error fetching batch:`, err);
    cardNames.forEach(name => results.set(name, null));
    return results;
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

  const sortedCards = Array.from(cardNames).sort();
  console.log(`Found ${sortedCards.length} unique cards to fetch`);

  // Chunk into batches of 75 (Scryfall's collection endpoint limit)
  const batches = chunk(sortedCards, 75);
  console.log(`Split into ${batches.length} batches\n`);

  const cache: CardImageCache = {};
  let processedCount = 0;

  // Fetch batches with rate limiting (100ms between requests)
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const results = await fetchCardBatch(batch);
    
    results.forEach((imageUrl, cardName) => {
      cache[cardName] = imageUrl;
    });

    processedCount += batch.length;
    console.log(`Progress: ${processedCount}/${sortedCards.length} (batch ${i + 1}/${batches.length})\n`);
    
    // Rate limit: Wait 100ms between requests
    if (i < batches.length - 1) {
      await sleep(100);
    }
  }

  // Save cache to public directory
  const cachePath = path.join(__dirname, '../public/card-images.json');
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  
  const successCount = Object.values(cache).filter(url => url !== null).length;
  const failCount = Object.values(cache).filter(url => url === null).length;
  
  console.log(`✓ Successfully cached ${successCount} card images`);
  if (failCount > 0) {
    console.log(`⚠ Failed to fetch ${failCount} cards`);
  }
  console.log(`  Cache file: ${cachePath}`);
}

main().catch(console.error);
