import { errorResult, jsonResult } from '../mcp-results.js';
import {
  creditNoteCreateInputSchema,
  creditNoteEntityToolOutputSchema,
  creditNoteIdInputSchema,
  creditNoteListQuerySchema,
  creditNoteListToolOutputSchema,
  creditNotePdfToolOutputSchema,
} from '../schemas/credit-notes.js';
import type { ToolContext } from '../tool-context.js';

export function registerCreditNoteTools({ server, client }: ToolContext) {
  // ═══════════════════════════════════════════════════════════════════════════
  // CREDIT NOTES (4 tools)
  // ═══════════════════════════════════════════════════════════════════════════

  server.registerTool(
    'siigo_get_credit_notes',
    {
      title: 'Get Credit Notes',
      description: 'List credit notes with the official name and created/document/updated date filters.',
      inputSchema: creditNoteListQuerySchema,
      outputSchema: creditNoteListToolOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args, extra) => {
      try {
        return jsonResult(await client.getCreditNotes(args, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_get_credit_notes', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_credit_note',
    {
      title: 'Get Credit Note',
      description: 'Get a specific credit note by UUID.',
      inputSchema: creditNoteIdInputSchema,
      outputSchema: creditNoteEntityToolOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }, extra) => {
      try {
        return jsonResult(await client.getCreditNote(id, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_get_credit_note', e);
      }
    },
  );

  server.registerTool(
    'siigo_create_credit_note',
    {
      title: 'Create Credit Note',
      description:
        'Create a credit note with payments and a DIAN reason when required for electronic documents; existing and external invoice data are mutually exclusive.',
      inputSchema: creditNoteCreateInputSchema,
      outputSchema: creditNoteEntityToolOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ creditNote, idempotency_key }, extra) => {
      try {
        return jsonResult(await client.createCreditNote(creditNote, { idempotencyKey: idempotency_key, signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_create_credit_note', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_credit_note_pdf',
    {
      title: 'Get Credit Note PDF',
      description: 'Get credit-note PDF content as base64.',
      inputSchema: creditNoteIdInputSchema,
      outputSchema: creditNotePdfToolOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }, extra) => {
      try {
        return jsonResult(await client.getCreditNotePdf(id, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_get_credit_note_pdf', e);
      }
    },
  );
}
