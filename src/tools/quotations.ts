import { z } from 'zod';
import { errorResult, jsonResult } from '../mcp-results.js';
import type { ToolContext } from '../tool-context.js';

export function registerQuotationTools({ server, client }: ToolContext) {
  // ═══════════════════════════════════════════════════════════════════════════
  // QUOTATIONS (5 tools)
  // ═══════════════════════════════════════════════════════════════════════════

  server.registerTool(
    'siigo_get_quotations',
    {
      title: 'Get Quotations',
      description: 'Get list of quotations (cotizaciones) from Siigo',
      inputSchema: z.object({
        page: z.number().optional().describe('Page number'),
        page_size: z.number().optional().describe('Number of items per page'),
        created_start: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
        created_end: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) => {
      try {
        return jsonResult(await client.getQuotations(args));
      } catch (e) {
        return errorResult('siigo_get_quotations', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_quotation',
    {
      title: 'Get Quotation',
      description: 'Get a specific quotation by ID',
      inputSchema: z.object({
        id: z.string().describe('Quotation ID'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ id }) => {
      try {
        return jsonResult(await client.getQuotation(id));
      } catch (e) {
        return errorResult('siigo_get_quotation', e);
      }
    },
  );

  server.registerTool(
    'siigo_create_quotation',
    {
      title: 'Create Quotation',
      description: 'Create a new quotation (cotizacion). Use document type C.',
      inputSchema: z.object({
        quotation: z
          .object({
            document: z.object({
              id: z.number().describe('Document type ID (type C)'),
            }),
            date: z.string().describe('Quotation date (YYYY-MM-DD)'),
            customer: z
              .object({
                identification: z.string().describe('Customer identification'),
                branch_office: z.number().optional().describe('Branch office'),
              })
              .describe('Customer reference'),
            cost_center: z.number().optional().describe('Cost center ID'),
            currency: z
              .object({
                code: z.string().describe('Currency code'),
                exchange_rate: z.number().describe('Exchange rate'),
              })
              .optional()
              .describe('Currency (omit for local currency)'),
            seller: z.number().describe('Seller ID'),
            observations: z.string().optional().describe('Observations'),
            items: z
              .array(
                z.object({
                  code: z.string().describe('Product code'),
                  description: z.string().optional(),
                  quantity: z.number().describe('Quantity (max 9999999.99)'),
                  price: z.number().describe('Unit price (max 99999999999.99)'),
                  discount: z.number().optional().describe('Discount'),
                  taxes: z.array(z.object({ id: z.number() })).optional(),
                }),
              )
              .describe('Quotation items'),
          })
          .describe('Quotation data'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ quotation }) => {
      try {
        return jsonResult(await client.createQuotation(quotation));
      } catch (e) {
        return errorResult('siigo_create_quotation', e);
      }
    },
  );

  server.registerTool(
    'siigo_update_quotation',
    {
      title: 'Update Quotation',
      description: 'Update an existing quotation',
      inputSchema: z.object({
        id: z.string().describe('Quotation ID'),
        quotation: z.record(z.string(), z.unknown()).describe('Quotation data to update (partial)'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ id, quotation }) => {
      try {
        return jsonResult(await client.updateQuotation(id, quotation));
      } catch (e) {
        return errorResult('siigo_update_quotation', e);
      }
    },
  );

  server.registerTool(
    'siigo_delete_quotation',
    {
      title: 'Delete Quotation',
      description: 'Delete a quotation',
      inputSchema: z.object({
        id: z.string().describe('Quotation ID'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ id }) => {
      try {
        return jsonResult(await client.deleteQuotation(id));
      } catch (e) {
        return errorResult('siigo_delete_quotation', e);
      }
    },
  );
}
