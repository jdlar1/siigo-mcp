#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as dotenv from 'dotenv';
import { createHttpApp } from './http-server.js';
import { createMcpServer } from './mcp-server.js';
import { SiigoClient } from './siigo-client.js';
import type { SiigoConfig } from './types.js';

dotenv.config();

// ─── Config ────────────────────────────────────────────────────────────────

const config: SiigoConfig = {
  username: process.env.SIIGO_USERNAME || '',
  accessKey: process.env.SIIGO_ACCESS_KEY || '',
  baseUrl: process.env.SIIGO_BASE_URL || 'https://api.siigo.com',
  partnerId: process.env.SIIGO_PARTNER_ID || '',
};

if (!config.username || !config.accessKey || !config.partnerId) {
  console.error('SIIGO_USERNAME, SIIGO_ACCESS_KEY, and SIIGO_PARTNER_ID environment variables are required');
  process.exit(1);
}

const client = new SiigoClient(config);

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const transportType = process.env.MCP_TRANSPORT || 'stdio';

  if (!['stdio', 'http'].includes(transportType)) {
    throw new Error('MCP_TRANSPORT must be either "stdio" or "http"');
  }

  if (transportType === 'http') {
    const host = process.env.MCP_HOST || '127.0.0.1';
    const port = Number.parseInt(process.env.MCP_PORT || process.env.PORT || '3000', 10);
    const authToken = process.env.MCP_AUTH_TOKEN;

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('MCP_PORT or PORT must be an integer between 1 and 65535');
    }

    if (!['127.0.0.1', 'localhost', '::1'].includes(host) && !authToken) {
      throw new Error('MCP_AUTH_TOKEN is required when MCP_HOST is not a loopback address');
    }

    const app = createHttpApp({ client, host, authToken });
    app.listen(port, host, () => {
      console.error(`Siigo MCP listening on http://${host}:${port}/mcp`);
    });
    return;
  }

  const server = createMcpServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
