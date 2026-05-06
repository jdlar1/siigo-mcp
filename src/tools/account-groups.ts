import { z } from 'zod';
import { errorResult, jsonResult } from '../mcp-results.js';
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
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async () => {
      try {
        return jsonResult(await client.getAccountGroups());
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
      inputSchema: z.object({
        code: z.string().describe('Unique category code (max 10 alphanumeric chars, no special chars or spaces)'),
        name: z.string().describe('Category name (max 50 chars)'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (args) => {
      try {
        return jsonResult(await client.createAccountGroup(args));
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
      inputSchema: z.object({
        id: z.number().describe('Account group ID'),
        code: z.string().describe('Category code'),
        name: z.string().describe('Category name'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ id, code, name }) => {
      try {
        return jsonResult(await client.updateAccountGroup(id, { code, name }));
      } catch (e) {
        return errorResult('siigo_update_account_group', e);
      }
    },
  );
}
