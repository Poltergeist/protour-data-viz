/**
 * MCP tool dispatch — single implementation, used by mcp-server.ts (stdio),
 * http-server.ts, and lambda.ts.
 */

import { z } from 'zod';
import {
  queryMatches,
  queryDecks,
  queryStats,
  queryPlayerDeck,
  listArchetypes,
  getTournamentInfo,
  listTournamentsBrief,
} from './queries.js';
import {
  validateQuery,
  matchQuerySchema,
  deckQuerySchema,
  statsQuerySchema,
  playerDeckQuerySchema,
  tournamentIdSchema,
} from './validation.js';

const tournamentOnlySchema = z.object({ tournament_id: tournamentIdSchema });

type ToolResponse = {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
};

function asText(payload: unknown): ToolResponse {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
}

function asError(message: string): ToolResponse {
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: message }, null, 2) }],
    isError: true,
  };
}

export async function callTool(name: string, args: Record<string, unknown> | undefined): Promise<ToolResponse> {
  try {
    switch (name) {
      case 'list_tournaments':
        return asText(listTournamentsBrief());

      case 'query_matches': {
        const params = validateQuery(matchQuerySchema, args ?? {});
        return asText(queryMatches(params));
      }

      case 'query_decks': {
        const params = validateQuery(deckQuerySchema, args ?? {});
        return asText(queryDecks(params));
      }

      case 'query_stats': {
        const params = validateQuery(statsQuerySchema, args ?? {});
        return asText(queryStats(params));
      }

      case 'query_player_deck': {
        const params = validateQuery(playerDeckQuerySchema, args ?? {});
        const result = queryPlayerDeck(params.tournament_id, params.player);
        return result === null ? asText({ error: 'Player not found' }) : asText(result);
      }

      case 'list_archetypes': {
        const tid = validateQuery(tournamentOnlySchema, args ?? {}).tournament_id;
        return asText(listArchetypes(tid));
      }

      case 'get_tournament_info': {
        const tid = validateQuery(tournamentOnlySchema, args ?? {}).tournament_id;
        const info = getTournamentInfo(tid);
        return info === null ? asError('Tournament not found') : asText(info);
      }

      default:
        return asError(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return asError(error instanceof Error ? error.message : 'Unknown error');
  }
}
