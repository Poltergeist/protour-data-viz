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

- `npm run dev` - Start HTTP server with hot reload (port 3000)
- `npm run dev:ngrok` - Instructions for HTTPS testing with ngrok
- `npm run serve` - Start HTTP server (production mode)
- `npm run mcp` - **Run MCP server in stdio mode (for local Claude Desktop testing)**
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run production HTTP server (requires build first)
- `npm run test:mcp` - Test health endpoint
- `npm run test:queries` - Test all query functions
- `npm run test:phase2` - Test data loading and validation

## Usage Modes

### 1. HTTP Server Mode (Recommended for Production)

```bash
npm run dev
# Server runs on http://localhost:3000
# MCP endpoint: POST http://localhost:3000/mcp
# Health check: GET http://localhost:3000/health
```

**What is this?**
- MCP protocol over HTTP using Server-Sent Events (SSE)
- Can be deployed to AWS Lambda, Vercel, Railway, Fly.io, etc.
- AI tools connect via HTTPS URL (e.g., `https://your-domain.com/mcp`)
- Same architecture as Astro's MCP server

**Connect AI tools:**
```json
// Claude Desktop config
{
  "mcpServers": {
    "ProTour Data": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

**Test the endpoint:**
```bash
# Health check
curl http://localhost:3000/health

# List MCP tools
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### 2. Stdio Mode (For Local Testing)

```bash
npm run mcp
# Runs MCP server on stdio
```

This mode is primarily for:
- Testing MCP protocol locally
- MCP inspector integration
- Debugging tool implementations

**Note:** Most users should use HTTP mode for deployment and AI tool integration.

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
