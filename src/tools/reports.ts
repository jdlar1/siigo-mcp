import { errorResult, jsonResult } from '../mcp-results.js';
import {
  accountsPayableQuerySchema,
  accountsPayableToolOutputSchema,
  reportFileToolOutputSchema,
  trialBalanceByThirdToolSchema,
  trialBalanceToolSchema,
} from '../schemas/reports.js';
import type { ToolContext } from '../tool-context.js';

const readAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export function registerReportTools({ server, client }: ToolContext) {
  server.registerTool(
    'siigo_get_trial_balance',
    {
      title: 'Get Trial Balance',
      description: 'Generate a trial-balance Excel report with validated account and period filters.',
      inputSchema: trialBalanceToolSchema,
      outputSchema: reportFileToolOutputSchema,
      annotations: readAnnotations,
    },
    async (args, extra) => {
      try {
        return jsonResult(await client.getTrialBalance(args, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_get_trial_balance', error);
      }
    },
  );

  server.registerTool(
    'siigo_get_trial_balance_by_third',
    {
      title: 'Get Trial Balance by Third',
      description: 'Generate a trial-balance-by-third-party Excel report with validated period filters.',
      inputSchema: trialBalanceByThirdToolSchema,
      outputSchema: reportFileToolOutputSchema,
      annotations: readAnnotations,
    },
    async (args, extra) => {
      try {
        return jsonResult(await client.getTrialBalanceByThird(args, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_get_trial_balance_by_third', error);
      }
    },
  );

  server.registerTool(
    'siigo_get_accounts_payable',
    {
      title: 'Get Accounts Payable',
      description: 'Get accounts payable with due-date, provider, branch-office, compatibility date, and pagination filters.',
      inputSchema: accountsPayableQuerySchema,
      outputSchema: accountsPayableToolOutputSchema,
      annotations: readAnnotations,
    },
    async (args, extra) => {
      try {
        return jsonResult(await client.getAccountsPayable(args, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_get_accounts_payable', error);
      }
    },
  );
}
