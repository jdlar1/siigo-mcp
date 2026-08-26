import { errorResult, jsonResult } from '../mcp-results.js';
import {
  purchaseCreateToolSchema,
  purchaseDeleteToolOutputSchema,
  purchaseEntityToolOutputSchema,
  purchaseIdInputSchema,
  purchaseListQuerySchema,
  purchaseListToolOutputSchema,
  purchaseUpdateToolSchema,
} from '../schemas/purchases.js';
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

export function registerPurchaseTools({ server, client }: ToolContext) {
  server.registerTool(
    'siigo_get_purchases',
    {
      title: 'Get Purchases',
      description: 'Get purchase invoices with pagination and document/date filters from Siigo.',
      inputSchema: purchaseListQuerySchema,
      outputSchema: purchaseListToolOutputSchema,
      annotations: readAnnotations,
    },
    async (args, extra) => {
      try {
        return jsonResult(await client.getPurchases(args, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_get_purchases', error);
      }
    },
  );

  server.registerTool(
    'siigo_get_purchase',
    {
      title: 'Get Purchase',
      description: 'Get a purchase invoice by its UUID.',
      inputSchema: purchaseIdInputSchema,
      outputSchema: purchaseEntityToolOutputSchema,
      annotations: readAnnotations,
    },
    async ({ id }, extra) => {
      try {
        return jsonResult(await client.getPurchase(id, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_get_purchase', error);
      }
    },
  );

  server.registerTool(
    'siigo_create_purchase',
    {
      title: 'Create Purchase',
      description: 'Create a purchase invoice (FC). The supplier, provider invoice, typed items, and at least one payment are required.',
      inputSchema: purchaseCreateToolSchema,
      outputSchema: purchaseEntityToolOutputSchema,
      annotations: createAnnotations,
    },
    async ({ purchase }, extra) => {
      try {
        return jsonResult(await client.createPurchase(purchase, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_create_purchase', error);
      }
    },
  );

  server.registerTool(
    'siigo_update_purchase',
    {
      title: 'Update Purchase',
      description: 'Update editable fields of an existing purchase invoice.',
      inputSchema: purchaseUpdateToolSchema,
      outputSchema: purchaseEntityToolOutputSchema,
      annotations: updateAnnotations,
    },
    async ({ id, purchase }, extra) => {
      try {
        return jsonResult(await client.updatePurchase(id, purchase, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_update_purchase', error);
      }
    },
  );

  server.registerTool(
    'siigo_delete_purchase',
    {
      title: 'Delete Purchase',
      description: 'Delete a purchase invoice by its UUID.',
      inputSchema: purchaseIdInputSchema,
      outputSchema: purchaseDeleteToolOutputSchema,
      annotations: deleteAnnotations,
    },
    async ({ id }, extra) => {
      try {
        return jsonResult(await client.deletePurchase(id, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_delete_purchase', error);
      }
    },
  );
}
