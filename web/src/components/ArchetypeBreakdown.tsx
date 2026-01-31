import React, { useMemo } from 'react';
import type { DeckInfo } from '../types/tournament';
import CardImage from './CardImage';

interface CardBreakdown {
  name: string;
  totalCopies: number;
  decksPlaying: number;
  avgCopies: number;
  minCopies: number;
  maxCopies: number;
  percentPlaying: number;
}

interface ArchetypeBreakdownProps {
  archetypeName: string;
  decklists: DeckInfo[];
}

const ArchetypeBreakdown: React.FC<ArchetypeBreakdownProps> = ({ archetypeName, decklists }) => {
  const archetypeDecks = useMemo(() => {
    return decklists.filter(d => d.archetype === archetypeName);
  }, [decklists, archetypeName]);

  const mainboardBreakdown = useMemo(() => {
    const cardMap = new Map<string, { copies: number[]; decksCount: number }>();
    
    archetypeDecks.forEach(deck => {
      const seen = new Set<string>();
      deck.mainDeck.forEach(card => {
        if (!cardMap.has(card.name)) {
          cardMap.set(card.name, { copies: [], decksCount: 0 });
        }
        const data = cardMap.get(card.name)!;
        data.copies.push(card.quantity);
        if (!seen.has(card.name)) {
          data.decksCount++;
          seen.add(card.name);
        }
      });
    });

    const breakdown: CardBreakdown[] = [];
    cardMap.forEach((data, name) => {
      const totalCopies = data.copies.reduce((sum, q) => sum + q, 0);
      breakdown.push({
        name,
        totalCopies,
        decksPlaying: data.decksCount,
        avgCopies: totalCopies / data.decksCount,
        minCopies: Math.min(...data.copies),
        maxCopies: Math.max(...data.copies),
        percentPlaying: (data.decksCount / archetypeDecks.length) * 100
      });
    });

    return breakdown.sort((a, b) => b.percentPlaying - a.percentPlaying || b.avgCopies - a.avgCopies);
  }, [archetypeDecks]);

  const sideboardBreakdown = useMemo(() => {
    const cardMap = new Map<string, { copies: number[]; decksCount: number }>();
    
    archetypeDecks.forEach(deck => {
      const seen = new Set<string>();
      deck.sideboard.forEach(card => {
        if (!cardMap.has(card.name)) {
          cardMap.set(card.name, { copies: [], decksCount: 0 });
        }
        const data = cardMap.get(card.name)!;
        data.copies.push(card.quantity);
        if (!seen.has(card.name)) {
          data.decksCount++;
          seen.add(card.name);
        }
      });
    });

    const breakdown: CardBreakdown[] = [];
    cardMap.forEach((data, name) => {
      const totalCopies = data.copies.reduce((sum, q) => sum + q, 0);
      breakdown.push({
        name,
        totalCopies,
        decksPlaying: data.decksCount,
        avgCopies: totalCopies / data.decksCount,
        minCopies: Math.min(...data.copies),
        maxCopies: Math.max(...data.copies),
        percentPlaying: (data.decksCount / archetypeDecks.length) * 100
      });
    });

    return breakdown.sort((a, b) => b.percentPlaying - a.percentPlaying || b.avgCopies - a.avgCopies);
  }, [archetypeDecks]);

  if (archetypeDecks.length === 0) {
    return (
      <div className="breakdown-empty">
        <p>No decklists found for {archetypeName}</p>
      </div>
    );
  }

  return (
    <div className="archetype-breakdown">
      <div className="breakdown-header">
        <h3>{archetypeName}</h3>
        <p className="deck-count">{archetypeDecks.length} {archetypeDecks.length === 1 ? 'deck' : 'decks'}</p>
      </div>

      <div className="breakdown-section">
        <h4>Mainboard ({mainboardBreakdown.length} unique cards)</h4>
        <table className="breakdown-table">
          <thead>
            <tr>
              <th className="card-name-col">Card Name</th>
              <th className="number-col">Decks</th>
              <th className="number-col">%</th>
              <th className="number-col">Avg</th>
              <th className="number-col">Min-Max</th>
            </tr>
          </thead>
          <tbody>
            {mainboardBreakdown.map((card) => (
              <tr key={card.name} className={card.percentPlaying >= 90 ? 'staple' : ''}>
                <td className="card-name">
                  <CardImage cardName={card.name} />
                </td>
                <td className="number">{card.decksPlaying}/{archetypeDecks.length}</td>
                <td className="number">{card.percentPlaying.toFixed(0)}%</td>
                <td className="number">{card.avgCopies.toFixed(1)}</td>
                <td className="number">{card.minCopies}-{card.maxCopies}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="breakdown-section">
        <h4>Sideboard ({sideboardBreakdown.length} unique cards)</h4>
        <table className="breakdown-table">
          <thead>
            <tr>
              <th className="card-name-col">Card Name</th>
              <th className="number-col">Decks</th>
              <th className="number-col">%</th>
              <th className="number-col">Avg</th>
              <th className="number-col">Min-Max</th>
            </tr>
          </thead>
          <tbody>
            {sideboardBreakdown.map((card) => (
              <tr key={card.name} className={card.percentPlaying >= 90 ? 'staple' : ''}>
                <td className="card-name">
                  <CardImage cardName={card.name} />
                </td>
                <td className="number">{card.decksPlaying}/{archetypeDecks.length}</td>
                <td className="number">{card.percentPlaying.toFixed(0)}%</td>
                <td className="number">{card.avgCopies.toFixed(1)}</td>
                <td className="number">{card.minCopies}-{card.maxCopies}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ArchetypeBreakdown;
