import { errorResult, jsonResult } from '../mcp-results.js';
import {
  paymentReceiptCreateToolSchema,
  paymentReceiptDeleteToolOutputSchema,
  paymentReceiptEntityToolOutputSchema,
  paymentReceiptIdInputSchema,
  paymentReceiptListQuerySchema,
  paymentReceiptListToolOutputSchema,
  paymentReceiptUpdateToolSchema,
} from '../schemas/payment-receipts.js';
import type { ToolContext } from '../tool-context.js';

const readAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

const createAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
} as const;

const updateAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

const deleteAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export function registerPaymentReceiptTools({ server, client }: ToolContext) {
  server.registerTool(
    'siigo_get_payment_receipts',
    {
      title: 'Get Payment Receipts',
      description: 'Get payment receipts with creation, update, and pagination filters from Siigo.',
      inputSchema: paymentReceiptListQuerySchema,
      outputSchema: paymentReceiptListToolOutputSchema,
      annotations: readAnnotations,
    },
    async (args, extra) => {
      try {
        return jsonResult(await client.getPaymentReceipts(args, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_get_payment_receipts', error);
      }
    },
  );

  server.registerTool(
    'siigo_get_payment_receipt',
    {
      title: 'Get Payment Receipt',
      description: 'Get a payment receipt by its UUID.',
      inputSchema: paymentReceiptIdInputSchema,
      outputSchema: paymentReceiptEntityToolOutputSchema,
      annotations: readAnnotations,
    },
    async ({ id }, extra) => {
      try {
        return jsonResult(await client.getPaymentReceipt(id, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_get_payment_receipt', error);
      }
    },
  );

  server.registerTool(
    'siigo_create_payment_receipt',
    {
      title: 'Create Payment Receipt',
      description:
        'Create a supplier-oriented payment receipt. Supports DebtPayment, AdvancePayment, and the current Detailed advanced variant.',
      inputSchema: paymentReceiptCreateToolSchema,
      outputSchema: paymentReceiptEntityToolOutputSchema,
      annotations: createAnnotations,
    },
    async ({ paymentReceipt }, extra) => {
      try {
        return jsonResult(await client.createPaymentReceipt(paymentReceipt, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_create_payment_receipt', error);
      }
    },
  );

  server.registerTool(
    'siigo_update_payment_receipt',
    {
      title: 'Update Payment Receipt',
      description: 'Update editable fields of an existing payment receipt.',
      inputSchema: paymentReceiptUpdateToolSchema,
      outputSchema: paymentReceiptEntityToolOutputSchema,
      annotations: updateAnnotations,
    },
    async ({ id, paymentReceipt }, extra) => {
      try {
        return jsonResult(await client.updatePaymentReceipt(id, paymentReceipt, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_update_payment_receipt', error);
      }
    },
  );

  server.registerTool(
    'siigo_delete_payment_receipt',
    {
      title: 'Delete Payment Receipt',
      description: 'Delete a payment receipt by its UUID.',
      inputSchema: paymentReceiptIdInputSchema,
      outputSchema: paymentReceiptDeleteToolOutputSchema,
      annotations: deleteAnnotations,
    },
    async ({ id }, extra) => {
      try {
        return jsonResult(await client.deletePaymentReceipt(id, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_delete_payment_receipt', error);
      }
    },
  );
}
