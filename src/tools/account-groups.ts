import { errorResult, jsonResult } from '../mcp-results.js';
import {
  accountGroupEntityToolOutputSchema,
  accountGroupInputSchema,
  accountGroupListInputSchema,
  accountGroupListToolOutputSchema,
  accountGroupUpdateInputSchema,
} from '../schemas/account-groups.js';
import type { ToolContext } from '../tool-context.js';

export function registerAccountGroupTools({ server, client }: ToolContext) {
  // ═══════════════════════════════════════════════════════════════════════════
  // ACCOUNT GROUPS / INVENTORY CATEGORIES (3 tools)
  // ═══════════════════════════════════════════════════════════════════════════

  server.registerTool(
    'siigo_get_account_groups',
    {
      title: 'Get Account Groups',
      description: 'Get inventory classification groups (account groups) catalog',
      inputSchema: accountGroupListInputSchema,
      outputSchema: accountGroupListToolOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (_args, extra) => {
      try {
        return jsonResult(await client.getAccountGroups({ signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_get_account_groups', e);
      }
    },
  );

  server.registerTool(
    'siigo_create_account_group',
    {
      title: 'Create Account Group',
      description: 'Create a new inventory category (account group). Code must be max 10 alphanumeric chars, name max 50 chars.',
      inputSchema: accountGroupInputSchema,
      outputSchema: accountGroupEntityToolOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (args, extra) => {
      try {
        return jsonResult(await client.createAccountGroup(args, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_create_account_group', e);
      }
    },
  );

  server.registerTool(
    'siigo_update_account_group',
    {
      title: 'Update Account Group',
      description: 'Update an existing inventory category (account group)',
      inputSchema: accountGroupUpdateInputSchema,
      outputSchema: accountGroupEntityToolOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id, code, name }, extra) => {
      try {
        return jsonResult(await client.updateAccountGroup(id, { code, name }, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_update_account_group', e);
      }
    },
  );
}
