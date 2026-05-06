import { z } from 'zod';
import { errorResult, jsonResult } from '../mcp-results.js';
import type { ToolContext } from '../tool-context.js';

export function registerPurchaseSupportDocumentTools({ server, client }: ToolContext) {
  // ═══════════════════════════════════════════════════════════════════════════
  // PURCHASE SUPPORT DOCUMENTS - Documento Soporte (5 tools)
  // ═══════════════════════════════════════════════════════════════════════════

  server.registerTool(
    'siigo_get_purchase_support_documents',
    {
      title: 'Get Purchase Support Documents',
      description: 'Get list of purchase support documents (documentos soporte) from Siigo',
      inputSchema: z.object({
        page: z.number().optional().describe('Page number'),
        page_size: z.number().optional().describe('Number of items per page'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) => {
      try {
        return jsonResult(await client.getPurchaseSupportDocuments(args));
      } catch (e) {
        return errorResult('siigo_get_purchase_support_documents', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_purchase_support_document',
    {
      title: 'Get Purchase Support Document',
      description: 'Get a specific purchase support document by ID',
      inputSchema: z.object({
        id: z.string().describe('Purchase support document ID'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ id }) => {
      try {
        return jsonResult(await client.getPurchaseSupportDocument(id));
      } catch (e) {
        return errorResult('siigo_get_purchase_support_document', e);
      }
    },
  );

  server.registerTool(
    'siigo_create_purchase_support_document',
    {
      title: 'Create Purchase Support Document',
      description: 'Create a new purchase support document (documento soporte). Use document type DS.',
      inputSchema: z.object({
        purchase_support_document: z.record(z.string(), z.unknown()).describe('Purchase support document data'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ purchase_support_document }) => {
      try {
        return jsonResult(await client.createPurchaseSupportDocument(purchase_support_document));
      } catch (e) {
        return errorResult('siigo_create_purchase_support_document', e);
      }
    },
  );

  server.registerTool(
    'siigo_update_purchase_support_document',
    {
      title: 'Update Purchase Support Document',
      description: 'Update an existing purchase support document',
      inputSchema: z.object({
        id: z.string().describe('Purchase support document ID'),
        purchase_support_document: z.record(z.string(), z.unknown()).describe('Purchase support document data to update'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ id, purchase_support_document }) => {
      try {
        return jsonResult(await client.updatePurchaseSupportDocument(id, purchase_support_document));
      } catch (e) {
        return errorResult('siigo_update_purchase_support_document', e);
      }
    },
  );

  server.registerTool(
    'siigo_delete_purchase_support_document',
    {
      title: 'Delete Purchase Support Document',
      description: 'Delete a purchase support document',
      inputSchema: z.object({
        id: z.string().describe('Purchase support document ID'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ id }) => {
      try {
        return jsonResult(await client.deletePurchaseSupportDocument(id));
      } catch (e) {
        return errorResult('siigo_delete_purchase_support_document', e);
      }
    },
  );
}
