/**
 * AWS Lambda handler for ProTour MCP Server
 * Wraps Express app for Lambda + API Gateway integration
 */

import serverlessExpress from '@vendia/serverless-express';
import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import apiRoutes from './api-routes.js';
import {
  queryMatches,
  queryDecks,
  queryStats,
  queryPlayerDeck,
  listArchetypes,
  getTournamentInfo,
} from './queries.js';
import {
  validateQuery,
  matchQuerySchema,
  deckQuerySchema,
  statsQuerySchema,
  playerNameSchema,
} from './validation.js';

// Create Express app (same as http-server.ts but without app.listen)
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '1kb' }));

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// MCP Tools Server
function createMcpServer() {
  const server = new Server(
    {
      name: 'protour-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'query_matches',
        description:
          'Query tournament matches by round, player, or archetype. Returns match results with player names, decks, and outcomes.',
        inputSchema: {
          type: 'object',
          properties: {
            round: {
              type: 'number',
              description: 'Filter by round number (1-10)',
            },
            player: {
              type: 'string',
              description: 'Filter by player name',
            },
            archetype: {
              type: 'string',
              description: 'Filter by deck archetype',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return',
            },
          },
        },
      },
      {
        name: 'query_decks',
        description:
          'Query deck lists and archetype information. Returns complete deck configurations with card lists and player information.',
        inputSchema: {
          type: 'object',
          properties: {
            player: {
              type: 'string',
              description: 'Filter by player name',
            },
            archetype: {
              type: 'string',
              description: 'Filter by deck archetype',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return',
            },
          },
        },
      },
      {
        name: 'query_stats',
        description:
          'Get archetype statistics and matchup data. Returns win rates, popularity, and head-to-head matchup information.',
        inputSchema: {
          type: 'object',
          properties: {
            archetype: {
              type: 'string',
              description: 'Filter by specific archetype',
            },
            matchup: {
              type: 'string',
              description: 'Filter by matchup against specific archetype',
            },
          },
        },
      },
      {
        name: 'query_player_deck',
        description:
          "Get a specific player's deck list and tournament performance. Returns complete deck configuration and match history.",
        inputSchema: {
          type: 'object',
          properties: {
            player: {
              type: 'string',
              description: 'Player name (required)',
            },
          },
          required: ['player'],
        },
      },
      {
        name: 'list_archetypes',
        description:
          'List all deck archetypes in the tournament with usage statistics. Returns archetype names, player counts, and popularity rankings.',
        inputSchema: {
          type: 'object',
          properties: {
            sortBy: {
              type: 'string',
              description: 'Sort by: "name" or "popularity" (default: popularity)',
              enum: ['name', 'popularity'],
            },
          },
        },
      },
      {
        name: 'get_tournament_info',
        description:
          'Get overall tournament metadata and summary statistics. Returns tournament details, player count, round information, and date.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result;

      switch (name) {
        case 'query_matches': {
          const validation = validateQuery(matchQuerySchema, args);
          if (!validation.success) {
            throw new Error(`Validation error: ${validation.error}`);
          }
          result = await queryMatches(validation.data);
          break;
        }

        case 'query_decks': {
          const validation = validateQuery(deckQuerySchema, args);
          if (!validation.success) {
            throw new Error(`Validation error: ${validation.error}`);
          }
          result = await queryDecks(validation.data);
          break;
        }

        case 'query_stats': {
          const validation = validateQuery(statsQuerySchema, args);
          if (!validation.success) {
            throw new Error(`Validation error: ${validation.error}`);
          }
          result = await queryStats(validation.data);
          break;
        }

        case 'query_player_deck': {
          const validation = validateQuery(playerNameSchema, args);
          if (!validation.success) {
            throw new Error(`Validation error: ${validation.error}`);
          }
          result = await queryPlayerDeck(validation.data.player);
          break;
        }

        case 'list_archetypes': {
          const sortBy = (args?.sortBy as string) || 'popularity';
          result = await listArchetypes(sortBy);
          break;
        }

        case 'get_tournament_info': {
          result = await getTournamentInfo();
          break;
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

// MCP endpoint
app.post('/mcp', async (req, res) => {
  try {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);
    await transport.handleRequest(req as any, res as any, req.body);
  } catch (error) {
    console.error('MCP endpoint error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// REST API routes
app.use('/api', apiRoutes);

// Export handler for Lambda
export const handler = serverlessExpress({ app });
