import { errorResult, jsonResult } from '../mcp-results.js';
import {
  quotationCreateInputSchema,
  quotationDeleteToolOutputSchema,
  quotationEntityToolOutputSchema,
  quotationIdInputSchema,
  quotationListQuerySchema,
  quotationListToolOutputSchema,
  quotationUpdateInputSchema,
} from '../schemas/quotations.js';
import type { ToolContext } from '../tool-context.js';

export function registerQuotationTools({ server, client }: ToolContext) {
  // ═══════════════════════════════════════════════════════════════════════════
  // QUOTATIONS (5 tools)
  // ═══════════════════════════════════════════════════════════════════════════

  server.registerTool(
    'siigo_get_quotations',
    {
      title: 'Get Quotations',
      description: 'List quotations with the official Siigo date, name, and customer filters.',
      inputSchema: quotationListQuerySchema,
      outputSchema: quotationListToolOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args, extra) => {
      try {
        return jsonResult(await client.getQuotations(args, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_get_quotations', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_quotation',
    {
      title: 'Get Quotation',
      description: 'Get a specific quotation by UUID.',
      inputSchema: quotationIdInputSchema,
      outputSchema: quotationEntityToolOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }, extra) => {
      try {
        return jsonResult(await client.getQuotation(id, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_get_quotation', e);
      }
    },
  );

  server.registerTool(
    'siigo_create_quotation',
    {
      title: 'Create Quotation',
      description: 'Create a quotation with document number, customer, seller, currency, and complete item data.',
      inputSchema: quotationCreateInputSchema,
      outputSchema: quotationEntityToolOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ quotation }, extra) => {
      try {
        return jsonResult(await client.createQuotation(quotation, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_create_quotation', e);
      }
    },
  );

  server.registerTool(
    'siigo_update_quotation',
    {
      title: 'Update Quotation',
      description: 'Replace an existing quotation with a complete validated payload.',
      inputSchema: quotationUpdateInputSchema,
      outputSchema: quotationEntityToolOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id, quotation }, extra) => {
      try {
        return jsonResult(await client.updateQuotation(id, quotation, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_update_quotation', e);
      }
    },
  );

  server.registerTool(
    'siigo_delete_quotation',
    {
      title: 'Delete Quotation',
      description: 'Delete a quotation that is eligible for deletion in Siigo.',
      inputSchema: quotationIdInputSchema,
      outputSchema: quotationDeleteToolOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }, extra) => {
      try {
        return jsonResult(await client.deleteQuotation(id, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_delete_quotation', e);
      }
    },
  );
}
