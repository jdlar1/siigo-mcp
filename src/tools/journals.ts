import { errorResult, jsonResult } from '../mcp-results.js';
import {
  journalCreateToolSchema,
  journalEntityToolOutputSchema,
  journalIdInputSchema,
  journalListQuerySchema,
  journalListToolOutputSchema,
} from '../schemas/journals.js';
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

export function registerJournalTools({ server, client }: ToolContext) {
  server.registerTool(
    'siigo_get_journals',
    {
      title: 'Get Journals',
      description: 'Get accounting journals with document, name, date, update, and pagination filters from Siigo.',
      inputSchema: journalListQuerySchema,
      outputSchema: journalListToolOutputSchema,
      annotations: readAnnotations,
    },
    async (args, extra) => {
      try {
        return jsonResult(await client.getJournals(args, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_get_journals', error);
      }
    },
  );

  server.registerTool(
    'siigo_get_journal',
    {
      title: 'Get Journal',
      description: 'Get an accounting journal by its UUID.',
      inputSchema: journalIdInputSchema,
      outputSchema: journalEntityToolOutputSchema,
      annotations: readAnnotations,
    },
    async ({ id }, extra) => {
      try {
        return jsonResult(await client.getJournal(id, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_get_journal', error);
      }
    },
  );

  server.registerTool(
    'siigo_create_journal',
    {
      title: 'Create Journal',
      description:
        'Create an accounting journal with typed account, due, tax, fixed-asset, or inventory item details. Debits and credits must balance.',
      inputSchema: journalCreateToolSchema,
      outputSchema: journalEntityToolOutputSchema,
      annotations: createAnnotations,
    },
    async ({ journal, idempotency_key }, extra) => {
      try {
        return jsonResult(await client.createJournal(journal, { idempotencyKey: idempotency_key, signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_create_journal', error);
      }
    },
  );
}
