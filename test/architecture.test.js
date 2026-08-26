import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, test } from '@jest/globals';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createHttpApp } from '../dist/http-server.js';
import { errorResult, jsonResult } from '../dist/mcp-results.js';
import { createMcpServer } from '../dist/mcp-server.js';
import { SiigoApiError, SiigoClient } from '../dist/siigo-client.js';
import { PACKAGE_NAME, PACKAGE_VERSION } from '../dist/version.js';

const { getRequiredConfig, parseRequestsPerMinute } = await import('../dist/cli.js');

const clientConfig = {
  username: 'test@example.com',
  accessKey: 'test-key',
  partnerId: 'test-partner',
  baseUrl: 'https://api.example.test',
};

let connectedServer;
let connectedClient;

afterEach(async () => {
  await connectedClient?.close();
  await connectedServer?.close();
  connectedClient = undefined;
  connectedServer = undefined;
});

describe('v4 package and MCP architecture', () => {
  test('parses the optional Siigo request budget environment setting', () => {
    const credentials = {
      SIIGO_USERNAME: 'user',
      SIIGO_ACCESS_KEY: 'key',
      SIIGO_PARTNER_ID: 'partner',
    };

    expect(parseRequestsPerMinute(undefined)).toBeUndefined();
    expect(getRequiredConfig(credentials).requestsPerMinute).toBeUndefined();
    expect(getRequiredConfig({ ...credentials, SIIGO_REQUESTS_PER_MINUTE: '10' }).requestsPerMinute).toBe(10);
    expect(() => parseRequestsPerMinute('0')).toThrow('SIIGO_REQUESTS_PER_MINUTE');
    expect(() => getRequiredConfig({ ...credentials, SIIGO_REQUESTS_PER_MINUTE: '101' })).toThrow('SIIGO_REQUESTS_PER_MINUTE');
  });

  test('exports a side-effect-free public API and central version', async () => {
    const api = await import('../dist/index.js');

    expect(api.PACKAGE_NAME).toBe(PACKAGE_NAME);
    expect(api.PACKAGE_VERSION).toBe('4.0.0');
    expect(api.createMcpServer).toBe(createMcpServer);
    expect(api.SiigoClient).toBe(SiigoClient);

    const schemas = await import('../dist/schemas/index.js');
    expect(schemas.invoiceSchemas.invoiceInputSchema).toBeDefined();
    expect(schemas.voucherSchemas.voucherSchema).toBeDefined();
  });

  test('advertises the central package name/version and the complete registered tool set', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    connectedServer = createMcpServer(new SiigoClient(clientConfig));
    connectedClient = new Client({ name: 'architecture-test-client', version: '1.0.0' }, { capabilities: {} });

    await connectedServer.connect(serverTransport);
    await connectedClient.connect(clientTransport);

    expect(connectedClient.getServerVersion()).toEqual({ name: PACKAGE_NAME, version: PACKAGE_VERSION });
    const tools = await connectedClient.listTools();
    expect(tools.tools).toHaveLength(71);
    expect(tools.tools).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'siigo_get_products' })]));
    expect(new Set(tools.tools.map((tool) => tool.name))).toHaveProperty('size', 71);
    for (const tool of tools.tools) {
      expect(tool.outputSchema).toMatchObject({ type: 'object' });
      expect(tool.outputSchema.properties?.result).toBeDefined();
      expect(tool.outputSchema.properties.result).not.toEqual({});
      expect(tool.annotations).toEqual(
        expect.objectContaining({
          readOnlyHint: expect.any(Boolean),
          destructiveHint: expect.any(Boolean),
          idempotentHint: expect.any(Boolean),
          openWorldHint: expect.any(Boolean),
        }),
      );
    }
  });

  test('satisfies an optional tool output schema through structured content', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const productList = { pagination: { page: 1, page_size: 1, total_results: 0 }, results: [] };
    connectedServer = createMcpServer({ getProducts: async () => productList });
    connectedClient = new Client({ name: 'output-schema-test-client', version: '1.0.0' }, { capabilities: {} });

    await connectedServer.connect(serverTransport);
    await connectedClient.connect(clientTransport);

    const result = await connectedClient.callTool({ name: 'siigo_get_products', arguments: {} });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual({ result: productList });
  });

  test('returns structured and text results, including empty values', () => {
    const objectResult = jsonResult({ ok: true });
    expect(objectResult.structuredContent).toEqual({ result: { ok: true } });
    expect(JSON.parse(objectResult.content[0].text)).toEqual({ ok: true });

    const emptyResult = jsonResult(undefined);
    expect(emptyResult.structuredContent).toEqual({ result: null });
    expect(emptyResult.content[0].text).toBe('null');
  });

  test('bounds structured API error details while preserving status', () => {
    const result = errorResult(
      'siigo_get_product',
      new SiigoApiError('Invalid request', { Status: 400, errors: [{ Code: 'invalid', Message: 'x'.repeat(10000) }] }, 400),
    );

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({ error: { status: 400, tool: 'siigo_get_product' } });
    expect(result.structuredContent.error.details.length).toBeLessThanOrEqual(4001);
  });

  test('rejects unauthenticated non-loopback HTTP construction', () => {
    expect(() => createHttpApp({ client: new SiigoClient(clientConfig), host: '0.0.0.0' })).toThrow(
      'authToken is required when the MCP HTTP server binds to a non-loopback host',
    );
  });

  test('ships a working ESM launcher and package export metadata', async () => {
    const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    expect(packageJson.version).toBe(PACKAGE_VERSION);
    expect(packageJson.bin['siigo-mcp']).toBe('bin/siigo-mcp');
    expect(packageJson.exports['.'].import).toBe('./dist/index.js');
    expect(packageJson.exports['./contracts'].types).toBe('./dist/contracts.d.ts');
    expect(packageJson.exports['./schemas'].import).toBe('./dist/schemas/index.js');

    const result = spawnSync(process.execPath, ['bin/siigo-mcp'], {
      cwd: new URL('..', import.meta.url),
      env: {
        ...process.env,
        SIIGO_USERNAME: '',
        SIIGO_ACCESS_KEY: '',
        SIIGO_PARTNER_ID: '',
      },
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('SIIGO_USERNAME, SIIGO_ACCESS_KEY, and SIIGO_PARTNER_ID');
  });
});
