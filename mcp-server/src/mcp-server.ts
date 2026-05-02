/**
 * MCP Server (stdio transport). Used by `npm run mcp` for local testing
 * with stdio-based MCP clients.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { toolDefinitions } from './tool-definitions.js';
import { callTool } from './tool-handlers.js';

const server = new Server(
  { name: 'protour-data-server', version: '0.2.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: toolDefinitions }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return callTool(name, args as Record<string, unknown> | undefined);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ProTour MCP Server (v0.2.0) running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
