/**
 * MCP tool definitions — shared between mcp-server.ts (stdio), http-server.ts,
 * and lambda.ts. Define once to avoid drift.
 */

const tournamentIdProperty = {
  type: 'string' as const,
  description:
    'Tournament ID (numeric string). Use list_tournaments to discover available tournaments.',
  pattern: '^\\d+$',
};

export const toolDefinitions = [
  {
    name: 'list_tournaments',
    description:
      'List all available tournaments with their IDs, slugs, names, formats, dates, and completion status.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'query_matches',
    description:
      'Query tournament matches by round, player, or archetype. Returns match results including players, decks, and outcomes.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        tournament_id: tournamentIdProperty,
        round: { type: 'number', description: 'Round number (1-20)', minimum: 1, maximum: 20 },
        player: { type: 'string', description: 'Player name or partial name to search for', maxLength: 100 },
        archetype: { type: 'string', description: 'Deck archetype name or partial name', maxLength: 100 },
        limit: { type: 'number', description: 'Maximum number of results (default: 100, max: 1000)', minimum: 1, maximum: 1000, default: 100 },
      },
      required: ['tournament_id'],
    },
  },
  {
    name: 'query_decks',
    description:
      'Query deck lists by player name or archetype. Returns complete deck lists with main deck and sideboard.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        tournament_id: tournamentIdProperty,
        player: { type: 'string', description: 'Player name or partial name', maxLength: 100 },
        archetype: { type: 'string', description: 'Deck archetype name or partial name', maxLength: 100 },
        limit: { type: 'number', description: 'Maximum number of results (default: 100, max: 1000)', minimum: 1, maximum: 1000, default: 100 },
      },
      required: ['tournament_id'],
    },
  },
  {
    name: 'query_stats',
    description:
      'Retrieve archetype statistics including win rates and matchup data. Optionally filter by specific archetype.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        tournament_id: tournamentIdProperty,
        archetype: { type: 'string', description: 'Specific archetype name (optional)', maxLength: 100 },
      },
      required: ['tournament_id'],
    },
  },
  {
    name: 'query_player_deck',
    description: "Get a specific player's deck list, archetype, and match history.",
    inputSchema: {
      type: 'object' as const,
      properties: {
        tournament_id: tournamentIdProperty,
        player: { type: 'string', description: 'Player name (exact or partial match)', maxLength: 100 },
      },
      required: ['tournament_id', 'player'],
    },
  },
  {
    name: 'list_archetypes',
    description:
      'List all deck archetypes in the tournament with play counts and win rates.',
    inputSchema: {
      type: 'object' as const,
      properties: { tournament_id: tournamentIdProperty },
      required: ['tournament_id'],
    },
  },
  {
    name: 'get_tournament_info',
    description:
      'Get tournament metadata including name, format, player count, and available data.',
    inputSchema: {
      type: 'object' as const,
      properties: { tournament_id: tournamentIdProperty },
      required: ['tournament_id'],
    },
  },
];
