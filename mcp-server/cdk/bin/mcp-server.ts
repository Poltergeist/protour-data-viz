#!/usr/bin/env node

/**
 * CDK App entry point for ProTour MCP Server
 */

import * as cdk from 'aws-cdk-lib';
import { McpServerStack } from '../lib/mcp-server-stack.js';

const app = new cdk.App();

new McpServerStack(app, 'ProTourMcpStack', {
  description: 'ProTour MCP Server - Tournament data query service',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

app.synth();
