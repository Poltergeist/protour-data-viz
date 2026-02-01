# ProTour MCP Server

Model Context Protocol (MCP) server + REST API for querying Pokémon TCG ProTour tournament data.

## Overview

This service provides two interfaces for accessing tournament data:

1. **MCP Server** (via HTTP) - For AI tools like Claude Desktop, Cursor, VS Code
2. **REST API** - For ChatGPT Custom GPTs and direct HTTP clients

Both interfaces provide read-only access to tournament matches, deck lists, archetypes, and statistics.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server (with hot reload)
npm run dev

# Server runs at http://localhost:3000
# MCP endpoint: http://localhost:3000/mcp
# REST API: http://localhost:3000/api/*
# Health check: http://localhost:3000/health
```

## NPM Scripts

- `npm run dev` - Start development server with hot reload (port 3000)
- `npm run dev:ngrok` - Instructions for HTTPS testing with ngrok
- `npm run mcp` - **Run MCP server (stdio mode for Claude Desktop)**
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run production server (requires build first)
- `npm run test:mcp` - Test health endpoint locally
- `npm run test:queries` - Test all query functions
- `npm run test:phase2` - Test data loading and validation

## Architecture

- **Language**: TypeScript/Node.js
- **MCP Transport**: Streamable HTTP (like Astro's MCP server)
- **HTTP Framework**: Express/Fastify
- **Data Source**: JSON files from `../data` directory
- **Security**: Read-only, input validation, rate limiting

## Features

### MCP Tools (6 tools)
- `query_matches` - Query matches by round, player, or archetype
- `query_decks` - Get deck lists and archetype information
- `query_stats` - Retrieve archetype statistics and matchup data
- `query_player_deck` - Get specific player's deck and performance
- `list_archetypes` - List all available archetypes
- `get_tournament_info` - Get tournament metadata

### REST API (6 endpoints)
- `GET /api/matches` - Query matches
- `GET /api/decks` - Query deck lists
- `GET /api/stats` - Get statistics
- `GET /api/players/:player/deck` - Player deck info
- `GET /api/archetypes` - List archetypes
- `GET /api/tournament` - Tournament metadata

## Documentation

- [DATA-SCHEMA.md](./DATA-SCHEMA.md) - Data structures and types reference
- [TOOLS.md](./TOOLS.md) - Complete MCP tools reference
- [API.md](./API.md) - REST API documentation
- [INTEGRATIONS.md](./INTEGRATIONS.md) - AI tool setup guides
- [EXAMPLES.md](./EXAMPLES.md) - Sample prompts and use cases
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Local development guide
- [SECURITY.md](./SECURITY.md) - Security model
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide

## Status

🚧 **Under Development** - This server is currently being built incrementally.

## License

MIT
