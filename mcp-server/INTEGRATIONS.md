# Integration Guide

How to connect the ProTour MCP Server to various AI tools and platforms.

## Quick Links

- [Claude Desktop](#claude-desktop)
- [Cursor](#cursor)
- [VS Code](#vs-code)
- [ChatGPT Custom GPTs](#chatgpt-custom-gpts)
- [Other Tools](#other-mcp-compatible-tools)

---

## Claude Desktop

### Local Testing

**1. Start the server:**
```bash
cd mcp-server
npm run dev
```

**2. Add to Claude Desktop config:**

Open Claude Desktop settings → Developer → Edit Config

**Mac/Linux:** `~/.config/claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "protour-data": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

**3. Restart Claude Desktop**

**4. Test it:**
Try prompts like:
- "List all deck archetypes in the tournament"
- "Show me matches from round 5"
- "What deck did Gabriel Nicholas play?"

### Production (Deployed)

Once deployed to a public URL:

```json
{
  "mcpServers": {
    "protour-data": {
      "type": "http",
      "url": "https://your-domain.com/mcp"
    }
  }
}
```

---

## Cursor

### Setup

**1. Start the server** (or use deployed URL)

**2. Add to Cursor:**

Open Cursor Settings → Features → Model Context Protocol

Click "Add MCP Server" and enter:
- **Name**: ProTour Data
- **URL**: `http://localhost:3000/mcp` (or your deployed URL)

**3. Test:**
Use Cursor's AI chat with prompts about the tournament data.

---

## VS Code

### Setup

**1. Install Copilot Chat** extension (if not already installed)

**2. Configure MCP server:**

Settings → Copilot → MCP Servers

Add configuration:
```json
{
  "name": "ProTour Data",
  "url": "http://localhost:3000/mcp"
}
```

**3. Use in Copilot Chat:**
Ask questions about tournament data in the Copilot Chat panel.

---

## ChatGPT Custom GPTs

### Local Testing with ngrok

**1. Start server and ngrok:**
```bash
# Terminal 1
cd mcp-server
npm run dev

# Terminal 2
ngrok http 3000
# Copy the HTTPS URL
```

**2. Create Custom GPT:**

1. Go to https://chat.openai.com
2. Click profile → **My GPTs** → **Create a GPT**
3. Click **Configure** tab
4. Under **Actions**, click **Create new action**

**3. Import OpenAPI spec:**

Use the `openapi.json` file from the mcp-server directory, but update the server URL:

```json
{
  "servers": [
    {
      "url": "https://YOUR-NGROK-URL.ngrok.io/api"
    }
  ]
}
```

**4. Configure GPT:**
- **Name**: ProTour Data Assistant
- **Description**: Query Pokémon TCG ProTour tournament data
- **Instructions**: 
  ```
  You help users explore Pokémon TCG Pro Tour tournament data.
  Use the available actions to query matches, deck lists, and statistics.
  Present data in a clear, organized format.
  ```

**5. Test:**
- "What are the top archetypes?"
- "Show me Izzet deck lists"
- "Who won their matches in round 5?"

### Production Deployment

For permanent ChatGPT integration:

1. Deploy server to Vercel/AWS/Railway
2. Get permanent HTTPS URL
3. Update OpenAPI spec with production URL
4. Import to ChatGPT Custom GPT Actions

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions.

---

## Other MCP-Compatible Tools

### Warp

```json
{
  "mcpServers": {
    "protour-data": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:3000/mcp"]
    }
  }
}
```

### Zed

```json
{
  "context_servers": {
    "protour-data": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:3000/mcp"]
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "protour-data": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:3000/mcp"]
    }
  }
}
```

---

## Available Tools

Once connected, these 6 tools are available:

1. **query_matches** - Query tournament matches by round, player, or archetype
2. **query_decks** - Get complete deck lists
3. **query_stats** - Get archetype statistics and matchup data
4. **query_player_deck** - Get a player's deck and performance
5. **list_archetypes** - List all archetypes with win rates
6. **get_tournament_info** - Get tournament metadata

See [TOOLS.md](./TOOLS.md) for complete tool documentation.

---

## Troubleshooting

### Connection Issues

**Claude Desktop can't connect:**
- Ensure server is running (`npm run dev`)
- Check the URL in config is correct
- Restart Claude Desktop after config changes
- Check server logs for errors

**"Server not responding":**
- Verify health endpoint: `curl http://localhost:3000/health`
- Check firewall isn't blocking port 3000
- Try a different port (set `PORT=3001` env var)

**ChatGPT "Action failed":**
- Verify ngrok is running and URL is correct
- Test URL with curl before using in ChatGPT
- Check ngrok dashboard for connection logs
- Ensure OpenAPI spec has correct URL

### Rate Limiting

If you hit rate limits (100 requests/minute per IP):
- Wait 60 seconds
- For heavy usage, deploy to production
- Consider implementing caching on client side

### HTTPS Required

Some tools require HTTPS. Options:
- Use ngrok for local testing
- Deploy to cloud with HTTPS (Vercel, Netlify, etc.)
- Use local SSL certificates (advanced)

---

## Next Steps

1. **Test locally** with Claude Desktop or Cursor
2. **Try sample prompts** from [EXAMPLES.md](./EXAMPLES.md)
3. **Deploy to production** following [DEPLOYMENT.md](./DEPLOYMENT.md)
4. **Share with others** - publish your deployed URL

---

## Support

For issues:
- Check [DEVELOPMENT.md](./DEVELOPMENT.md) for local setup
- Review [SECURITY.md](./SECURITY.md) for security concerns
- Check server logs for error messages
