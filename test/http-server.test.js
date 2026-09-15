import { once } from 'node:events';
import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createHttpApp } from '../dist/http-server.js';
import { SiigoClient } from '../dist/siigo-client.js';

const client = new SiigoClient({
  username: 'test@example.com',
  accessKey: 'test-key',
  partnerId: 'test-partner',
  baseUrl: 'https://api.example.test',
});

let httpServer;
let closeMcp;
let mcpClient;

async function startApp(authToken, toolProfile = 'compact') {
  const app = createHttpApp({
    client,
    host: '127.0.0.1',
    authToken,
    toolProfile,
  });

  closeMcp = app.locals.closeMcp;
  httpServer = app.listen(0, '127.0.0.1');
  await once(httpServer, 'listening');
  const address = httpServer.address();

  if (!address || typeof address === 'string') {
    throw new Error('Expected the HTTP server to listen on a TCP port');
  }

  return `http://127.0.0.1:${address.port}/mcp`;
}

afterEach(async () => {
  await mcpClient?.close();
  mcpClient = undefined;
  await closeMcp?.();
  closeMcp = undefined;
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
        tools: expect.arrayContaining([expect.objectContaining({ name: 'siigo_search' })]),
      },
    });
  });

  test('discovers and executes a secondary operation across separate modern HTTP requests', async () => {
    const getTaxes = jest.spyOn(client, 'getTaxes').mockResolvedValue([]);
    const url = await startApp('secret-token');
    mcpClient = new Client({ name: 'modern-http-test', version: '1' }, { versionNegotiation: { mode: { pin: '2026-07-28' } } });
    const transport = new StreamableHTTPClientTransport(new URL(url), {
      requestInit: { headers: { authorization: 'Bearer secret-token' } },
    });
    await mcpClient.connect(transport);
    expect(transport.protocolVersion).toBe('2026-07-28');
    const before = (await mcpClient.listTools()).tools;
    const discovery = await mcpClient.callTool({
      name: 'siigo_discover_operations',
      arguments: { domain: 'catalogs', query: 'get_taxes' },
    });
    expect(discovery.structuredContent.result.operations[0].operation).toBe('siigo_get_taxes');
    const result = await mcpClient.callTool({
      name: 'siigo_execute_read',
      arguments: { domain: 'catalogs', operation: 'siigo_get_taxes', arguments: {} },
    });
    expect(result.structuredContent.result).toEqual([]);
    expect(getTaxes).toHaveBeenCalledTimes(1);
    expect((await mcpClient.listTools()).tools).toEqual(before);
  });

  test('cancels an in-flight secondary operation when a modern HTTP request is aborted', async () => {
    const started = Promise.withResolvers();
    const cancelled = Promise.withResolvers();
    jest.spyOn(client, 'getTaxes').mockImplementation(
      ({ signal }) =>
        new Promise((_, reject) => {
          signal.addEventListener(
            'abort',
            () => {
              cancelled.resolve(signal.aborted);
              reject(signal.reason);
            },
            { once: true },
          );
          started.resolve();
        }),
    );
    const url = await startApp();
    mcpClient = new Client({ name: 'http-cancel-test', version: '1' }, { versionNegotiation: { mode: { pin: '2026-07-28' } } });
    await mcpClient.connect(new StreamableHTTPClientTransport(new URL(url)));
    const controller = new AbortController();
    const pending = mcpClient.callTool(
      { name: 'siigo_execute_read', arguments: { domain: 'catalogs', operation: 'siigo_get_taxes', arguments: {} } },
      { signal: controller.signal },
    );
    const rejection = expect(pending).rejects.toThrow();
    await started.promise;
    controller.abort(new Error('Cancelled by test'));
    await rejection;
    await expect(cancelled.promise).resolves.toBe(true);
  });

  test('keeps the legacy tool profile accessible over HTTP', async () => {
    const url = await startApp(undefined, 'legacy');
    const response = await fetch(url, {
      method: 'POST',
      headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    });
    expect(response.status).toBe(200);
    expect((await response.json()).result.tools).toHaveLength(71);
  });

  test('rejects GET requests', async () => {
    const url = await startApp();
    const response = await fetch(url);

    expect(response.status).toBe(405);
  });
});
