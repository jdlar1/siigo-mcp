import { errorResult, jsonResult } from '../mcp-results.js';
import {
  voucherCreateToolSchema,
  voucherEntityToolOutputSchema,
  voucherIdInputSchema,
  voucherListQuerySchema,
  voucherListToolOutputSchema,
} from '../schemas/vouchers.js';
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

export function registerVoucherTools({ server, client }: ToolContext) {
  server.registerTool(
    'siigo_get_vouchers',
    {
      title: 'Get Vouchers',
      description: 'Get cash receipts with name, date, creation, update, and pagination filters from Siigo.',
      inputSchema: voucherListQuerySchema,
      outputSchema: voucherListToolOutputSchema,
      annotations: readAnnotations,
    },
    async (args, extra) => {
      try {
        return jsonResult(await client.getVouchers(args, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_get_vouchers', error);
      }
    },
  );

  server.registerTool(
    'siigo_get_voucher',
    {
      title: 'Get Voucher',
      description: 'Get a cash receipt by its UUID.',
      inputSchema: voucherIdInputSchema,
      outputSchema: voucherEntityToolOutputSchema,
      annotations: readAnnotations,
    },
    async ({ id }, extra) => {
      try {
        return jsonResult(await client.getVoucher(id, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_get_voucher', error);
      }
    },
  );

  server.registerTool(
    'siigo_create_voucher',
    {
      title: 'Create Voucher',
      description:
        'Create a cash receipt. DebtPayment, AdvancePayment, and MiscIncome use discriminated request contracts; MiscIncome is routed through its dedicated API variant.',
      inputSchema: voucherCreateToolSchema,
      outputSchema: voucherEntityToolOutputSchema,
      annotations: createAnnotations,
    },
    async ({ voucher, idempotency_key }, extra) => {
      try {
        const options = { idempotencyKey: idempotency_key, signal: extra.signal };
        const result =
          voucher.type === 'MiscIncome'
            ? await client.createMiscIncomeVoucher(voucher, options)
            : await client.createVoucher(voucher, options);
        return jsonResult(result);
      } catch (error) {
        return errorResult('siigo_create_voucher', error);
      }
    },
  );
}
