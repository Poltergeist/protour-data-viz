import type { DeckInfo, CardInfo } from '../types/tournament';

function cleanCardName(cardName: string): string {
  // For double-sided cards, only use the name before the //
  const doubleSidedSplit = cardName.indexOf('//');
  if (doubleSidedSplit !== -1) {
    return cardName.substring(0, doubleSidedSplit).trim();
  }
  return cardName;
}

export function formatDeckForArena(deck: DeckInfo): string {
  const lines: string[] = [];
  
  // Add About section with tournament, archetype, and player name
  lines.push('About');
  lines.push('Name PT - ' + deck.archetype + ' - ' + deck.playerName);
  lines.push('');
  
  // Main deck section
  lines.push('Deck');
  deck.mainDeck.forEach(card => {
    lines.push(`${card.quantity} ${cleanCardName(card.name)}`);
  });
  
  // Sideboard separator
  if (deck.sideboard.length > 0) {
    lines.push('');
    lines.push('Sideboard');
    deck.sideboard.forEach(card => {
      lines.push(`${card.quantity} ${cleanCardName(card.name)}`);
    });
  }
  
  return lines.join('\n');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}
