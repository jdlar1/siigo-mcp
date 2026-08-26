import { once } from 'node:events';
import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { createHttpApp } from '../dist/http-server.js';
import { SiigoClient } from '../dist/siigo-client.js';

const client = new SiigoClient({
  username: 'test@example.com',
  accessKey: 'test-key',
  partnerId: 'test-partner',
  baseUrl: 'https://api.example.test',
});

let httpServer;

async function startApp(authToken) {
  const app = createHttpApp({
    client,
    host: '127.0.0.1',
    authToken,
  });

  httpServer = app.listen(0, '127.0.0.1');
  await once(httpServer, 'listening');
  const address = httpServer.address();

  if (!address || typeof address === 'string') {
    throw new Error('Expected the HTTP server to listen on a TCP port');
  }

  return `http://127.0.0.1:${address.port}/mcp`;
}

afterEach(async () => {
  jest.restoreAllMocks();

  if (httpServer) {
    httpServer.close();
    await once(httpServer, 'close');
    httpServer = undefined;
  }
});

describe('stateless Streamable HTTP server', () => {
  test('requires the configured bearer token', async () => {
    const url = await startApp('secret-token');
    const response = await fetch(url, { method: 'POST' });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { message: 'Unauthorized' },
    });
  });

  test('handles initialization without creating an MCP session', async () => {
    const url = await startApp();
    const headers = {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
    };
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0',
          },
        },
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('mcp-session-id')).toBeNull();
    await expect(response.json()).resolves.toMatchObject({
      result: {
        serverInfo: {
          name: '@jdlar/siigo-mcp',
        },
      },
    });

    const toolsResponse = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      }),
    });

    expect(toolsResponse.status).toBe(200);
    await expect(toolsResponse.json()).resolves.toMatchObject({
      result: {
        tools: expect.arrayContaining([expect.objectContaining({ name: 'siigo_get_products' })]),
      },
    });
  });

  test('rejects GET requests', async () => {
    const url = await startApp();
    const response = await fetch(url);

    expect(response.status).toBe(405);
  });
});
