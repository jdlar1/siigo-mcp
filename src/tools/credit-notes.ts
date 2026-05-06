import { z } from 'zod';
import { errorResult, jsonResult } from '../mcp-results.js';
import type { ToolContext } from '../tool-context.js';

export function registerCreditNoteTools({ server, client }: ToolContext) {
  // ═══════════════════════════════════════════════════════════════════════════
  // CREDIT NOTES (4 tools)
  // ═══════════════════════════════════════════════════════════════════════════

  server.registerTool(
    'siigo_get_credit_notes',
    {
      title: 'Get Credit Notes',
      description: 'Get list of credit notes from Siigo',
      inputSchema: z.object({
        page: z.number().optional().describe('Page number'),
        page_size: z.number().optional().describe('Number of items per page'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) => {
      try {
        return jsonResult(await client.getCreditNotes(args));
      } catch (e) {
        return errorResult('siigo_get_credit_notes', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_credit_note',
    {
      title: 'Get Credit Note',
      description: 'Get a specific credit note by ID',
      inputSchema: z.object({
        id: z.string().describe('Credit note ID'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ id }) => {
      try {
        return jsonResult(await client.getCreditNote(id));
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
        'Create a new credit note. Supports healthcare sector fields via healthcare_company. Can reference an existing invoice or provide invoice_data for external invoices.',
      inputSchema: z.object({
        creditNote: z
          .object({
            document: z.object({
              id: z.number().describe('Document type ID (type NC)'),
            }),
            date: z.string().describe('Date (YYYY-MM-DD)'),
            customer: z.object({
              identification: z.string(),
              branch_office: z.number().optional(),
            }),
            cost_center: z.number().optional(),
            seller: z.number().optional().describe('Seller ID'),
            items: z.array(
              z.object({
                code: z.string(),
                description: z.string().optional(),
                quantity: z.number(),
                price: z.number(),
                discount: z.number().optional(),
                taxes: z.array(z.object({ id: z.number() })).optional(),
              }),
            ),
            payments: z
              .array(
                z.object({
                  id: z.number(),
                  value: z.number(),
                  due_date: z.string().optional(),
                }),
              )
              .optional(),
            retentions: z.array(z.object({ id: z.number() })).optional(),
            stamp: z.object({ send: z.boolean() }).optional(),
            mail: z.object({ send: z.boolean() }).optional(),
            observations: z.string().optional(),
            invoice: z.string().optional().describe('Related invoice ID'),
            invoice_data: z
              .object({
                prefix: z.string().optional(),
                number: z.number().optional(),
                date: z.string().optional(),
                cufe: z.string().optional(),
              })
              .optional()
              .describe('External invoice data (when invoice is not in Siigo)'),
            reason: z.string().optional().describe('Credit note reason'),
            healthcare_company: z
              .object({
                operation_type: z.enum(['SS-CUFE', 'SS-SinAporte', 'SS-Recaudo']),
                period_start: z.string().optional(),
                period_end: z.string().optional(),
                payment_method: z.number().optional(),
                service_plan: z.number().optional(),
                policy_number: z.string().optional(),
                contract_number: z.string().optional(),
                copayment: z.number().optional(),
                coinsurance: z.number().optional(),
                cost_sharing: z.number().optional(),
                recovery_charge: z.number().optional(),
              })
              .optional()
              .describe('Healthcare sector fields'),
          })
          .describe('Credit note data'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ creditNote }) => {
      try {
        return jsonResult(await client.createCreditNote(creditNote));
      } catch (e) {
        return errorResult('siigo_create_credit_note', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_credit_note_pdf',
    {
      title: 'Get Credit Note PDF',
      description: 'Get credit note PDF as base64',
      inputSchema: z.object({
        id: z.string().describe('Credit note ID'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ id }) => {
      try {
        return jsonResult(await client.getCreditNotePdf(id));
      } catch (e) {
        return errorResult('siigo_get_credit_note_pdf', e);
      }
    },
  );
}
