import { z } from 'zod';
import { errorResult, jsonResult } from '../mcp-results.js';
import type { ToolContext } from '../tool-context.js';

export function registerJournalTools({ server, client }: ToolContext) {
  // ═══════════════════════════════════════════════════════════════════════════
  // JOURNALS - Comprobantes Contables (3 tools)
  // ═══════════════════════════════════════════════════════════════════════════

  server.registerTool(
    'siigo_get_journals',
    {
      title: 'Get Journals',
      description: 'Get list of accounting journals (comprobantes contables) from Siigo',
      inputSchema: z.object({
        page: z.number().optional().describe('Page number'),
        page_size: z.number().optional().describe('Number of items per page'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) => {
      try {
        return jsonResult(await client.getJournals(args));
      } catch (e) {
        return errorResult('siigo_get_journals', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_journal',
    {
      title: 'Get Journal',
      description: 'Get a specific accounting journal by ID',
      inputSchema: z.object({
        id: z.string().describe('Journal ID'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ id }) => {
      try {
        return jsonResult(await client.getJournal(id));
      } catch (e) {
        return errorResult('siigo_get_journal', e);
      }
    },
  );

  server.registerTool(
    'siigo_create_journal',
    {
      title: 'Create Journal',
      description: 'Create a new accounting journal entry (comprobante contable)',
      inputSchema: z.object({
        journal: z
          .object({
            document: z.object({
              id: z.number().describe('Document type ID (type CC)'),
            }),
            date: z.string().describe('Date (YYYY-MM-DD)'),
            items: z
              .array(
                z.object({
                  account: z.object({
                    code: z.string().describe('Account code'),
                    movement: z.enum(['Debit', 'Credit']).describe('Movement type'),
                  }),
                  customer: z
                    .object({
                      identification: z.string(),
                      branch_office: z.number().optional(),
                    })
                    .optional()
                    .describe('Third party reference'),
                  description: z.string().optional(),
                  value: z.number().describe('Value'),
                  cost_center: z.number().optional(),
                }),
              )
              .describe('Journal items (debits must equal credits)'),
            observations: z.string().optional(),
          })
          .describe('Journal data'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ journal }) => {
      try {
        return jsonResult(await client.createJournal(journal));
      } catch (e) {
        return errorResult('siigo_create_journal', e);
      }
    },
  );
}
