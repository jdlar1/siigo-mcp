import { z } from 'zod';
import { errorResult, jsonResult } from '../mcp-results.js';
import type { ToolContext } from '../tool-context.js';

export function registerReportTools({ server, client }: ToolContext) {
  // ═══════════════════════════════════════════════════════════════════════════
  // REPORTS (3 tools)
  // ═══════════════════════════════════════════════════════════════════════════

  server.registerTool(
    'siigo_get_trial_balance',
    {
      title: 'Get Trial Balance',
      description: 'Generate trial balance report (Excel). Uses POST as per Siigo API spec.',
      inputSchema: z.object({
        account_start: z.string().optional().describe('Starting account code'),
        account_end: z.string().optional().describe('Ending account code'),
        year: z.number().describe('Year'),
        month_start: z.number().describe('Starting month (1-13)'),
        month_end: z.number().describe('Ending month (1-13)'),
        includes_tax_difference: z.boolean().describe('Include tax differences'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) => {
      try {
        return jsonResult(await client.getTrialBalance(args));
      } catch (e) {
        return errorResult('siigo_get_trial_balance', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_trial_balance_by_third',
    {
      title: 'Get Trial Balance by Third',
      description: 'Generate trial balance by third party report (Excel). Uses POST as per Siigo API spec.',
      inputSchema: z.object({
        account_start: z.string().optional().describe('Starting account code'),
        account_end: z.string().optional().describe('Ending account code'),
        year: z.number().describe('Year'),
        month_start: z.number().describe('Starting month (1-13)'),
        month_end: z.number().describe('Ending month (1-13)'),
        includes_tax_difference: z.boolean().describe('Include tax differences'),
        customer: z
          .object({
            identification: z.string(),
            branch_office: z.number().optional(),
          })
          .optional()
          .describe('Customer filter'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) => {
      try {
        return jsonResult(await client.getTrialBalanceByThird(args));
      } catch (e) {
        return errorResult('siigo_get_trial_balance_by_third', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_accounts_payable',
    {
      title: 'Get Accounts Payable',
      description: 'Get accounts payable report',
      inputSchema: z.object({
        page: z.number().optional().describe('Page number'),
        page_size: z.number().optional().describe('Number of items per page'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) => {
      try {
        return jsonResult(await client.getAccountsPayable(args));
      } catch (e) {
        return errorResult('siigo_get_accounts_payable', e);
      }
    },
  );
}
