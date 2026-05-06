import { z } from 'zod';
import { errorResult, jsonResult } from '../mcp-results.js';
import type { ToolContext } from '../tool-context.js';

export function registerVoucherTools({ server, client }: ToolContext) {
  // ═══════════════════════════════════════════════════════════════════════════
  // VOUCHERS / CASH RECEIPTS - Recibos de Caja (3 tools)
  // ═══════════════════════════════════════════════════════════════════════════

  server.registerTool(
    'siigo_get_vouchers',
    {
      title: 'Get Vouchers',
      description: 'Get list of vouchers / cash receipts (recibos de caja) from Siigo',
      inputSchema: z.object({
        page: z.number().optional().describe('Page number'),
        page_size: z.number().optional().describe('Number of items per page'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) => {
      try {
        return jsonResult(await client.getVouchers(args));
      } catch (e) {
        return errorResult('siigo_get_vouchers', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_voucher',
    {
      title: 'Get Voucher',
      description: 'Get a specific voucher / cash receipt by ID',
      inputSchema: z.object({
        id: z.string().describe('Voucher ID'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ id }) => {
      try {
        return jsonResult(await client.getVoucher(id));
      } catch (e) {
        return errorResult('siigo_get_voucher', e);
      }
    },
  );

  server.registerTool(
    'siigo_create_voucher',
    {
      title: 'Create Voucher',
      description: 'Create a new voucher / cash receipt (recibo de caja). Supports DebtPayment, AdvancePayment, and MiscIncome types.',
      inputSchema: z.object({
        voucher: z
          .object({
            document: z.object({
              id: z.number().describe('Document type ID (type RC)'),
            }),
            date: z.string().describe('Date (YYYY-MM-DD)'),
            type: z.enum(['DebtPayment', 'AdvancePayment', 'MiscIncome']).describe('Voucher type'),
            customer: z.object({
              identification: z.string(),
              branch_office: z.union([z.number(), z.string()]).optional(),
            }),
            income: z
              .object({
                id: z.number().describe('Miscellaneous income concept ID from /v1/misc-income'),
              })
              .optional(),
            payment: z
              .object({
                id: z.number(),
                value: z.number(),
                due_date: z.string().optional(),
              })
              .optional(),
            cost_center: z.number().optional(),
            currency: z
              .object({
                code: z.string(),
                exchange_rate: z.number(),
              })
              .optional(),
            items: z.array(z.record(z.string(), z.unknown())).optional().describe('Voucher items (structure varies by type)'),
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
          .describe('Voucher data'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ voucher }) => {
      try {
        return jsonResult(await client.createVoucher(voucher));
      } catch (e) {
        return errorResult('siigo_create_voucher', e);
      }
    },
  );
}
