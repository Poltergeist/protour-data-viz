import type { DeckInfo, CardInfo } from '../types/tournament';

export function formatDeckForArena(deck: DeckInfo): string {
  const lines: string[] = [];
  
  // Add deck metadata as comment
  lines.push(`Deck`);
  
  // Main deck
  deck.mainDeck.forEach(card => {
    lines.push(`${card.quantity} ${card.name}`);
  });
  
  // Sideboard separator
  if (deck.sideboard.length > 0) {
    lines.push('');
    lines.push('Sideboard');
    deck.sideboard.forEach(card => {
      lines.push(`${card.quantity} ${card.name}`);
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
