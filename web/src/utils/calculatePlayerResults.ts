import type { MatchData } from '../types/tournament';

export interface PlayerResult {
  playerName: string;
  wins: number;
  losses: number;
  draws: number;
  matchWins: number;
  matchLosses: number;
  matchDraws: number;
}

export function calculatePlayerResults(matchData: MatchData): Map<string, PlayerResult> {
  const results = new Map<string, PlayerResult>();

  // Parse each round
  Object.values(matchData).forEach(roundMatches => {
    roundMatches.forEach(match => {
      // Parse result string (e.g., "Guglielmo Lupi won 2-0-0" or "Match was a draw 1-1-1")
      const resultMatch = match.ResultString.match(/^(.+?)\s+won\s+(\d+)-(\d+)-(\d+)$/);
      const drawMatch = match.ResultString.match(/^Match was a draw\s+(\d+)-(\d+)-(\d+)$/);

      if (match.Competitors.length >= 2) {
        const player1Name = match.Competitors[0]?.Team?.Players?.[0]?.DisplayName;
        const player2Name = match.Competitors[1]?.Team?.Players?.[0]?.DisplayName;

        if (!player1Name || !player2Name) return;

        // Initialize players if not exists
        if (!results.has(player1Name)) {
          results.set(player1Name, {
            playerName: player1Name,
            wins: 0,
            losses: 0,
            draws: 0,
            matchWins: 0,
            matchLosses: 0,
            matchDraws: 0
          });
        }
        if (!results.has(player2Name)) {
          results.set(player2Name, {
            playerName: player2Name,
            wins: 0,
            losses: 0,
            draws: 0,
            matchWins: 0,
            matchLosses: 0,
            matchDraws: 0
          });
        }

        const p1 = results.get(player1Name)!;
        const p2 = results.get(player2Name)!;

        if (resultMatch) {
          const winner = resultMatch[1];
          const winnerGames = parseInt(resultMatch[2]);
          const loserGames = parseInt(resultMatch[3]);
          const draws = parseInt(resultMatch[4]);

          if (winner === player1Name) {
            // Player 1 won
            p1.wins += winnerGames;
            p1.losses += loserGames;
            p1.draws += draws;
            p1.matchWins += 1;

            p2.wins += loserGames;
            p2.losses += winnerGames;
            p2.draws += draws;
            p2.matchLosses += 1;
          } else {
            // Player 2 won
            p2.wins += winnerGames;
            p2.losses += loserGames;
            p2.draws += draws;
            p2.matchWins += 1;

            p1.wins += loserGames;
            p1.losses += winnerGames;
            p1.draws += draws;
            p1.matchLosses += 1;
          }
        } else if (drawMatch) {
          const player1Games = parseInt(drawMatch[1]);
          const player2Games = parseInt(drawMatch[2]);
          const draws = parseInt(drawMatch[3]);

          p1.wins += player1Games;
          p1.losses += player2Games;
          p1.draws += draws;
          p1.matchDraws += 1;

          p2.wins += player2Games;
          p2.losses += player1Games;
          p2.draws += draws;
          p2.matchDraws += 1;
        }
      }
    });
  });

  return results;
}
