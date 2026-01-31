import React, { useMemo, useState } from 'react';
import type { ArchetypeStats } from '../types/tournament';

interface MatchupTableProps {
  stats: { [archetype: string]: ArchetypeStats };
  topN?: number;
}

const MatchupTable: React.FC<MatchupTableProps> = ({ stats, topN = 10 }) => {
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);

  const topArchetypes = useMemo(() => {
    const sorted = Object.values(stats)
      .sort((a, b) => {
        // Sort by win rate first (descending), then by wins (descending)
        if (b.winRate !== a.winRate) {
          return b.winRate - a.winRate;
        }
        return b.wins - a.wins;
      })
      .slice(0, topN);
    
    // If an archetype is selected, move it to the top
    if (selectedArchetype) {
      const selectedIndex = sorted.findIndex(arch => arch.archetype === selectedArchetype);
      if (selectedIndex > 0) {
        const selected = sorted.splice(selectedIndex, 1)[0];
        sorted.unshift(selected);
      }
    }
    
    return sorted;
  }, [stats, topN, selectedArchetype]);

  const getMatchupColor = (percentage: number, totalGames: number) => {
    if (totalGames === 0) return '#393940'; // No data
    // Color based on win percentage, regardless of sample size
    if (percentage >= 60) return '#1a4d1a'; // Strong favorable
    if (percentage >= 55) return '#2d4a2d'; // Favorable
    if (percentage >= 45) return '#4a4a2d'; // Even
    if (percentage >= 40) return '#4a2d2d'; // Unfavorable
    return '#4d1a1a'; // Very unfavorable
  };

  const getMatchupDisplay = (archetype: ArchetypeStats, opponent: string) => {
    const matchup = archetype.matchups[opponent];
    if (!matchup) return { text: '-', color: '#393940', totalGames: 0 };
    
    const total = matchup.wins + matchup.losses + matchup.draws;
    if (total === 0) {
      return { text: '-', color: '#393940', totalGames: 0, ...matchup };
    }
    
    const percentage = Math.round(matchup.percentage);
    const record = matchup.draws > 0 
      ? `${matchup.wins}-${matchup.losses}-${matchup.draws}`
      : `${matchup.wins}-${matchup.losses}`;
    const text = `${percentage}%\n${record}`;
    const color = getMatchupColor(matchup.percentage, total);
    
    return { text, color, totalGames: total, ...matchup };
  };

  return (
    <div className="matchup-table-container">
      <h3>Matchup Matrix (Top {topN} Archetypes)</h3>
      <p className="table-hint">Click a row to see detailed matchups. Green = favorable, Red = unfavorable</p>
      
      <div className="table-wrapper">
        <table className="matchup-table">
          <thead>
            <tr>
              <th className="archetype-header">Archetype</th>
              <th className="record-header">Record</th>
              {topArchetypes.map(arch => (
                <th key={arch.archetype} className="opponent-header">
                  <div className="vertical-text">{arch.archetype}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topArchetypes.map(archetype => (
              <tr 
                key={archetype.archetype}
                className={selectedArchetype === archetype.archetype ? 'selected' : ''}
                onClick={() => setSelectedArchetype(
                  selectedArchetype === archetype.archetype ? null : archetype.archetype
                )}
              >
                <td className="archetype-cell">{archetype.archetype}</td>
                <td className="record-cell">
                  {archetype.wins}-{archetype.losses}-{archetype.draws}
                  <span className="winrate"> ({Math.round(archetype.winRate)}%)</span>
                </td>
                {topArchetypes.map(opponent => {
                  const matchup = getMatchupDisplay(archetype, opponent.archetype);
                  return (
                    <td 
                      key={opponent.archetype}
                      className="matchup-cell"
                      style={{ backgroundColor: matchup.color }}
                      title={matchup.totalGames > 0 
                        ? `${archetype.archetype} vs ${opponent.archetype}: ${matchup.wins}-${matchup.losses}-${matchup.draws} (${matchup.totalGames} games)`
                        : 'No data'
                      }
                    >
                      <div style={{ whiteSpace: 'pre-line', lineHeight: '1.2' }}>
                        {matchup.text}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {selectedArchetype && (
        <div className="matchup-details">
          <h4>Detailed Matchups: {selectedArchetype}</h4>
          <div className="matchup-list">
            {Object.entries(stats[selectedArchetype].matchups)
              .filter(([_, m]) => m.wins + m.losses + m.draws > 0)
              .sort((a, b) => b[1].percentage - a[1].percentage)
              .map(([opp, matchup]) => (
                <div key={opp} className="matchup-item">
                  <span className="matchup-opponent">vs {opp}</span>
                  <span className="matchup-record">
                    {matchup.wins}-{matchup.losses}-{matchup.draws}
                  </span>
                  <span 
                    className="matchup-percentage"
                    style={{ 
                      color: matchup.percentage >= 50 ? '#00ff00' : '#ff4444' 
                    }}
                  >
                    {Math.round(matchup.percentage)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchupTable;
