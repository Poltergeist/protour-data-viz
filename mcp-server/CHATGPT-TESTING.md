# Testing with ChatGPT Locally

## Prerequisites

1. **Server running**: `npm run dev`
2. **ngrok installed**: Download from https://ngrok.com (free tier is fine)

## Setup Steps

### 1. Start the Server

```bash
cd mcp-server
npm run dev
```

Server runs on `http://localhost:3000`

### 2. Start ngrok Tunnel

In a separate terminal:

```bash
ngrok http 3000
```

You'll see output like:

```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

### 3. Test the Tunnel

```bash
# Replace with your ngrok URL
curl https://abc123.ngrok.io/health
curl https://abc123.ngrok.io/api/tournament
```

If both work, your tunnel is ready!

### 4. Create Custom GPT

1. Go to https://chat.openai.com
2. Click your profile → **My GPTs** → **Create a GPT**
3. Click **Configure**
4. Under **Actions**, click **Create new action**

### 5. Add OpenAPI Schema

Paste this OpenAPI spec (replace `YOUR_NGROK_URL`):

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "ProTour Data API",
    "version": "0.1.0",
    "description": "Query Pokémon TCG ProTour tournament data"
  },
  "servers": [
    {
      "url": "YOUR_NGROK_URL/api"
    }
  ],
  "paths": {
    "/matches": {
      "get": {
        "summary": "Query tournament matches",
        "operationId": "queryMatches",
        "parameters": [
          {
            "name": "round",
            "in": "query",
            "schema": { "type": "integer", "minimum": 1, "maximum": 20 }
          },
          {
            "name": "player",
            "in": "query",
            "schema": { "type": "string" }
          },
          {
            "name": "archetype",
            "in": "query",
            "schema": { "type": "string" }
          },
          {
            "name": "limit",
            "in": "query",
            "schema": { "type": "integer", "default": 100 }
          }
        ],
        "responses": {
          "200": { "description": "Success" }
        }
      }
    },
    "/archetypes": {
      "get": {
        "summary": "List all deck archetypes",
        "operationId": "listArchetypes",
        "responses": {
          "200": { "description": "Success" }
        }
      }
    },
    "/tournament": {
      "get": {
        "summary": "Get tournament info",
        "operationId": "getTournamentInfo",
        "responses": {
          "200": { "description": "Success" }
        }
      }
    }
  }
}
```

**Important**: Replace `YOUR_NGROK_URL` with your actual ngrok URL (e.g., `https://abc123.ngrok.io`)

### 6. Test with ChatGPT

Try these prompts in your Custom GPT:

```
"List all the deck archetypes in the tournament"

"Show me matches from round 5"

"What's Gabriel Nicholas's deck?"

"What are the top 5 archetypes by win rate?"
```

## Example Session

**Terminal 1:**
```bash
cd mcp-server
npm run dev
```

**Terminal 2:**
```bash
ngrok http 3000
# Copy the https URL
```

**Terminal 3 (test it works):**
```bash
curl https://YOUR-NGROK-URL.ngrok.io/api/tournament
```

Then configure ChatGPT Custom GPT with your ngrok URL!

## Important Notes

- **ngrok URL changes** every time you restart (free tier)
- If ngrok restarts, update the URL in your Custom GPT Actions
- **Free ngrok limits**: 40 connections/minute (should be enough for testing)
- For permanent testing, upgrade ngrok or deploy to cloud

## Troubleshooting

**ChatGPT says "I can't access that":**
- Check ngrok is running
- Check server is running
- Test URL with curl first
- Make sure you used HTTPS URL (not HTTP)

**"Action failed":**
- Check ngrok terminal for errors
- Check server logs for errors
- Verify OpenAPI schema has correct URL

**Rate limit errors:**
- Server has 100 req/min limit per IP
- ngrok free tier has 40 conn/min limit
- Wait a minute and try again
