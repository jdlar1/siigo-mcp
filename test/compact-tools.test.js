import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { parseToolProfile } from '../dist/cli.js';
import { createLegacyMcpServer } from '../dist/legacy-server.js';
import { createMcpServer } from '../dist/mcp-server.js';
import { OperationRegistry } from '../dist/operations.js';

const connections = [];
async function connect(siigo = {}, factory = createMcpServer) {
  const server = factory(siigo);
  const client = new Client({ name: 'compact-tests', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(b);
  await client.connect(a);
  connections.push({ server, client });
  return client;
}
async function call(client, name, args) {
  return client.callTool({ name, arguments: args });
}
afterEach(async () => {
  for (const { client, server } of connections.splice(0)) {
    await client.close();
    await server?.close();
  }
});

const id = 'f0a12246-631b-4d27-8ae3-33988d870853';
const page = (results, total = results.length, number = 1) => ({
  pagination: { page: number, page_size: 100, total_results: total },
  results,
});

describe('compact tool surface', () => {
  test('keeps ten tools stable and reduces advertised bytes by at least 70%, preserving all legacy operations through discovery', async () => {
    const compact = await connect();
    const legacy = await connect({}, createLegacyMcpServer);
    const before = (await compact.listTools()).tools;
    const old = (await legacy.listTools()).tools;
    expect(before).toHaveLength(10);
    expect(Buffer.byteLength(JSON.stringify(before))).toBeLessThan(Buffer.byteLength(JSON.stringify(old)) * 0.3);
    const domains = (await call(compact, 'siigo_discover_operations', {})).structuredContent.result.domains;
    const discovered = [];
    for (const { domain } of domains) {
      const result = await call(compact, 'siigo_discover_operations', { domain, limit: 20 });
      expect(result.isError).not.toBe(true);
      for (const operation of result.structuredContent.result.operations) {
        const original = old.find((tool) => tool.name === operation.operation);
        expect(original).toBeDefined();
        expect(operation.inputSchema).toMatchObject({ type: 'object' });
        expect(operation.outputSchema).toMatchObject({ type: 'object' });
        expect(operation.annotations).toEqual(original.annotations);
        discovered.push(operation.operation);
      }
    }
    expect(discovered.sort()).toEqual(old.map((tool) => tool.name).sort());
    expect((await compact.listTools()).tools).toEqual(before);
  });

  test('routes a typed search and preserves API pagination', async () => {
    const data = page([]);
    const getProducts = jest.fn().mockResolvedValue(data);
    const client = await connect({ getProducts });
    const result = await call(client, 'siigo_search', {
      query: { entity: 'products', mode: 'list', filters: { code: 'ABC', page: 2, page_size: 10 } },
    });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual({ result: data });
    expect(getProducts).toHaveBeenCalledWith({ code: 'ABC', page: 2, page_size: 10 }, { signal: expect.any(AbortSignal) });
  });

  test('rejects wrong executor kinds and malformed arguments before touching Siigo', async () => {
    const deleteProduct = jest.fn().mockResolvedValue({ id, deleted: true });
    const client = await connect({ deleteProduct });
    const args = { domain: 'products', operation: 'siigo_delete_product', arguments: { id } };
    for (const executor of ['read', 'write']) {
      expect((await call(client, `siigo_execute_${executor}`, args)).isError).toBe(true);
    }
    expect((await call(client, 'siigo_execute_destructive', { ...args, arguments: { id: 'invalid' } })).isError).toBe(true);
    expect((await call(client, 'siigo_execute_destructive', { ...args, domain: 'webhooks' })).isError).toBe(true);
    expect(deleteProduct).not.toHaveBeenCalled();
    expect((await call(client, 'siigo_execute_destructive', args)).isError).not.toBe(true);
    expect(deleteProduct).toHaveBeenCalledTimes(1);
  });

  test('validates secondary output and preserves upstream errors', async () => {
    const getProduct = jest.fn().mockResolvedValue({ id: 123 });
    const client = await connect({ getProduct });
    const args = { domain: 'products', operation: 'siigo_get_product', arguments: { id } };
    expect((await call(client, 'siigo_execute_read', args)).isError).toBe(true);
    getProduct.mockRejectedValue(new Error('upstream unavailable'));
    const result = await call(client, 'siigo_execute_read', args);
    expect(result.isError).toBe(true);
    expect(result.structuredContent.error.message).toContain('upstream unavailable');
  });

  test('fetches only requested catalogs and prevalidates required document filters', async () => {
    const getTaxes = jest.fn().mockResolvedValue([]);
    const getPaymentTypes = jest.fn().mockResolvedValue([]);
    const client = await connect({ getTaxes, getPaymentTypes });
    const invalid = await call(client, 'siigo_get_catalogs', { catalogs: ['taxes', 'payment_types'] });
    expect(invalid.isError).toBe(true);
    expect(getTaxes).not.toHaveBeenCalled();
    const result = await call(client, 'siigo_get_catalogs', { catalogs: ['taxes', 'taxes', 'payment_types'], document_type: 'FV' });
    expect(result.structuredContent.result).toEqual({ taxes: [], payment_types: [] });
    expect(getTaxes).toHaveBeenCalledTimes(1);
    expect(getPaymentTypes).toHaveBeenCalledWith('FV', { signal: expect.any(AbortSignal) });
  });

  test('rejects unsupported document files before a read', async () => {
    const getPurchase = jest.fn();
    const client = await connect({ getPurchase });
    const result = await call(client, 'siigo_get_document', { type: 'purchase', id, files: ['xml'] });
    expect(result.isError).toBe(true);
    expect(getPurchase).not.toHaveBeenCalled();
  });

  test('validates report periods with the original contract before an API call', async () => {
    const getTrialBalance = jest.fn();
    const client = await connect({ getTrialBalance });
    const result = await call(client, 'siigo_get_report', {
      request: { report: 'trial_balance', filters: { year: 2026, month_start: 8, month_end: 2, includes_tax_difference: false } },
    });
    expect(result.isError).toBe(true);
    expect(getTrialBalance).not.toHaveBeenCalled();
  });

  test('loads only the selected secondary domain after discovery', () => {
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        `
      import { registerHooks } from 'node:module';
      const loaded = [];
      registerHooks({ load(url, context, next) { if (url.includes('/dist/tools/')) loaded.push(url); return next(url, context); } });
      const { Client, InMemoryTransport } = await import('@modelcontextprotocol/client');
      const { createMcpServer } = await import('./dist/index.js');
      const server = createMcpServer({});
      const client = new Client({name:'lazy',version:'1'});
      const [a,b] = InMemoryTransport.createLinkedPair();
      await server.connect(b); await client.connect(a); await client.listTools();
      const initial = [...loaded];
      await client.callTool({name:'siigo_discover_operations',arguments:{domain:'webhooks'}});
      console.log(JSON.stringify({initial, loaded}));
      await client.close(); await server?.close();
    `,
      ],
      { cwd: new URL('..', import.meta.url), encoding: 'utf8' },
    );
    expect(result.status).toBe(0);
    const { initial, loaded } = JSON.parse(result.stdout);
    expect(initial).toEqual([]);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toContain('/dist/tools/webhooks.js');
  });

  test('selects explicit legacy mode and rejects unknown profiles', () => {
    expect(parseToolProfile(undefined)).toBe('compact');
    expect(parseToolProfile('legacy')).toBe('legacy');
    expect(() => parseToolProfile('all')).toThrow('SIIGO_TOOL_PROFILE');
  });
});

const preparation = {
  customer_identification: '123',
  date: '2026-09-14',
  seller: 1,
  items: [{ code: 'ABC', quantity: 1, price: 100 }],
  payments: [{ id: 2, value: 100 }],
};
function preparationClient() {
  return {
    getCustomers: jest.fn().mockResolvedValue(page([{ identification: '123', branch_office: 0, active: true }])),
    getProducts: jest.fn().mockResolvedValue(page([{ code: 'ABC', active: true }])),
    getDocumentTypes: jest.fn().mockResolvedValue([{ id: 1, type: 'FV', active: true }]),
    getPaymentTypes: jest.fn().mockResolvedValue([{ id: 2, active: true, due_date: false }]),
    getTaxes: jest.fn().mockResolvedValue([]),
    createInvoice: jest.fn().mockResolvedValue({ id }),
  };
}

describe('invoice task', () => {
  test('prepares without writing, then creates with idempotency and cancellation intact', async () => {
    const siigo = preparationClient();
    const client = await connect(siigo);
    const prepared = await call(client, 'siigo_prepare_invoice', preparation);
    expect(prepared.isError).not.toBe(true);
    expect(prepared.structuredContent.result.ready).toBe(true);
    expect(siigo.createInvoice).not.toHaveBeenCalled();
    expect(siigo.getTaxes).not.toHaveBeenCalled();
    const invoice = prepared.structuredContent.result.invoice;
    const created = await call(client, 'siigo_create_invoice', { invoice, idempotency_key: 'Invoice2026091401' });
    expect(created.isError).not.toBe(true);
    expect(siigo.createInvoice).toHaveBeenCalledWith(invoice, { idempotencyKey: 'Invoice2026091401', signal: expect.any(AbortSignal) });
  });

  test('does not pick a customer branch when a later page contains another exact match', async () => {
    const siigo = preparationClient();
    siigo.getCustomers
      .mockResolvedValueOnce(page([{ identification: '123', branch_office: 0, active: true }], 101))
      .mockResolvedValueOnce(page([{ identification: '123', branch_office: 1, active: true }], 101, 2));
    const client = await connect(siigo);
    const result = await call(client, 'siigo_prepare_invoice', preparation);
    expect(result.structuredContent.result).toMatchObject({ ready: false, unresolved: [{ field: 'customer' }] });
    expect(result.structuredContent.result.invoice).toBeUndefined();
    expect(siigo.getCustomers).toHaveBeenCalledTimes(2);
    expect(siigo.createInvoice).not.toHaveBeenCalled();
  });

  test('reports invalid tax and missing payment due date without producing an invoice', async () => {
    const siigo = preparationClient();
    siigo.getPaymentTypes.mockResolvedValue([{ id: 2, active: true, due_date: true }]);
    const client = await connect(siigo);
    const result = await call(client, 'siigo_prepare_invoice', {
      ...preparation,
      items: [{ ...preparation.items[0], taxes: [{ id: 99 }] }],
    });
    expect(result.structuredContent.result.ready).toBe(false);
    expect(result.structuredContent.result.unresolved.map((entry) => entry.field)).toEqual(['items.taxes', 'payments']);
    expect(siigo.createInvoice).not.toHaveBeenCalled();
  });
});

test('propagates MCP cancellation through a secondary operation', async () => {
  const started = Promise.withResolvers();
  const cancelled = Promise.withResolvers();
  const getTaxes = jest.fn(
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
  const client = await connect({ getTaxes });
  const controller = new AbortController();
  const pending = client.callTool(
    { name: 'siigo_execute_read', arguments: { domain: 'catalogs', operation: 'siigo_get_taxes', arguments: {} } },
    { signal: controller.signal },
  );
  const rejection = expect(pending).rejects.toThrow();
  await started.promise;
  controller.abort(new Error('Cancelled by test'));
  await rejection;
  await expect(cancelled.promise).resolves.toBe(true);
});

test.each(['compact', 'legacy'])('serves the %s CLI profile over modern stdio', async (profile) => {
  const client = new Client({ name: 'stdio-test', version: '1' }, { versionNegotiation: { mode: { pin: '2026-07-28' } } });
  connections.push({ client });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['bin/siigo-mcp'],
    cwd: new URL('..', import.meta.url).pathname,
    env: {
      SIIGO_USERNAME: 'test',
      SIIGO_ACCESS_KEY: 'test',
      SIIGO_PARTNER_ID: 'test',
      SIIGO_TOOL_PROFILE: profile,
      MCP_TRANSPORT: 'stdio',
    },
    stderr: 'pipe',
  });
  await client.connect(transport);
  expect((await client.listTools()).tools).toHaveLength(profile === 'compact' ? 10 : 71);
});

test('rejects reusing another client’s operation registry', () => {
  const first = {};
  expect(() => createMcpServer({}, { operations: new OperationRegistry(first) })).toThrow('different Siigo client');
});
