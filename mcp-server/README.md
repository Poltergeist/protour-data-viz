# ProTour MCP Server

Model Context Protocol (MCP) server + REST API for querying Pokémon TCG ProTour tournament data.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-1.25-purple)](https://modelcontextprotocol.io)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](../LICENSE)

## Overview

This service provides two interfaces for accessing tournament data:

1. **MCP Server** (via HTTP) - For AI tools like Claude Desktop, Cursor, VS Code, Zed, Windsurf
2. **REST API** - For ChatGPT Custom GPTs, direct HTTP clients, and traditional integrations

Both interfaces provide read-only access to tournament matches, deck lists, archetypes, and statistics from Pro Tour - Aetherdrift (tournament 394299).

**Data available:**
- 304 players across 10 rounds
- 43 unique deck archetypes
- Complete deck lists and card data
- Match results and statistics
- Archetype matchup data

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Server runs at http://localhost:3000
# MCP endpoint: POST http://localhost:3000/mcp
# REST API: GET http://localhost:3000/api/*
# Health check: GET http://localhost:3000/health
```

**Test it:**
```bash
# Health check
curl http://localhost:3000/health

# Get tournament info
curl http://localhost:3000/api/tournament

# List all archetypes
curl http://localhost:3000/api/archetypes

# Query matches from round 5
curl "http://localhost:3000/api/matches?round=5&limit=5"
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start HTTP server with hot reload (port 3000) |
| `npm run serve` | Start HTTP server (no hot reload) |
| `npm run mcp` | Run MCP server in stdio mode (for testing) |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run build:lambda` | Build for Lambda deployment (includes data) |
| `npm run deploy` | Deploy to AWS Lambda via CDK |
| `npm run start` | Run production server (requires build) |
| `npm run test:http` | Test MCP endpoint via HTTP |
| `npm run test:api` | Test REST API endpoints |
| `npm run test:queries` | Test query functions |
| `npm run test:phase2` | Test data loading and validation |

## Integration Examples

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ProTour Data": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

Restart Claude and try: *"List all archetypes in the tournament"*

### ChatGPT Custom GPT

1. Start server with HTTPS (use ngrok for local testing)
2. Import `openapi.json` to Custom GPT Actions
3. Try: *"Show me the top 5 archetypes by win rate"*

See [CHATGPT-TESTING.md](./CHATGPT-TESTING.md) for detailed setup.

### curl / HTTP clients

```bash
# List all archetypes
curl http://localhost:3000/api/archetypes

# Get player's deck
curl http://localhost:3000/api/players/Gabriel%20Nicholas/deck

# Query matches from round 7
curl "http://localhost:3000/api/matches?round=7&limit=10"
```

See [API.md](./API.md) for complete endpoint documentation.

## Architecture

```
┌─────────────────────────────────────────────────┐
│           HTTP Server (Port 3000)               │
├─────────────────────────────────────────────────┤
│  POST /mcp          │  GET /api/*               │
│  (MCP Protocol)     │  (REST API)               │
│  Server-Sent Events │  JSON Responses           │
└──────────┬──────────┴──────────┬────────────────┘
           │                     │
           └─────────┬───────────┘
                     │
           ┌─────────▼──────────┐
           │   Query Functions  │
           │   (queries.ts)     │
           └─────────┬──────────┘
                     │
           ┌─────────▼──────────┐
           │   Data Loader      │
           │   (data-loader.ts) │
           └─────────┬──────────┘
                     │
           ┌─────────▼──────────┐
           │    JSON Files      │
           │    ../data/*.json  │
           └────────────────────┘
```

**Stack:**
- **Language**: TypeScript 5.0 + Node.js 18+
- **MCP SDK**: @modelcontextprotocol/sdk v1.25.3
- **HTTP Framework**: Express 5.x
- **Validation**: Zod
- **Transport**: StreamableHTTPServerTransport (SSE)
- **Data Source**: Static JSON files
- **Security**: Read-only, rate limiting, input validation

## Features

### 🛠️ MCP Tools (6 tools)

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `query_matches` | Query matches by round, player, or archetype | "Show matches from round 5" |
| `query_decks` | Get deck lists and archetype information | "Show all Izzet Spellementals decks" |
| `query_stats` | Retrieve archetype statistics and matchup data | "What's the win rate for Bant Rhythm?" |
| `query_player_deck` | Get specific player's deck and performance | "Show Gabriel Nicholas's deck" |
| `list_archetypes` | List all available archetypes | "List all archetypes by win rate" |
| `get_tournament_info` | Get tournament metadata | "What tournament is this?" |

See [TOOLS.md](./TOOLS.md) for complete tool documentation.

### 🌐 REST API (6 endpoints)

| Endpoint | Description |
|----------|-------------|
| `GET /api/matches` | Query matches with filters (round, player, archetype) |
| `GET /api/decks` | Query deck lists with filters |
| `GET /api/stats` | Get archetype statistics and matchup data |
| `GET /api/players/:player/deck` | Get player's deck and performance |
| `GET /api/archetypes` | List all archetypes with stats |
| `GET /api/tournament` | Get tournament metadata |

See [API.md](./API.md) for complete endpoint documentation.

### 🔒 Security Features

- **Read-only access** - No write operations
- **File allowlist** - Only specific data files accessible
- **Input validation** - Zod schemas validate all parameters
- **Rate limiting** - 100 requests/minute per IP
- **Security headers** - CSP, X-Frame-Options, HSTS
- **Request limits** - 1KB body size, 1000 max results

See [SECURITY.md](./SECURITY.md) for detailed security model.

## Documentation

| Document | Description |
|----------|-------------|
| [DATA-SCHEMA.md](./DATA-SCHEMA.md) | Data structures and TypeScript types |
| [TOOLS.md](./TOOLS.md) | Complete MCP tools reference with examples |
| [API.md](./API.md) | REST API documentation with curl examples |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Setup guides for Claude, Cursor, VS Code, ChatGPT |
| [CHATGPT-TESTING.md](./CHATGPT-TESTING.md) | Testing with ChatGPT locally via ngrok |
| [EXAMPLES.md](./EXAMPLES.md) | Sample prompts and use cases |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Local development and testing guide |
| [SECURITY.md](./SECURITY.md) | Security model and threat analysis |
| [PRIVACY.md](./PRIVACY.md) | Privacy policy for ChatGPT integration |
| [DEPLOYMENT-AWS.md](./DEPLOYMENT-AWS.md) | AWS Lambda deployment guide with CDK |
| [openapi.json](./openapi.json) | OpenAPI 3.1.0 spec for REST API |

## Deployment

### Local Development

```bash
npm run dev  # http://localhost:3000
```

### AWS Lambda (via CDK)

Deploy to AWS Lambda with API Gateway:

```bash
# One-time setup
cd cdk
npm install
npx cdk bootstrap

# Deploy
npm run deploy
```

**Output:**
```
✅ ProTourMcpStack
Outputs:
  ApiUrl = https://abc123.execute-api.us-east-1.amazonaws.com/
  McpEndpoint = https://abc123.execute-api.us-east-1.amazonaws.com/mcp
  RestApiBase = https://abc123.execute-api.us-east-1.amazonaws.com/api/
```

**Estimated cost:** ~$2-5/month for moderate usage (10K requests/day)

See [DEPLOYMENT-AWS.md](./DEPLOYMENT-AWS.md) for complete guide.

### Other Deployment Options

- **Vercel/Netlify** - Serverless functions (easiest, free tier)
- **Railway/Fly.io** - Container-based deployment  
- **Self-hosted** - Traditional server (EC2, VPS, Docker)

All options support both MCP (via HTTP) and REST API endpoints.

## Testing

```bash
# Run all tests
npm run test:phase2  # Data loading
npm run test:queries # Query functions
npm run test:http    # MCP endpoint
npm run test:api     # REST API

# Manual testing
npm run dev
curl http://localhost:3000/health
curl http://localhost:3000/api/tournament
```

## Project Status

✅ **All Phases Complete**
- [x] Project setup and configuration
- [x] Data loading with security controls
- [x] 6 MCP tools implemented
- [x] HTTP server with SSE transport
- [x] REST API with 6 endpoints
- [x] Comprehensive documentation (11 files)
- [x] Input validation and rate limiting
- [x] Testing suite
- [x] AWS Lambda deployment with CDK
- [x] ChatGPT integration support
- [x] Production-ready security model

**Ready for deployment and use!**

## Contributing

Contributions welcome! Please see [DEVELOPMENT.md](./DEVELOPMENT.md) for local setup and testing.

Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:
```bash
feat(api): add player search endpoint
fix(validation): handle edge case in round validation
docs(readme): update installation instructions
```

## License

MIT - See [LICENSE](../LICENSE) for details
