import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { ArchetypeStats } from '../types/tournament';

interface WinRateChartProps {
  stats: { [archetype: string]: ArchetypeStats };
  minGames?: number;
}

const WinRateChart: React.FC<WinRateChartProps> = ({ stats, minGames = 5 }) => {
  const chartData = useMemo(() => {
    return Object.values(stats)
      .filter(s => (s.wins + s.losses + s.draws) >= minGames)
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 20) // Top 20 archetypes
      .map(s => ({
        archetype: s.archetype,
        winRate: Math.round(s.winRate * 10) / 10,
        wins: s.wins,
        losses: s.losses,
        draws: s.draws,
        totalGames: s.wins + s.losses + s.draws
      }));
  }, [stats, minGames]);

  const getBarColor = (winRate: number) => {
    if (winRate >= 65) return '#00ff00';
    if (winRate >= 55) return '#90ee90';
    if (winRate >= 45) return '#ffa500';
    return '#ff4444';
  };

  return (
    <div className="chart-container">
      <h3>Win Rates by Archetype (Min. {minGames} Games)</h3>
      <ResponsiveContainer width="100%" height={500}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 150, right: 30, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#393940" />
          <XAxis type="number" domain={[0, 100]} stroke="#858585" />
          <YAxis 
            type="category" 
            dataKey="archetype" 
            stroke="#858585"
            width={140}
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1a1a1e', 
              border: '1px solid #393940',
              borderRadius: '4px',
              color: '#ffffff'
            }}
            labelStyle={{
              color: '#ffffff',
              fontWeight: 600,
              marginBottom: '8px'
            }}
            formatter={(value: number, name: string, props: any) => {
              if (name === 'winRate') {
                return [
                  `${value}% (${props.payload.wins}-${props.payload.losses}-${props.payload.draws})`,
                  'Win Rate'
                ];
              }
              return [value, name];
            }}
          />
          <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.winRate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WinRateChart;
