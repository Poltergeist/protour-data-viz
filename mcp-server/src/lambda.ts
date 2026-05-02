/**
 * AWS Lambda handler: same Express app as http-server.ts, wrapped with
 * @vendia/serverless-express for API Gateway integration.
 */

import serverlessExpress from '@vendia/serverless-express';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import apiRoutes from './api-routes.js';
import { toolDefinitions } from './tool-definitions.js';
import { callTool } from './tool-handlers.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1kb' }));

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'protour-mcp-server', version: '0.2.0', timestamp: new Date().toISOString() });
});

app.use('/api', apiRoutes);

function createMcpServer() {
  const server = new Server(
    { name: 'protour-data-server', version: '0.2.0' },
    { capabilities: { tools: {} } }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: toolDefinitions }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return callTool(name, args as Record<string, unknown> | undefined);
  });
  return server;
}

app.post('/mcp', async (req: Request, res: Response) => {
  try {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req as any, res as any, req.body);
  } catch (error) {
    console.error('MCP endpoint error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

export const handler = serverlessExpress({ app });
