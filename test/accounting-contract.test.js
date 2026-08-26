import { afterEach, describe, expect, test } from '@jest/globals';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../dist/mcp-server.js';
import { deleteResponseSchema } from '../dist/schemas/common.js';
import { journalSchema } from '../dist/schemas/journals.js';
import {
  paymentReceiptListQuerySchema,
  paymentReceiptResponseSchema,
  paymentReceiptSchema,
  paymentReceiptUpdateToolSchema,
} from '../dist/schemas/payment-receipts.js';
import { supportDocumentResponseSchema, supportDocumentUpdateSchema } from '../dist/schemas/purchase-support-documents.js';
import { purchaseResponseSchema, purchaseUpdateSchema } from '../dist/schemas/purchases.js';
import { accountsPayableQuerySchema, accountsPayableResponseSchema } from '../dist/schemas/reports.js';
import { voucherListQuerySchema, voucherResponseSchema, voucherSchema } from '../dist/schemas/vouchers.js';

let connectedServer;
let connectedClient;

afterEach(async () => {
  await connectedClient?.close();
  await connectedServer?.close();
  connectedClient = undefined;
  connectedServer = undefined;
});

describe('v4 accounting contracts', () => {
  test('requires complete replacement payloads for purchase PUT operations', () => {
    expect(purchaseUpdateSchema.safeParse({ observations: 'partial' }).success).toBe(false);
    expect(supportDocumentUpdateSchema.safeParse({ observations: 'partial' }).success).toBe(false);
  });

  test('requires exactly one payment shape for DebtPayment payment receipts', () => {
    const baseReceipt = {
      document: { id: 1 },
      date: '2026-08-26',
      type: 'DebtPayment',
      supplier: { identification: '900123456' },
      items: [{ due: { prefix: 'FC-1', consecutive: 1, quote: 1, date: '2026-08-26' }, value: 100 }],
    };

    expect(paymentReceiptSchema.safeParse(baseReceipt).success).toBe(false);
    expect(paymentReceiptSchema.safeParse({ ...baseReceipt, payment: { id: 1, value: 100 } }).success).toBe(true);
    expect(
      paymentReceiptSchema.safeParse({
        ...baseReceipt,
        payment: { id: 1, value: 100 },
        payments: [{ id: 1, value: 100 }],
      }).success,
    ).toBe(false);
  });

  test('accepts documented voucher adjustment and journal detail fields', () => {
    const voucher = voucherSchema.safeParse({
      document: { id: 1 },
      date: '2026-08-26',
      type: 'DebtPayment',
      customer: { identification: '900123456' },
      items: [
        {
          due: { prefix: 'FV-1', consecutive: 1, quote: 1 },
          taxes: [{ id: 1, name: 'IVA', type: 'IVA', percentage: 19, base: 100, value: 19 }],
          discounts: [{ id: 2, name: 'Prompt payment', type: 'Value', percentage: 1, value: 1 }],
          value: 118,
        },
      ],
      payment: { id: 1, value: 118 },
    });
    const journal = journalSchema.safeParse({
      document: { id: 1 },
      date: '2026-08-26',
      items: [
        {
          account: { code: '11050501', movement: 'Debit' },
          tax: { id: 1, name: 'IVA', type: 'IVA', percentage: 19, base_value: 100, value: 19 },
          product: { code: 'ITEM-1', quantity: 1 },
          value: 119,
        },
      ],
    });
    const missingQuantity = journalSchema.safeParse({
      document: { id: 1 },
      date: '2026-08-26',
      items: [{ account: { code: '11050501', movement: 'Debit' }, product: { code: 'ITEM-1' }, value: 119 }],
    });

    expect(voucher.success).toBe(true);
    expect(journal.success).toBe(true);
    expect(missingQuantity.success).toBe(false);
  });

  test('parses current accounting response examples and compatibility links', () => {
    expect(
      accountsPayableResponseSchema.safeParse({
        value: {
          pagination: { page: 1, page_size: 25, total_results: 1 },
          results: [
            {
              due: { prefix: 'FC-1', consecutive: 1, quote: 1, date: '2026-08-26T00:00:00Z', balance: 100 },
              provider: { identification: '900123456', name: 'Supplier' },
              cost_center: { code: 42, name: 'Main' },
            },
          ],
        },
        __links: { self: { href: 'https://api.siigo.com/v1/accounts-payable?page=1' } },
      }).success,
    ).toBe(true);

    expect(
      paymentReceiptResponseSchema.safeParse({
        document: { id: 1 },
        date: '2026-08-26',
        type: 'DebtPayment',
        supplier: { identification: '900123456' },
        items: [{ due: {} }],
        payment: { id: 1, name: 'Bank', value: 100 },
        balance: 0,
      }).success,
    ).toBe(true);

    expect(
      voucherResponseSchema.safeParse({
        document: { id: 1 },
        date: '2026-08-26',
        type: 'AdvancePayment',
        customer: { identification: '900123456' },
        payment: { id: 1, name: 'Bank', value: 100 },
      }).success,
    ).toBe(true);

    expect(
      purchaseResponseSchema.safeParse({
        document: { id: 1 },
        date: '2026-08-26',
        supplier: { identification: '900123456' },
        balance: 0,
        items: [
          {
            code: 'ITEM-1',
            discount: { percentage: 10, value: 100 },
            taxes: [{ id: 1, name: 'IVA', percentage: 19, value: 171, total: 1071 }],
          },
        ],
        metadata: { created: '2026-08-26T00:00:00Z' },
      }).success,
    ).toBe(true);

    expect(
      supportDocumentResponseSchema.safeParse({
        document: { id: 1 },
        date: '2026-08-26',
        supplier: { identification: '900123456' },
        items: [{ taxes: [{ id: 1, total: 119 }] }],
        payments: [{}],
      }).success,
    ).toBe(true);

    expect(
      voucherResponseSchema.safeParse({
        document: { id: 1 },
        date: '2026-08-26',
        type: 'MiscIncome',
        customer: { identification: '900123456' },
        income: { id: 174, name: 'Ajuste al peso' },
        payment: { id: 1, value: 100 },
        balance: 0,
      }).success,
    ).toBe(true);
  });

  test('accepts both documented accounts-payable date formats and rejects reversed ranges', () => {
    expect(
      accountsPayableQuerySchema.safeParse({
        due_date_start: '2026-08-01T00:00:00Z',
        date_end: '2026-08-31T23:59:59Z',
      }).success,
    ).toBe(true);
    expect(accountsPayableQuerySchema.safeParse({ due_date_start: '2026-08-01', due_date_end: '2026-08-31' }).success).toBe(true);
    expect(
      accountsPayableQuerySchema.safeParse({
        due_date_start: '2026-09-01T00:00:00Z',
        due_date_end: '2026-08-31T23:59:59Z',
      }).success,
    ).toBe(false);
  });

  test('accepts date-only and UTC date-time filters for voucher and payment-receipt lists', () => {
    expect(voucherListQuerySchema.safeParse({ date_start: '2026-08-01', updated_end: '2026-08-31T23:59:59Z' }).success).toBe(true);
    expect(paymentReceiptListQuerySchema.safeParse({ created_start: '2026-08-01', updated_end: '2026-08-31T23:59:59Z' }).success).toBe(
      true,
    );
  });

  test('requires a UUID when updating a payment receipt', () => {
    expect(
      paymentReceiptUpdateToolSchema.safeParse({
        id: 'not-a-uuid',
        paymentReceipt: {},
      }).success,
    ).toBe(false);
    expect(
      paymentReceiptUpdateToolSchema.safeParse({
        id: '63f918c2-ca65-4edc-a7db-66bcdd5159fb',
        paymentReceipt: {},
      }).success,
    ).toBe(true);
  });

  test('models documented delete responses', () => {
    expect(deleteResponseSchema.safeParse({ id: '63f918c2-ca65-4edc-a7db-66bcdd5159fb', deleted: true }).success).toBe(true);
    expect(deleteResponseSchema.safeParse({ id: '63f918c2-ca65-4edc-a7db-66bcdd5159fb' }).success).toBe(false);
  });

  test('advertises concrete accounting result schemas through MCP', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    connectedServer = createMcpServer({});
    connectedClient = new Client({ name: 'accounting-output-test', version: '1.0.0' }, { capabilities: {} });

    await connectedServer.connect(serverTransport);
    await connectedClient.connect(clientTransport);

    const { tools } = await connectedClient.listTools();
    expect(tools.some((tool) => tool.name === 'siigo_get_purchase_support_documents')).toBe(false);
    const outputFor = (name) => tools.find((tool) => tool.name === name).outputSchema.properties.result;

    expect(outputFor('siigo_get_purchases').properties.pagination).toBeDefined();
    expect(outputFor('siigo_get_purchase').properties.document).toBeDefined();
    expect(outputFor('siigo_get_expenses').type).toBe('array');
    expect(outputFor('siigo_get_trial_balance').properties.file_id).toBeDefined();
    expect(outputFor('siigo_delete_purchase').properties.deleted.const).toBe(true);
  });
});
