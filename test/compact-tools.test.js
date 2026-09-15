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
async function prepare(client, input, type = 'invoice') {
  return call(client, 'siigo_prepare_document', { type, input });
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
  test.each([
    ['compact', 'create', createMcpServer],
    ['compact', 'update', createMcpServer],
    ['legacy', 'create', createLegacyMcpServer],
    ['legacy', 'update', createLegacyMcpServer],
  ])('%s purchase %s validates suppliers and precision before calling Siigo', async (profile, action, factory) => {
    const purchase = {
      document: { id: 1 },
      date: '2026-09-15',
      supplier: { identification: '900123456' },
      provider_invoice: { prefix: 'TEST', number: '1' },
      items: [{ type: 'Account', code: '51010101', quantity: 0.29, price: 1.123456 }],
      payments: [{ id: 1, value: 0.07 }],
    };
    const write = jest.fn().mockResolvedValue({ ...purchase, id });
    const client = await connect({ [action === 'create' ? 'createPurchase' : 'updatePurchase']: write }, factory);
    const invoke = (payload) => {
      const operation = `siigo_${action}_purchase`;
      const args = action === 'create' ? { purchase: payload } : { id, purchase: payload };
      return profile === 'compact'
        ? call(client, 'siigo_execute_write', { domain: 'purchases', operation, arguments: args })
        : call(client, operation, args);
    };
    const invalid = [
      { ...purchase, items: [{ ...purchase.items[0], supplier: 1 }] },
      { ...purchase, supplier_by_item: false, items: [{ ...purchase.items[0], supplier: 1 }] },
      { ...purchase, items: [{ ...purchase.items[0], quantity: 0.291 }] },
      { ...purchase, items: [{ ...purchase.items[0], price: 1.1234567 }] },
      { ...purchase, items: [{ ...purchase.items[0], price: 1e-7 }] },
      { ...purchase, payments: [{ id: 1, value: 0.071 }] },
    ];
    for (const payload of invalid) {
      expect((await invoke(payload)).isError).toBe(true);
    }
    expect(write).not.toHaveBeenCalled();

    for (const payload of [
      purchase,
      { ...purchase, supplier_by_item: false },
      { ...purchase, supplier_by_item: true, items: [{ ...purchase.items[0], supplier: 1, price: 1e-6 }] },
    ]) {
      expect((await invoke(payload)).isError).not.toBe(true);
      const options = { signal: expect.any(AbortSignal) };
      expect(write).toHaveBeenLastCalledWith(...(action === 'create' ? [payload, options] : [id, payload, options]));
    }
    expect(write).toHaveBeenCalledTimes(3);
  });

  test('keeps eight tools stable and reduces advertised bytes by at least 90%, preserving all legacy operations through discovery', async () => {
    const compact = await connect();
    const legacy = await connect({}, createLegacyMcpServer);
    const before = (await compact.listTools()).tools;
    const old = (await legacy.listTools()).tools;
    expect(before.map(({ name }) => name).sort()).toEqual(
      [
        'siigo_search',
        'siigo_get_record',
        'siigo_prepare_document',
        'siigo_create_document',
        'siigo_discover_operations',
        'siigo_execute_read',
        'siigo_execute_write',
        'siigo_execute_destructive',
      ].sort(),
    );
    expect(Buffer.byteLength(JSON.stringify(before))).toBeLessThan(Buffer.byteLength(JSON.stringify(old)) * 0.1);
    expect(Buffer.byteLength(JSON.stringify(before))).toBeLessThan(25000);
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

  test('discovers catalog schemas and validates required filters before reading', async () => {
    const getPaymentTypes = jest.fn().mockResolvedValue([]);
    const client = await connect({ getPaymentTypes });
    const discovery = await call(client, 'siigo_discover_operations', { domain: 'catalogs', query: 'payment' });
    const operation = discovery.structuredContent.result.operations.find((entry) => entry.operation === 'siigo_get_payment_types');
    expect(operation.operation).toBe('siigo_get_payment_types');
    const args = { domain: 'catalogs', operation: operation.operation, arguments: {} };
    expect((await call(client, operation.executor, args)).isError).toBe(true);
    expect(getPaymentTypes).not.toHaveBeenCalled();
    const result = await call(client, operation.executor, { ...args, arguments: { document_type: 'FV' } });
    expect(result.structuredContent.result).toEqual([]);
    expect(getPaymentTypes).toHaveBeenCalledWith('FV', { signal: expect.any(AbortSignal) });
  });

  test('rejects unsupported document files before a read', async () => {
    const getPurchase = jest.fn();
    const client = await connect({ getPurchase });
    const result = await call(client, 'siigo_get_record', { type: 'purchase', id, files: ['xml'] });
    expect(result.isError).toBe(true);
    expect(getPurchase).not.toHaveBeenCalled();
  });

  test('validates report periods with the original contract before an API call', async () => {
    const getTrialBalance = jest.fn();
    const client = await connect({ getTrialBalance });
    const result = await call(client, 'siigo_execute_read', {
      domain: 'reports',
      operation: 'siigo_get_trial_balance',
      arguments: { year: 2026, month_start: 8, month_end: 2, includes_tax_difference: false },
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
  test.each([
    [{ automatic_number: false, consecutive: 42 }, 'number'],
    [{ cost_center_mandatory: true, cost_center_default: 7 }, 'cost_center'],
    [{ healthcare_company: true }, 'healthcare_company'],
  ])('reports document requirements %j without producing an executable invoice', async (settings, field) => {
    const siigo = preparationClient();
    siigo.getDocumentTypes.mockResolvedValue([{ id: 1, type: 'FV', active: true, ...settings }]);
    const client = await connect(siigo);
    const result = await prepare(client, preparation);
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent.result).toMatchObject({
      ready: false,
      unresolved: [{ field, message: expect.stringContaining('siigo_create_document') }],
    });
    expect(result.structuredContent.result.creation).toBeUndefined();
    expect(siigo.createInvoice).not.toHaveBeenCalled();
  });

  test('requires each item seller when configured and preserves caller-selected sellers', async () => {
    const siigo = preparationClient();
    siigo.getDocumentTypes.mockResolvedValue([{ id: 1, type: 'FV', active: true, seller_by_item: true }]);
    const client = await connect(siigo);
    const items = [{ ...preparation.items[0], seller: 9 }, { ...preparation.items[0] }];
    const rejected = await prepare(client, { ...preparation, items });
    expect(rejected.structuredContent.result).toMatchObject({ ready: false, unresolved: [{ field: 'items.1.seller' }] });
    expect(rejected.structuredContent.result.creation).toBeUndefined();

    items[1].seller = 10;
    const prepared = await prepare(client, { ...preparation, items });
    expect(prepared.structuredContent.result).toMatchObject({ ready: true, creation: { type: 'invoice', payload: { seller: 1, items } } });
    expect(siigo.createInvoice).not.toHaveBeenCalled();
  });

  test('does not apply settings from an ambiguous document selection', async () => {
    const siigo = preparationClient();
    siigo.getDocumentTypes.mockResolvedValue([
      { id: 1, type: 'FV', active: true, automatic_number: false },
      { id: 2, type: 'FV', active: true, healthcare_company: true },
    ]);
    const client = await connect(siigo);
    const result = await prepare(client, preparation);
    expect(result.structuredContent.result.unresolved.map(({ field }) => field)).toEqual(['document']);
    expect(result.structuredContent.result.ready).toBe(false);
  });

  test('prepares without writing, then creates with idempotency and cancellation intact', async () => {
    const siigo = preparationClient();
    const client = await connect(siigo);
    const prepared = await prepare(client, preparation);
    expect(prepared.isError).not.toBe(true);
    expect(prepared.structuredContent.result.ready).toBe(true);
    expect(siigo.createInvoice).not.toHaveBeenCalled();
    expect(siigo.getTaxes).not.toHaveBeenCalled();
    const invoice = prepared.structuredContent.result.creation.payload;
    const created = await call(client, 'siigo_create_document', {
      type: 'invoice',
      payload: invoice,
      idempotency_key: 'Invoice2026091401',
    });
    expect(created.isError).not.toBe(true);
    expect(siigo.createInvoice).toHaveBeenCalledWith(invoice, { idempotencyKey: 'Invoice2026091401', signal: expect.any(AbortSignal) });
  });

  test('does not pick a customer branch when a later page contains another exact match', async () => {
    const siigo = preparationClient();
    siigo.getCustomers
      .mockResolvedValueOnce(page([{ identification: '123', branch_office: 0, active: true }], 101))
      .mockResolvedValueOnce(page([{ identification: '123', branch_office: 1, active: true }], 101, 2));
    const client = await connect(siigo);
    const result = await prepare(client, preparation);
    expect(result.structuredContent.result).toMatchObject({ ready: false, unresolved: [{ field: 'customer' }] });
    expect(result.structuredContent.result.creation).toBeUndefined();
    expect(siigo.getCustomers).toHaveBeenCalledTimes(2);
    expect(siigo.createInvoice).not.toHaveBeenCalled();
  });

  test('reports invalid tax and missing payment due date without producing an invoice', async () => {
    const siigo = preparationClient();
    siigo.getPaymentTypes.mockResolvedValue([{ id: 2, active: true, due_date: true }]);
    const client = await connect(siigo);
    const result = await prepare(client, {
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
  expect((await client.listTools()).tools).toHaveLength(profile === 'compact' ? 8 : 71);
});

test('rejects reusing another client’s operation registry', () => {
  const first = {};
  expect(() => createMcpServer({}, { operations: new OperationRegistry(first) })).toThrow('different Siigo client');
});

const baseDocument = { document: { id: 1 }, date: '2026-09-15' };
const party = { identification: '123', branch_office: 0 };
const salesItems = [{ code: 'ABC', quantity: 1, price: 100 }];
const purchaseItems = [{ type: 'Product', code: 'ABC', quantity: 1, price: 100 }];
const payment = { id: 2, value: 100 };
const creationCases = [
  ['invoice', 'invoices', 'createInvoice', { ...baseDocument, customer: party, seller: 1, items: salesItems, payments: [payment] }, true],
  ['quotation', 'quotations', 'createQuotation', { ...baseDocument, customer: party, seller: 1, items: salesItems }, false],
  [
    'purchase',
    'purchases',
    'createPurchase',
    {
      ...baseDocument,
      supplier: party,
      provider_invoice: { prefix: 'TEST', number: '1' },
      items: purchaseItems,
      payments: [payment],
    },
    false,
  ],
  ['voucher', 'vouchers', 'createVoucher', { ...baseDocument, customer: party, type: 'AdvancePayment', payment }, true],
  ['credit_note', 'credit_notes', 'createCreditNote', { ...baseDocument, invoice: id, items: salesItems, payments: [payment] }, true],
  [
    'payment_receipt',
    'payment_receipts',
    'createPaymentReceipt',
    { ...baseDocument, supplier: party, type: 'AdvancePayment', payment },
    false,
  ],
  [
    'purchase_support_document',
    'purchase_support_documents',
    'createPurchaseSupportDocument',
    {
      ...baseDocument,
      supplier: party,
      supplier_receipt_number: { prefix: 'TEST', number: '1' },
      items: purchaseItems,
      payments: [payment],
    },
    false,
  ],
  [
    'journal',
    'journals',
    'createJournal',
    {
      ...baseDocument,
      items: [
        { account: { code: '11050501', movement: 'Debit' }, value: 100 },
        { account: { code: '13050501', movement: 'Credit' }, value: 100 },
      ],
    },
    true,
  ],
];

describe('document workflows', () => {
  test.each(creationCases)(
    'discovers and creates %s with exact validation and idempotency support',
    async (type, domain, method, payload, idempotent) => {
      const write = jest.fn().mockResolvedValue({ ...payload, id });
      const client = await connect({ [method]: write });
      const discovered = await call(client, 'siigo_discover_operations', { domain, query: `siigo_create_${type}`, limit: 20 });
      expect(discovered.isError).not.toBe(true);
      const operation = discovered.structuredContent.result.operations.find((entry) => entry.creation?.type === type);
      expect(operation.creation).toMatchObject({
        tool: 'siigo_create_document',
        type,
        supports_idempotency_key: idempotent,
        payloadSchema: expect.any(Object),
      });
      expect(Boolean(operation.preparation)).toBe(['invoice', 'quotation', 'purchase', 'voucher'].includes(type));
      expect(write).not.toHaveBeenCalled();
      expect((await call(client, 'siigo_create_document', { type, payload: { ...payload, unexpected: true } })).isError).toBe(true);
      if (!idempotent) {
        expect((await call(client, 'siigo_create_document', { type, payload, idempotency_key: 'Document20260915' })).isError).toBe(true);
      }
      expect(write).not.toHaveBeenCalled();
      const args = { type, payload, ...(idempotent ? { idempotency_key: 'Document20260915' } : {}) };
      const created = await call(client, 'siigo_create_document', args);
      expect(created.isError).not.toBe(true);
      expect(created.structuredContent.result.id).toBe(id);
      expect(write).toHaveBeenCalledTimes(1);
      expect(write).toHaveBeenCalledWith(payload, {
        signal: expect.any(AbortSignal),
        ...(idempotent ? { idempotencyKey: 'Document20260915' } : {}),
      });
    },
  );

  test('routes miscellaneous income vouchers through their dedicated operation variant', async () => {
    const payload = { ...baseDocument, customer: party, type: 'MiscIncome', income: { id: 4 }, payment };
    const createMiscIncomeVoucher = jest.fn().mockResolvedValue({ ...payload, id });
    const client = await connect({ createMiscIncomeVoucher });
    const result = await call(client, 'siigo_create_document', { type: 'voucher', payload, idempotency_key: 'Misc20260915' });
    expect(result.isError).not.toBe(true);
    expect(createMiscIncomeVoucher).toHaveBeenCalledWith(payload, { idempotencyKey: 'Misc20260915', signal: expect.any(AbortSignal) });
  });

  test.each([
    ['quotation', 'C', { customer_identification: '123', date: baseDocument.date, seller: 1, items: salesItems }, 'createQuotation'],
    [
      'purchase',
      'FC',
      {
        supplier_identification: '123',
        date: baseDocument.date,
        provider_invoice: { prefix: 'TEST', number: '1' },
        items: purchaseItems,
        payments: [payment],
      },
      'createPurchase',
    ],
    ['voucher', 'RC', { customer_identification: '123', date: baseDocument.date, type: 'AdvancePayment', payment }, 'createVoucher'],
    [
      'voucher',
      'RC',
      {
        customer_identification: '123',
        date: baseDocument.date,
        type: 'DebtPayment',
        payment,
        items: [{ due: { prefix: 'FV-1', consecutive: 3, quote: 1 }, value: 100 }],
      },
      'createVoucher',
    ],
  ])('prepares %s references and creates the returned document without altering caller choices', async (type, code, input, method) => {
    const siigo = preparationClient();
    siigo.getDocumentTypes.mockResolvedValue([{ id: 7, type: code, active: true }]);
    siigo[method] = jest.fn().mockImplementation(async (payload) => ({ ...payload, id }));
    const client = await connect(siigo);
    const prepared = await prepare(client, input, type);
    expect(prepared.isError).not.toBe(true);
    const result = prepared.structuredContent.result;
    expect(result).toMatchObject({ ready: true, unresolved: [], creation: { type, payload: { document: { id: 7 } } } });
    expect(result.creation.payload[type === 'purchase' ? 'supplier' : 'customer']).toEqual(party);
    expect(siigo[method]).not.toHaveBeenCalled();
    expect(siigo.getDocumentTypes).toHaveBeenCalledWith(code, { signal: expect.any(AbortSignal) });
    if (type === 'quotation') expect(siigo.getPaymentTypes).not.toHaveBeenCalled();
    else expect(siigo.getPaymentTypes).toHaveBeenCalledWith(code, { signal: expect.any(AbortSignal) });
    if (type === 'voucher') {
      expect(siigo.getProducts).not.toHaveBeenCalled();
      expect(result.validation).toContain('debt balances');
    }
    const created = await call(client, 'siigo_create_document', result.creation);
    expect(created.isError).not.toBe(true);
    expect(siigo[method]).toHaveBeenCalledWith(result.creation.payload, expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  test('validates purchase precision and supplier flags before reference lookups', async () => {
    const siigo = preparationClient();
    const client = await connect(siigo);
    const input = {
      supplier_identification: '123',
      date: baseDocument.date,
      provider_invoice: { prefix: 'TEST', number: '1' },
      payments: [payment],
    };
    for (const item of [
      { ...purchaseItems[0], supplier: 3 },
      { ...purchaseItems[0], quantity: 0.001 },
    ]) {
      expect((await prepare(client, { ...input, items: [item] }, 'purchase')).isError).toBe(true);
    }
    expect(siigo.getCustomers).not.toHaveBeenCalled();
    expect(siigo.getDocumentTypes).not.toHaveBeenCalled();
  });

  test('does not treat an incomplete ten-page lookup as a unique match', async () => {
    const siigo = preparationClient();
    siigo.getCustomers.mockResolvedValue(page([{ identification: '123', active: true }], 1001));
    const client = await connect(siigo);
    const result = await prepare(client, preparation);
    expect(result.isError).toBe(true);
    expect(result.structuredContent.error.message).toContain('exceeded 10 pages');
    expect(siigo.getCustomers).toHaveBeenCalledTimes(10);
    expect(siigo.getDocumentTypes).not.toHaveBeenCalled();
    expect(siigo.createInvoice).not.toHaveBeenCalled();
  });

  test('propagates lookup failures without returning a creation object', async () => {
    const siigo = preparationClient();
    siigo.getProducts.mockRejectedValue(new Error('product lookup unavailable'));
    const result = await prepare(await connect(siigo), preparation);
    expect(result.isError).toBe(true);
    expect(result.structuredContent.error.message).toContain('product lookup unavailable');
    expect(result.structuredContent.result).toBeUndefined();
    expect(siigo.createInvoice).not.toHaveBeenCalled();
  });

  test('preserves write failures without retrying or hiding upstream context', async () => {
    const createQuotation = jest.fn().mockRejectedValue(new Error('upstream write timed out'));
    const client = await connect({ createQuotation });
    const result = await call(client, 'siigo_create_document', { type: 'quotation', payload: creationCases[1][3] });
    expect(result.isError).toBe(true);
    expect(result.structuredContent.error.message).toContain('upstream write timed out');
    expect(createQuotation).toHaveBeenCalledTimes(1);
  });
});

describe('record tasks', () => {
  test.each([
    ['quotations', 'getQuotations'],
    ['purchases', 'getPurchases'],
    ['vouchers', 'getVouchers'],
    ['credit_notes', 'getCreditNotes'],
    ['journals', 'getJournals'],
    ['payment_receipts', 'getPaymentReceipts'],
  ])('searches %s without changing filters or pagination', async (entity, method) => {
    const read = jest.fn().mockResolvedValue(page([]));
    const client = await connect({ [method]: read });
    const filters = { ...(entity === 'payment_receipts' ? { created_start: '2026-09-15' } : { name: 'TEST-1' }), page: 2, page_size: 10 };
    const result = await call(client, 'siigo_search', { query: { entity, mode: 'list', filters } });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent.result).toEqual(page([]));
    expect(read).toHaveBeenCalledWith(filters, { signal: expect.any(AbortSignal) });
  });

  test.each([
    ['customer', 'getCustomer'],
    ['product', 'getProduct'],
  ])('reads a selected %s UUID', async (type, method) => {
    const read = jest.fn().mockResolvedValue({ id });
    const client = await connect({ [method]: read });
    const result = await call(client, 'siigo_get_record', { type, id });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent.result).toEqual({ id });
    expect(read).toHaveBeenCalledWith(id, { signal: expect.any(AbortSignal) });
    expect((await call(client, 'siigo_get_record', { type, id, include_stamp_errors: true })).isError).toBe(true);
    expect(read).toHaveBeenCalledTimes(1);
  });

  test('combines an invoice with requested files and DIAN errors, preserving attachment failures', async () => {
    const siigo = {
      getInvoice: jest.fn().mockResolvedValue({ id }),
      getInvoicePdf: jest.fn().mockResolvedValue({ base64: 'cGRm' }),
      getInvoiceXml: jest.fn().mockResolvedValue({ base64: 'eG1s' }),
      getInvoiceStampErrors: jest.fn().mockResolvedValue({ errors: [{ message: 'Rejected by DIAN' }] }),
    };
    const client = await connect(siigo);
    const args = { type: 'invoice', id, files: ['pdf', 'xml'], include_stamp_errors: true };
    const result = await call(client, 'siigo_get_record', args);
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent.result).toEqual({
      record: { id },
      files: { pdf: { base64: 'cGRm' }, xml: { base64: 'eG1s' } },
      stamp_errors: { errors: [{ message: 'Rejected by DIAN' }] },
    });
    for (const read of Object.values(siigo)) expect(read).toHaveBeenCalledWith(id, { signal: expect.any(AbortSignal) });
    siigo.getInvoicePdf.mockRejectedValue(new Error('PDF unavailable'));
    expect((await call(client, 'siigo_get_record', args)).structuredContent.error.message).toContain('PDF unavailable');
    expect(siigo.getInvoiceXml).toHaveBeenCalledTimes(1);
    expect(siigo.getInvoiceStampErrors).toHaveBeenCalledTimes(1);
  });
});

test.each(['prepare', 'create'])('propagates cancellation during document %s', async (phase) => {
  const started = Promise.withResolvers();
  const cancelled = Promise.withResolvers();
  const blocked = jest.fn(
    (_args, { signal }) =>
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
  const siigo = preparationClient();
  siigo[phase === 'prepare' ? 'getCustomers' : 'createInvoice'] = blocked;
  const client = await connect(siigo);
  const controller = new AbortController();
  const pending = client.callTool(
    {
      name: phase === 'prepare' ? 'siigo_prepare_document' : 'siigo_create_document',
      arguments: phase === 'prepare' ? { type: 'invoice', input: preparation } : { type: 'invoice', payload: creationCases[0][3] },
    },
    { signal: controller.signal },
  );
  const rejection = expect(pending).rejects.toThrow();
  await started.promise;
  controller.abort(new Error('Cancelled by test'));
  await rejection;
  await expect(cancelled.promise).resolves.toBe(true);
  if (phase === 'prepare') expect(siigo.getDocumentTypes).not.toHaveBeenCalled();
  expect(blocked).toHaveBeenCalledTimes(1);
});

test('search preserves endpoint-specific validation behind the shared filter schema', async () => {
  const reads = {
    getProducts: jest.fn(),
    getCustomers: jest.fn(),
    getPaymentReceipts: jest.fn(),
    getPurchases: jest.fn(),
    searchCustomers: jest.fn(),
  };
  const client = await connect(reads);
  for (const query of [
    { entity: 'products', mode: 'list', filters: { code: 'x'.repeat(31) } },
    { entity: 'products', mode: 'list', filters: { type: 'Supplier' } },
    { entity: 'customers', mode: 'list', filters: { name: 'Acme' } },
    { entity: 'customers', mode: 'list', filters: { stock_control: true } },
    { entity: 'payment_receipts', mode: 'list', filters: { name: 'RP-1-1' } },
    { entity: 'purchases', mode: 'list', filters: { created_start: '2026-09-15' } },
    { entity: 'products', mode: 'partial', filters: { code: 'ABC' } },
    { entity: 'customer_matches', mode: 'list', filters: { name: 'Acme' } },
    { entity: 'customer_matches', mode: 'partial', filters: { active: true } },
  ]) {
    expect((await call(client, 'siigo_search', { query })).isError).toBe(true);
  }
  for (const read of Object.values(reads)) expect(read).not.toHaveBeenCalled();
});

test('the shared search schema advertises every supported legacy filter', async () => {
  const compact = await connect();
  const legacy = await connect({}, createLegacyMcpServer);
  const search = (await compact.listTools()).tools.find(({ name }) => name === 'siigo_search');
  const filters = search.inputSchema.properties.query.properties.filters.properties;
  const names = [
    'siigo_get_customers',
    'siigo_get_products',
    'siigo_get_invoices',
    'siigo_get_quotations',
    'siigo_get_purchases',
    'siigo_get_vouchers',
    'siigo_get_credit_notes',
    'siigo_get_journals',
    'siigo_get_payment_receipts',
    'siigo_search_customers',
    'siigo_search_products',
  ];
  for (const tool of (await legacy.listTools()).tools.filter(({ name }) => names.includes(name))) {
    for (const key of Object.keys(tool.inputSchema.properties)) expect(filters).toHaveProperty(key);
  }
});

test('purchase preparation requires an explicit branch when the supplier identification is ambiguous', async () => {
  const siigo = preparationClient();
  siigo.getCustomers.mockResolvedValue(
    page([
      { identification: '123', branch_office: 0, active: true },
      { identification: '123', branch_office: 1, active: true },
    ]),
  );
  siigo.getDocumentTypes.mockResolvedValue([{ id: 1, type: 'FC', active: true }]);
  const client = await connect(siigo);
  const input = {
    supplier_identification: '123',
    date: baseDocument.date,
    provider_invoice: { prefix: 'TEST', number: '1' },
    items: purchaseItems,
    payments: [payment],
  };
  const ambiguous = await prepare(client, input, 'purchase');
  expect(ambiguous.structuredContent.result).toMatchObject({
    ready: false,
    unresolved: [{ field: 'supplier', candidates: [{ branch_office: 0 }, { branch_office: 1 }] }],
  });
  expect(ambiguous.structuredContent.result.creation).toBeUndefined();
  const selected = await prepare(client, { ...input, branch_office: 1 }, 'purchase');
  expect(selected.structuredContent.result).toMatchObject({
    ready: true,
    creation: { payload: { supplier: { identification: '123', branch_office: 1 } } },
  });
});
