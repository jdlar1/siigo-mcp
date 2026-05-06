import { z } from 'zod';
import { errorResult, jsonResult } from '../mcp-results.js';
import type { ToolContext } from '../tool-context.js';

export function registerPaymentReceiptTools({ server, client }: ToolContext) {
  // ═══════════════════════════════════════════════════════════════════════════
  // PAYMENT RECEIPTS - Recibos de Pago / Comprobantes de Egreso (5 tools)
  // ═══════════════════════════════════════════════════════════════════════════

  server.registerTool(
    'siigo_get_payment_receipts',
    {
      title: 'Get Payment Receipts',
      description: 'Get list of payment receipts / disbursements (recibos de pago / comprobantes de egreso) from Siigo',
      inputSchema: z.object({
        page: z.number().optional().describe('Page number'),
        page_size: z.number().optional().describe('Number of items per page'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) => {
      try {
        return jsonResult(await client.getPaymentReceipts(args));
      } catch (e) {
        return errorResult('siigo_get_payment_receipts', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_payment_receipt',
    {
      title: 'Get Payment Receipt',
      description: 'Get a specific payment receipt by ID',
      inputSchema: z.object({
        id: z.string().describe('Payment receipt ID'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ id }) => {
      try {
        return jsonResult(await client.getPaymentReceipt(id));
      } catch (e) {
        return errorResult('siigo_get_payment_receipt', e);
      }
    },
  );

  server.registerTool(
    'siigo_create_payment_receipt',
    {
      title: 'Create Payment Receipt',
      description:
        'Create a new payment receipt / disbursement (recibo de pago / comprobante de egreso). Supports DebtPayment, AdvancePayment, and Advanced types.',
      inputSchema: z.object({
        paymentReceipt: z
          .object({
            document: z.object({
              id: z.number().describe('Document type ID (type RP)'),
            }),
            date: z.string().describe('Date (YYYY-MM-DD)'),
            type: z.enum(['DebtPayment', 'AdvancePayment', 'Advanced']).describe('Receipt type'),
            customer: z.object({
              identification: z.string(),
              branch_office: z.number().optional(),
            }),
            cost_center: z.number().optional(),
            currency: z
              .object({
                code: z.string(),
                exchange_rate: z.number(),
              })
              .optional(),
            items: z.array(z.record(z.string(), z.unknown())).describe('Receipt items (structure varies by type)'),
            payments: z
              .array(
                z.object({
                  id: z.number(),
                  value: z.number(),
                  due_date: z.string().optional(),
                }),
              )
              .optional(),
            observations: z.string().optional(),
          })
          .describe('Payment receipt data'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ paymentReceipt }) => {
      try {
        return jsonResult(await client.createPaymentReceipt(paymentReceipt));
      } catch (e) {
        return errorResult('siigo_create_payment_receipt', e);
      }
    },
  );

  server.registerTool(
    'siigo_update_payment_receipt',
    {
      title: 'Update Payment Receipt',
      description: 'Update an existing payment receipt',
      inputSchema: z.object({
        id: z.string().describe('Payment receipt ID'),
        paymentReceipt: z.record(z.string(), z.unknown()).describe('Payment receipt data to update (partial)'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ id, paymentReceipt }) => {
      try {
        return jsonResult(await client.updatePaymentReceipt(id, paymentReceipt));
      } catch (e) {
        return errorResult('siigo_update_payment_receipt', e);
      }
    },
  );

  server.registerTool(
    'siigo_delete_payment_receipt',
    {
      title: 'Delete Payment Receipt',
      description: 'Delete a payment receipt',
      inputSchema: z.object({
        id: z.string().describe('Payment receipt ID'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ id }) => {
      try {
        return jsonResult(await client.deletePaymentReceipt(id));
      } catch (e) {
        return errorResult('siigo_delete_payment_receipt', e);
      }
    },
  );
}
