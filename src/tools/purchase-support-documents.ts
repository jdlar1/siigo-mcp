import { errorResult, jsonResult } from '../mcp-results.js';
import {
  supportDocumentCreateToolSchema,
  supportDocumentDeleteToolOutputSchema,
  supportDocumentEntityToolOutputSchema,
  supportDocumentIdInputSchema,
  supportDocumentUpdateToolSchema,
} from '../schemas/purchase-support-documents.js';
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

const updateAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

const deleteAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export function registerPurchaseSupportDocumentTools({ server, client }: ToolContext) {
  server.registerTool(
    'siigo_get_purchase_support_document',
    {
      title: 'Get Purchase Support Document',
      description: 'Get a purchase support document by its UUID.',
      inputSchema: supportDocumentIdInputSchema,
      outputSchema: supportDocumentEntityToolOutputSchema,
      annotations: readAnnotations,
    },
    async ({ id }, extra) => {
      try {
        return jsonResult(await client.getPurchaseSupportDocument(id, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_get_purchase_support_document', error);
      }
    },
  );

  server.registerTool(
    'siigo_create_purchase_support_document',
    {
      title: 'Create Purchase Support Document',
      description: 'Create a purchase support document (DS). Supplier receipt number, typed items, and at least one payment are required.',
      inputSchema: supportDocumentCreateToolSchema,
      outputSchema: supportDocumentEntityToolOutputSchema,
      annotations: createAnnotations,
    },
    async ({ purchase_support_document }, extra) => {
      try {
        return jsonResult(await client.createPurchaseSupportDocument(purchase_support_document, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_create_purchase_support_document', error);
      }
    },
  );

  server.registerTool(
    'siigo_update_purchase_support_document',
    {
      title: 'Update Purchase Support Document',
      description: 'Update editable fields of an existing purchase support document.',
      inputSchema: supportDocumentUpdateToolSchema,
      outputSchema: supportDocumentEntityToolOutputSchema,
      annotations: updateAnnotations,
    },
    async ({ id, purchase_support_document }, extra) => {
      try {
        return jsonResult(await client.updatePurchaseSupportDocument(id, purchase_support_document, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_update_purchase_support_document', error);
      }
    },
  );

  server.registerTool(
    'siigo_delete_purchase_support_document',
    {
      title: 'Delete Purchase Support Document',
      description: 'Delete a purchase support document by its UUID.',
      inputSchema: supportDocumentIdInputSchema,
      outputSchema: supportDocumentDeleteToolOutputSchema,
      annotations: deleteAnnotations,
    },
    async ({ id }, extra) => {
      try {
        return jsonResult(await client.deletePurchaseSupportDocument(id, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_delete_purchase_support_document', error);
      }
    },
  );
}
