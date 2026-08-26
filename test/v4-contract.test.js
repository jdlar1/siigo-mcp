import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

const mockAxiosInstance = {
  defaults: { headers: { common: {} } },
  post: jest.fn(),
  request: jest.fn(),
};

const mockAxios = {
  create: jest.fn(() => mockAxiosInstance),
  isAxiosError: jest.fn((error) => Boolean(error?.isAxiosError)),
};

jest.unstable_mockModule('axios', () => ({
  __esModule: true,
  default: mockAxios,
}));

const { createMcpServer } = await import('../dist/mcp-server.js');
const { SiigoClient } = await import('../dist/siigo-client.js');
const { creditNoteInputSchema, creditNoteResponseSchema } = await import('../dist/schemas/credit-notes.js');
const { customerInputSchema } = await import('../dist/schemas/customers.js');
const {
  creditNoteHealthcareCompanySchema,
  healthcareCompanySchema,
  invoiceBatchResponseSchema,
  invoiceEmailResponseSchema,
  invoiceItemSchema,
  invoiceResponseSchema,
} = await import('../dist/schemas/invoices.js');
const { productInputSchema, productResponseSchema } = await import('../dist/schemas/products.js');
const { quotationItemSchema, quotationResponseSchema } = await import('../dist/schemas/quotations.js');

const clientConfig = {
  username: 'test@example.com',
  accessKey: 'test-key',
  partnerId: 'test-partner',
  baseUrl: 'https://api.example.test',
};

function authenticateSuccessfully() {
  mockAxiosInstance.post.mockResolvedValue({
    data: {
      access_token: 'token',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: '*',
    },
  });
}

let connectedServer;
let connectedClient;

afterEach(async () => {
  await connectedClient?.close();
  await connectedServer?.close();
  connectedClient = undefined;
  connectedServer = undefined;
});

beforeEach(() => {
  mockAxios.create.mockReturnValue(mockAxiosInstance);
  mockAxios.isAxiosError.mockImplementation((error) => Boolean(error?.isAxiosError));
  mockAxiosInstance.defaults.headers.common = {};
  mockAxiosInstance.post.mockReset();
  mockAxiosInstance.request.mockReset();
});

describe('v4 Siigo contract boundaries', () => {
  test('uses the current plural misc-income catalog route', async () => {
    authenticateSuccessfully();
    mockAxiosInstance.request.mockResolvedValue({ data: [{ id: 1, name: 'Other income' }] });

    const client = new SiigoClient(clientConfig);
    const response = await client.getMiscIncome();

    expect(response).toEqual([{ id: 1, name: 'Other income' }]);
    expect(mockAxiosInstance.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/v1/misc-incomes',
      }),
    );
  });

  test('always forwards the required payment-type document filter', async () => {
    authenticateSuccessfully();
    mockAxiosInstance.request.mockResolvedValue({ data: [] });

    const client = new SiigoClient(clientConfig);
    await client.getPaymentTypes('FV');

    expect(mockAxiosInstance.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/v1/payment-types',
        params: { document_type: 'FV' },
      }),
    );
  });

  test('deduplicates concurrent authentication requests', async () => {
    let releaseAuthentication;
    mockAxiosInstance.post.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseAuthentication = resolve;
        }),
    );
    mockAxiosInstance.request.mockResolvedValue({ data: { id: 'resource' } });

    const client = new SiigoClient(clientConfig);
    const firstRequest = client.getProduct('first');
    const secondRequest = client.getProduct('second');

    expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);

    releaseAuthentication({
      data: {
        access_token: 'token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: '*',
      },
    });

    await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([{ id: 'resource' }, { id: 'resource' }]);
    expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
  });

  test('accepts documented customer phone entries without a number', () => {
    const parsed = customerInputSchema.safeParse({
      person_type: 'Company',
      id_type: '31',
      identification: '900123456',
      name: ['Example Company'],
      address: {
        address: 'Carrera 1 # 2-3',
        city: { country_code: 'CO', state_code: '11', city_code: '11001' },
      },
      phones: [{ indicative: '57' }],
      contacts: [{ first_name: 'Ana' }],
    });

    expect(parsed.success).toBe(true);
  });

  test('enforces current Colombian customer identification and phone formats', () => {
    const customer = {
      person_type: 'Person',
      id_type: '13',
      identification: '13832081',
      name: ['Ana', 'Pérez'],
      address: {
        address: 'Carrera 1 # 2-3',
        city: { country_code: 'CO', state_code: '11', city_code: '11001' },
      },
      contacts: [{ first_name: 'Ana' }],
    };

    expect(customerInputSchema.safeParse(customer).success).toBe(true);
    expect(customerInputSchema.safeParse({ ...customer, id_type: '99' }).success).toBe(false);
    expect(customerInputSchema.safeParse({ ...customer, identification: 'ABC123' }).success).toBe(false);
    expect(customerInputSchema.safeParse({ ...customer, id_type: '22', identification: 'ABC-123' }).success).toBe(false);
    expect(customerInputSchema.safeParse({ ...customer, phones: [{ number: 'abc xyz' }] }).success).toBe(false);
  });

  test('accepts the current customer response shape through MCP output validation', async () => {
    const customer = {
      id: '63f918c2-ca65-4edc-a7db-66bcdd5159fb',
      type: 'Customer',
      person_type: 'Person',
      id_type: { code: '13', name: 'Cédula de ciudadanía' },
      identification: '13832081',
      name: ['Ana', 'Pérez'],
      address: {
        address: 'Carrera 1 # 2-3',
        city: {
          country_code: 'CO',
          country_name: 'Colombia',
          state_code: '11',
          state_name: 'Bogotá D.C.',
          city_code: '11001',
          city_name: 'Bogotá',
        },
      },
      phones: [{ indicative: '57', number: '3006003345' }],
      contacts: [{ first_name: 'Ana' }],
      metadata: { created: '2026-08-26T00:00:00Z', last_updated: null },
    };
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    connectedServer = createMcpServer({ getCustomer: async () => customer });
    connectedClient = new Client({ name: 'customer-response-test-client', version: '1.0.0' }, { capabilities: {} });

    await connectedServer.connect(serverTransport);
    await connectedClient.connect(clientTransport);

    const result = await connectedClient.callTool({
      name: 'siigo_get_customer',
      arguments: { id: '63f918c2-ca65-4edc-a7db-66bcdd5159fb' },
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual({ result: customer });
  });

  test('accepts valid decimal amounts without floating-point false rejections', () => {
    expect(invoiceItemSchema.safeParse({ code: 'ITEM-1', quantity: 0.29, price: 10.12, discount: 0.07 }).success).toBe(true);
    expect(quotationItemSchema.safeParse({ code: 'ITEM-1', quantity: 0.29, price: 10.12, discount: 0.07 }).success).toBe(true);
    expect(
      productInputSchema.safeParse({
        code: 'ITEM-1',
        name: 'Decimal item',
        account_group: 1,
        prices: [{ currency_code: 'COP', price_list: [{ position: 1, value: 10.12 }] }],
      }).success,
    ).toBe(true);
    expect(
      creditNoteInputSchema.safeParse({
        document: { id: 1 },
        date: '2026-08-26',
        invoice: '4b79a35a-7604-4cd9-aefe-7736b32ce0d6',
        reason: 1,
        items: [{ code: 'ITEM-1', quantity: 0.29, price: 10.12, discount: 0.07 }],
        payments: [{ id: 1, value: 10.12 }],
      }).success,
    ).toBe(true);

    expect(invoiceItemSchema.safeParse({ code: 'ITEM-1', quantity: 0.071, price: 10.12 }).success).toBe(false);
    expect(
      creditNoteInputSchema.safeParse({
        document: { id: 1 },
        date: '2026-08-26',
        invoice: '4b79a35a-7604-4cd9-aefe-7736b32ce0d6',
        reason: 1,
        items: [{ code: 'ITEM-1', quantity: 1, price: 10.12 }],
        payments: [{ id: 1, value: 1.234 }],
      }).success,
    ).toBe(false);
    expect(quotationItemSchema.safeParse({ code: 'ITEM-1', quantity: 10_000_000, price: 1 }).success).toBe(false);
    expect(quotationItemSchema.safeParse({ code: 'ITEM-1', quantity: 1, price: 100_000_000_000 }).success).toBe(false);
    expect(
      productInputSchema.safeParse({
        code: 'ITEM-1',
        name: 'Over-precise item',
        account_group: 1,
        prices: [{ currency_code: 'COP', price_list: [{ position: 1, value: 10.123 }] }],
      }).success,
    ).toBe(false);
  });

  test('keeps invoice-only healthcare collection validation out of credit notes', () => {
    const healthcareWithoutCollection = {
      operation_type: 'SS-CUFE',
      period_start: '2026-08-01',
      period_end: '2026-08-31',
      contract_number: 'CONTRACT-2026-001',
    };
    const creditNote = {
      document: { id: 1 },
      date: '2026-08-26',
      invoice: '4b79a35a-7604-4cd9-aefe-7736b32ce0d6',
      items: [{ code: 'ITEM-1', quantity: 1, price: 10 }],
      payments: [{ id: 1, value: 10 }],
      healthcare_company: healthcareWithoutCollection,
    };

    expect(healthcareCompanySchema.safeParse(healthcareWithoutCollection).success).toBe(false);
    expect(creditNoteHealthcareCompanySchema.safeParse(healthcareWithoutCollection).success).toBe(true);
    expect(creditNoteInputSchema.safeParse(creditNote).success).toBe(true);
    expect(creditNoteInputSchema.safeParse({ ...creditNote, reason: 7 }).success).toBe(true);
  });

  test('accepts documented expanded sales response shapes', () => {
    const expandedItem = {
      id: 'line-1',
      code: 'ITEM-1',
      description: 'Service',
      quantity: 1,
      price: 10,
      discount: { percentage: 2, value: 0.2 },
      taxes: [{ id: 1, name: 'IVA', type: 'IVA', percentage: 19, value: 1.86 }],
      warehouse: { id: 2, name: 'Main warehouse' },
      total: 11.66,
    };

    expect(
      invoiceResponseSchema.safeParse({
        id: 'invoice-1',
        prefix: 'FV',
        annulled: false,
        items: [expandedItem],
        retentions: [{ id: 3, name: 'Withholding', type: 'Retefuente', percentage: 1, value: 0.1 }],
        global_charges: [{ id: 4, name: 'Charge', percentage: 1, value: 0.1 }],
      }).success,
    ).toBe(true);
    expect(
      creditNoteResponseSchema.safeParse({
        id: 'credit-note-1',
        customer: { id: 'customer-1', identification: '900123456', branch_office: 0 },
        items: [expandedItem],
        retentions: [{ id: 3, name: 'Withholding', type: 'Retefuente', percentage: 1, value: 0.1 }],
      }).success,
    ).toBe(true);
    expect(
      productResponseSchema.safeParse({
        id: 'product-1',
        code: 'ITEM-1',
        name: 'Product',
        account_group: { id: 1, name: 'Goods' },
        taxes: [{ id: 1, name: 'IVA', type: 'IVA', percentage: 19, value: 1.9 }],
        prices: [{ currency_code: 'COP', price_list: [{ position: 1, name: 'Retail', value: 10 }] }],
      }).success,
    ).toBe(true);
    expect(
      quotationResponseSchema.safeParse({
        id: 'quotation-1',
        items: [{ ...expandedItem, discount: { percentage: 2, value: 0.2 } }],
      }).success,
    ).toBe(true);
  });

  test('models documented invoice email and batch responses', () => {
    expect(invoiceEmailResponseSchema.safeParse({ status: 'Sent', observations: 'Queued for delivery' }).success).toBe(true);
    expect(invoiceBatchResponseSchema.safeParse({ id: 'batch-1', status: 'Received', received_at: '2026-08-26T00:00:00Z' }).success).toBe(
      true,
    );
    expect(invoiceBatchResponseSchema.safeParse({ status: 'Received' }).success).toBe(false);
  });

  test('propagates idempotency keys and retries transient idempotent failures', async () => {
    authenticateSuccessfully();
    const transientFailure = {
      isAxiosError: true,
      message: 'Service unavailable',
      response: {
        status: 503,
        headers: { 'retry-after': '0' },
        data: { Errors: [{ Message: 'Service unavailable' }] },
      },
    };
    mockAxiosInstance.request.mockRejectedValueOnce(transientFailure).mockResolvedValueOnce({ data: { id: 'invoice-1' } });

    const client = new SiigoClient(clientConfig);
    const result = await client.createInvoice({ document: { id: 1 } }, { idempotencyKey: 'invoice123' });

    expect(result).toEqual({ id: 'invoice-1' });
    expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);
    expect(mockAxiosInstance.request).toHaveBeenLastCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '/v1/invoices',
        data: { document: { id: 1 } },
        headers: { 'Idempotency-Key': 'invoice123' },
      }),
    );
  });

  test('stops before the HTTP request when the caller signal is already aborted', async () => {
    authenticateSuccessfully();
    const controller = new AbortController();
    controller.abort();

    const client = new SiigoClient(clientConfig);

    await expect(client.getProduct('cancelled', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
      message: 'Request aborted',
    });
    expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    expect(mockAxiosInstance.request).not.toHaveBeenCalled();
  });

  test('cancels authentication when its last waiting caller aborts', async () => {
    let authenticationSignal;
    mockAxiosInstance.post.mockImplementation((_path, _credentials, config) => {
      authenticationSignal = config.signal;

      return new Promise((_resolve, reject) => {
        config.signal.addEventListener('abort', () => reject({ isAxiosError: true, message: 'Authentication cancelled' }), { once: true });
      });
    });

    const controller = new AbortController();
    const client = new SiigoClient(clientConfig);
    const request = client.getProduct('cancelled-during-auth', { signal: controller.signal });

    expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    controller.abort();

    await expect(request).rejects.toMatchObject({ name: 'AbortError', message: 'Request aborted' });
    expect(authenticationSignal.aborted).toBe(true);
    expect(mockAxiosInstance.request).not.toHaveBeenCalled();
  });

  test('cancels promptly without bypassing a blocked rate-limit queue', async () => {
    authenticateSuccessfully();
    let releaseBlockedTurn;
    const blockedTurn = new Promise((resolve) => {
      releaseBlockedTurn = resolve;
    });
    const controller = new AbortController();
    const client = new SiigoClient(clientConfig);
    client.rateLimitTail = blockedTurn;
    const request = client.getProduct('queued', { signal: controller.signal });

    await new Promise((resolve) => setImmediate(resolve));
    expect(client.rateLimitTail).not.toBe(blockedTurn);
    controller.abort();

    const outcome = await Promise.race([
      request.then(
        () => 'resolved',
        (error) => error.name,
      ),
      new Promise((resolve) => setImmediate(() => resolve('still-pending'))),
    ]);
    releaseBlockedTurn();

    expect(outcome).toBe('AbortError');
    await expect(request).rejects.toMatchObject({ name: 'AbortError', message: 'Request aborted' });
    expect(mockAxiosInstance.request).not.toHaveBeenCalled();
  });

  test('exposes the current MCP catalog surface without known false catalog endpoints', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    connectedServer = createMcpServer({});
    connectedClient = new Client({ name: 'v4-contract-test-client', version: '1.0.0' }, { capabilities: {} });

    await connectedServer.connect(serverTransport);
    await connectedClient.connect(clientTransport);

    const tools = await connectedClient.listTools();
    const names = tools.tools.map((tool) => tool.name);

    expect(names).toEqual(expect.arrayContaining(['siigo_get_misc_income', 'siigo_get_payment_types']));
    expect(names).not.toEqual(expect.arrayContaining(['siigo_get_cities', 'siigo_get_id_types', 'siigo_get_fiscal_responsibilities']));
  });

  test('rejects a customer CUCON value that exceeds the current 64-character limit', async () => {
    const createCustomer = jest.fn();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    connectedServer = createMcpServer({ createCustomer });
    connectedClient = new Client({ name: 'v4-customer-contract-test-client', version: '1.0.0' }, { capabilities: {} });

    await connectedServer.connect(serverTransport);
    await connectedClient.connect(clientTransport);

    const result = await connectedClient.callTool({
      name: 'siigo_create_customer',
      arguments: {
        customer: {
          type: 'Customer',
          person_type: 'Company',
          id_type: '13',
          identification: '900123456',
          name: ['Example Company'],
          address: {
            address: 'Carrera 1 # 2-3',
            city: { country_code: 'CO', state_code: '11', city_code: '11001' },
          },
          contacts: [{ first_name: 'Ana', email: 'ana@example.com' }],
          custom_fields: [{ key: 'CUCON', value: 'x'.repeat(65) }],
        },
      },
    });

    expect(result.isError).toBe(true);
    expect(createCustomer).not.toHaveBeenCalled();
  });

  test('rejects obsolete healthcare payment codes at the MCP boundary', async () => {
    const createInvoice = jest.fn();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    connectedServer = createMcpServer({ createInvoice });
    connectedClient = new Client({ name: 'v4-healthcare-contract-test-client', version: '1.0.0' }, { capabilities: {} });

    await connectedServer.connect(serverTransport);
    await connectedClient.connect(clientTransport);

    const result = await connectedClient.callTool({
      name: 'siigo_create_invoice',
      arguments: {
        invoice: {
          document: { id: 1 },
          date: '2026-08-26',
          customer: { identification: '900123456' },
          seller: 1,
          items: [{ code: 'SERVICE', quantity: 1, price: 100 }],
          payments: [{ id: 1, value: 100 }],
          healthcare_company: {
            operation_type: 'SS-CUFE',
            period_start: '2026-08-01',
            period_end: '2026-08-31',
            payment_method: '05',
            non_contract_invoice_reason: '01',
            copayment: 100,
          },
        },
      },
    });

    expect(result.isError).toBe(true);
    expect(createInvoice).not.toHaveBeenCalled();
  });
});
