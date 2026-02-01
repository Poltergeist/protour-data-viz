/**
 * MCP Server implementation
 * Registers and exposes 6 tools for querying tournament data
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
  queryMatches,
  queryDecks,
  queryStats,
  queryPlayerDeck,
  listArchetypes,
  getTournamentInfo,
} from './queries.js';
import { validateQuery, matchQuerySchema, deckQuerySchema, statsQuerySchema, playerNameSchema } from './validation.js';

// Create MCP server instance
const server = new Server(
  {
    name: 'protour-data-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool: query_matches
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'query_matches',
        description: 'Query tournament matches by round, player name, or archetype. Returns match results including players, decks, and outcomes.',
        inputSchema: {
          type: 'object',
          properties: {
            round: {
              type: 'number',
              description: 'Round number (1-20)',
              minimum: 1,
              maximum: 20,
            },
            player: {
              type: 'string',
              description: 'Player name or partial name to search for',
              maxLength: 100,
            },
            archetype: {
              type: 'string',
              description: 'Deck archetype name or partial name',
              maxLength: 100,
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 100, max: 1000)',
              minimum: 1,
              maximum: 1000,
              default: 100,
            },
          },
        },
      },
      {
        name: 'query_decks',
        description: 'Query deck lists by player name or archetype. Returns complete deck lists with main deck and sideboard.',
        inputSchema: {
          type: 'object',
          properties: {
            player: {
              type: 'string',
              description: 'Player name or partial name',
              maxLength: 100,
            },
            archetype: {
              type: 'string',
              description: 'Deck archetype name or partial name',
              maxLength: 100,
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 100, max: 1000)',
              minimum: 1,
              maximum: 1000,
              default: 100,
            },
          },
        },
      },
      {
        name: 'query_stats',
        description: 'Retrieve archetype statistics including win rates and matchup data. Optionally filter by specific archetype.',
        inputSchema: {
          type: 'object',
          properties: {
            archetype: {
              type: 'string',
              description: 'Specific archetype name (optional, returns all if omitted)',
              maxLength: 100,
            },
          },
        },
      },
      {
        name: 'query_player_deck',
        description: "Get a specific player's deck list, archetype, and match history.",
        inputSchema: {
          type: 'object',
          properties: {
            player: {
              type: 'string',
              description: 'Player name (exact or partial match)',
              maxLength: 100,
            },
          },
          required: ['player'],
        },
      },
      {
        name: 'list_archetypes',
        description: 'List all deck archetypes in the tournament with play counts and win rates.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_tournament_info',
        description: 'Get tournament metadata including name, format, player count, and available data.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'query_matches': {
        const params = validateQuery(matchQuerySchema, args || {});
        const results = queryMatches(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'query_decks': {
        const params = validateQuery(deckQuerySchema, args || {});
        const results = queryDecks(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'query_stats': {
        const params = validateQuery(statsQuerySchema, args || {});
        const results = queryStats(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'query_player_deck': {
        if (!args || typeof args !== 'object' || !('player' in args)) {
          throw new Error('Player name is required');
        }
        const player = validateQuery(playerNameSchema, args.player);
        const results = queryPlayerDeck(player);
        
        if (!results) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Player not found' }, null, 2),
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'list_archetypes': {
        const results = listArchetypes();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'get_tournament_info': {
        const results = getTournamentInfo();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ProTour MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
