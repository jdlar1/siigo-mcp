import { z } from 'zod';
import { errorResult, jsonResult } from '../mcp-results.js';
import type { ToolContext } from '../tool-context.js';

export function registerPurchaseTools({ server, client }: ToolContext) {
  // ═══════════════════════════════════════════════════════════════════════════
  // PURCHASES - Facturas de Compra (5 tools)
  // ═══════════════════════════════════════════════════════════════════════════

  server.registerTool(
    'siigo_get_purchases',
    {
      title: 'Get Purchases',
      description: 'Get list of purchase invoices (facturas de compra) from Siigo',
      inputSchema: z.object({
        page: z.number().optional().describe('Page number'),
        page_size: z.number().optional().describe('Number of items per page'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) => {
      try {
        return jsonResult(await client.getPurchases(args));
      } catch (e) {
        return errorResult('siigo_get_purchases', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_purchase',
    {
      title: 'Get Purchase',
      description: 'Get a specific purchase invoice by ID',
      inputSchema: z.object({
        id: z.string().describe('Purchase ID'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ id }) => {
      try {
        return jsonResult(await client.getPurchase(id));
      } catch (e) {
        return errorResult('siigo_get_purchase', e);
      }
    },
  );

  server.registerTool(
    'siigo_create_purchase',
    {
      title: 'Create Purchase',
      description:
        'Create a new purchase invoice (factura de compra). Use document type FC. If the document type has document_support=true, it creates a Documento Soporte.',
      inputSchema: z.object({
        purchase: z.record(z.string(), z.unknown()).describe('Purchase data'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ purchase }) => {
      try {
        return jsonResult(await client.createPurchase(purchase));
      } catch (e) {
        return errorResult('siigo_create_purchase', e);
      }
    },
  );

  server.registerTool(
    'siigo_update_purchase',
    {
      title: 'Update Purchase',
      description: 'Update an existing purchase invoice',
      inputSchema: z.object({
        id: z.string().describe('Purchase ID'),
        purchase: z.record(z.string(), z.unknown()).describe('Purchase data to update (partial)'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ id, purchase }) => {
      try {
        return jsonResult(await client.updatePurchase(id, purchase));
      } catch (e) {
        return errorResult('siigo_update_purchase', e);
      }
    },
  );

  server.registerTool(
    'siigo_delete_purchase',
    {
      title: 'Delete Purchase',
      description: 'Delete a purchase invoice',
      inputSchema: z.object({
        id: z.string().describe('Purchase ID'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ id }) => {
      try {
        return jsonResult(await client.deletePurchase(id));
      } catch (e) {
        return errorResult('siigo_delete_purchase', e);
      }
    },
  );
}
