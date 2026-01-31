import React, { useState, useMemo } from 'react';
import type { DeckInfo } from '../types/tournament';

interface DeckListViewerProps {
  decklists: DeckInfo[];
}

const DeckListViewer: React.FC<DeckListViewerProps> = ({ decklists }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArchetype, setSelectedArchetype] = useState<string>('all');
  const [expandedDeck, setExpandedDeck] = useState<string | null>(null);

  const archetypes = useMemo(() => {
    const archs = new Set(decklists.map(d => d.archetype));
    return ['all', ...Array.from(archs).sort()];
  }, [decklists]);

  const filteredDecks = useMemo(() => {
    return decklists.filter(deck => {
      const matchesSearch = searchTerm === '' || 
        deck.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deck.archetype.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesArchetype = selectedArchetype === 'all' || 
        deck.archetype === selectedArchetype;
      
      return matchesSearch && matchesArchetype;
    });
  }, [decklists, searchTerm, selectedArchetype]);

  const archetypeCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    decklists.forEach(deck => {
      counts[deck.archetype] = (counts[deck.archetype] || 0) + 1;
    });
    return counts;
  }, [decklists]);

  const toggleDeck = (playerName: string) => {
    setExpandedDeck(expandedDeck === playerName ? null : playerName);
  };

  const groupCards = (cards: { quantity: number; name: string }[]) => {
    // Group cards by quantity for better readability
    const sorted = [...cards].sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
    return sorted;
  };

  return (
    <div className="decklist-viewer">
      <div className="controls">
        <input
          type="text"
          placeholder="Search by player or archetype..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        
        <select
          value={selectedArchetype}
          onChange={(e) => setSelectedArchetype(e.target.value)}
          className="archetype-filter"
        >
          <option value="all">All Archetypes ({decklists.length})</option>
          {archetypes.filter(a => a !== 'all').map(arch => (
            <option key={arch} value={arch}>
              {arch} ({archetypeCounts[arch]})
            </option>
          ))}
        </select>
      </div>

      <div className="results-info">
        Showing {filteredDecks.length} of {decklists.length} decklists
      </div>

      <div className="decklist-grid">
        {filteredDecks.map(deck => (
          <div key={deck.playerName} className="deck-card">
            <div 
              className="deck-header"
              onClick={() => toggleDeck(deck.playerName)}
            >
              <div className="deck-info">
                <h4>{deck.playerName}</h4>
                <p className="archetype-badge">{deck.archetype}</p>
              </div>
              <div className="deck-counts">
                <span className="count main">{deck.mainDeck.reduce((sum, c) => sum + c.quantity, 0)} Main</span>
                <span className="count side">{deck.sideboard.reduce((sum, c) => sum + c.quantity, 0)} Side</span>
                <button className="expand-btn">
                  {expandedDeck === deck.playerName ? '▼' : '▶'}
                </button>
              </div>
            </div>

            {expandedDeck === deck.playerName && (
              <div className="deck-content">
                <div className="deck-section">
                  <h5>Main Deck ({deck.mainDeck.reduce((sum, c) => sum + c.quantity, 0)})</h5>
                  <ul className="card-list">
                    {groupCards(deck.mainDeck).map((card, idx) => (
                      <li key={idx}>
                        <span className="quantity">{card.quantity}</span>
                        <span className="card-name">{card.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="deck-section">
                  <h5>Sideboard ({deck.sideboard.reduce((sum, c) => sum + c.quantity, 0)})</h5>
                  <ul className="card-list">
                    {groupCards(deck.sideboard).map((card, idx) => (
                      <li key={idx}>
                        <span className="quantity">{card.quantity}</span>
                        <span className="card-name">{card.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredDecks.length === 0 && (
        <div className="no-results">
          <p>No decklists found matching your search.</p>
        </div>
      )}
    </div>
  );
};

export default DeckListViewer;
