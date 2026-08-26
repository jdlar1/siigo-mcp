#!/usr/bin/env node

import { pathToFileURL } from 'node:url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as dotenv from 'dotenv';
import { createHttpApp } from './http-server.js';
import { createMcpServer } from './mcp-server.js';
import { SiigoClient, validateRequestsPerMinute } from './siigo-client.js';
import type { SiigoConfig } from './types.js';

// Keep stdout reserved for the stdio MCP transport; dotenv's informational
// banner would otherwise corrupt the JSON-RPC stream.
dotenv.config({ quiet: true });

export function parseRequestsPerMinute(rawValue: string | undefined): number | undefined {
  if (rawValue === undefined) {
    return undefined;
  }

  const value = rawValue.trim();
  if (!/^\d+$/.test(value)) {
    throw new Error('SIIGO_REQUESTS_PER_MINUTE must be an integer between 1 and 100');
  }

  try {
    return validateRequestsPerMinute(Number(value));
  } catch {
    throw new Error('SIIGO_REQUESTS_PER_MINUTE must be an integer between 1 and 100');
  }
}

export function getRequiredConfig(env: NodeJS.ProcessEnv): SiigoConfig {
  const username = env.SIIGO_USERNAME ?? '';
  const accessKey = env.SIIGO_ACCESS_KEY ?? '';
  const partnerId = env.SIIGO_PARTNER_ID ?? '';
  const requestsPerMinute = parseRequestsPerMinute(env.SIIGO_REQUESTS_PER_MINUTE);

  if (!username || !accessKey || !partnerId) {
    throw new Error('SIIGO_USERNAME, SIIGO_ACCESS_KEY, and SIIGO_PARTNER_ID environment variables are required');
  }

  if (!/^[A-Za-z0-9]{3,100}$/.test(partnerId)) {
    throw new Error('SIIGO_PARTNER_ID must contain 3-100 alphanumeric characters without spaces or punctuation');
  }

  return {
    username,
    accessKey,
    baseUrl: env.SIIGO_BASE_URL || 'https://api.siigo.com',
    partnerId,
    ...(requestsPerMinute === undefined ? {} : { requestsPerMinute }),
  };
}

function getPort(env: NodeJS.ProcessEnv): number {
  const rawPort = env.MCP_PORT ?? env.PORT ?? '3000';
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('MCP_PORT or PORT must be an integer between 1 and 65535');
  }

  return port;
}

function getAllowedHosts(env: NodeJS.ProcessEnv): string[] | undefined {
  const hosts = env.MCP_ALLOWED_HOSTS?.split(',')
    .map((host) => host.trim())
    .filter(Boolean);

  return hosts && hosts.length > 0 ? hosts : undefined;
}

export async function main(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const config = getRequiredConfig(env);
  const client = new SiigoClient(config);
  const transportType = env.MCP_TRANSPORT || 'stdio';

  if (transportType !== 'stdio' && transportType !== 'http') {
    throw new Error('MCP_TRANSPORT must be either "stdio" or "http"');
  }

  if (transportType === 'http') {
    const host = env.MCP_HOST || '127.0.0.1';
    const port = getPort(env);
    const authToken = env.MCP_AUTH_TOKEN;
    const allowedHosts = getAllowedHosts(env);
    const app = createHttpApp({ client, host, ...(authToken ? { authToken } : {}), ...(allowedHosts ? { allowedHosts } : {}) });

    app.listen(port, host, () => {
      console.error(`Siigo MCP listening on http://${host}:${port}/mcp`);
    });
    return;
  }

  const server = createMcpServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const entrypoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : undefined;

if (entrypoint === import.meta.url) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
