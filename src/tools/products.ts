import { errorResult, jsonResult } from '../mcp-results.js';
import {
  productCreateInputSchema,
  productDeleteToolOutputSchema,
  productEntityToolOutputSchema,
  productIdInputSchema,
  productListQuerySchema,
  productListToolOutputSchema,
  productSearchSchema,
  productUpdateInputSchema,
} from '../schemas/products.js';
import type { ToolContext } from '../tool-context.js';

export function registerProductTools({ server, client }: ToolContext) {
  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCTS (6 tools)
  // ═══════════════════════════════════════════════════════════════════════════

  server.registerTool(
    'siigo_get_products',
    {
      title: 'Get Products',
      description: 'List products and services with the official Siigo filters.',
      inputSchema: productListQuerySchema,
      outputSchema: productListToolOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args, extra) => {
      try {
        return jsonResult(await client.getProducts(args, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_get_products', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_product',
    {
      title: 'Get Product',
      description: 'Get a specific product by ID',
      inputSchema: productIdInputSchema,
      outputSchema: productEntityToolOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }, extra) => {
      try {
        return jsonResult(await client.getProduct(id, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_get_product', e);
      }
    },
  );

  server.registerTool(
    'siigo_create_product',
    {
      title: 'Create Product',
      description: 'Create a Product, Service, ConsumerGood, or Combo. Combo components are validated against the selected product type.',
      inputSchema: productCreateInputSchema,
      outputSchema: productEntityToolOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ product }, extra) => {
      try {
        return jsonResult(await client.createProduct(product, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_create_product', e);
      }
    },
  );

  server.registerTool(
    'siigo_update_product',
    {
      title: 'Update Product',
      description: 'Replace an existing product with a complete validated product payload.',
      inputSchema: productUpdateInputSchema,
      outputSchema: productEntityToolOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id, product }, extra) => {
      try {
        return jsonResult(await client.updateProduct(id, product, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_update_product', e);
      }
    },
  );

  server.registerTool(
    'siigo_delete_product',
    {
      title: 'Delete Product',
      description: 'Delete a product',
      inputSchema: productIdInputSchema,
      outputSchema: productDeleteToolOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }, extra) => {
      try {
        return jsonResult(await client.deleteProduct(id, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_delete_product', e);
      }
    },
  );

  server.registerTool(
    'siigo_search_products',
    {
      title: 'Search Products',
      description: 'Search for products by code, name, or reference with client-side filtering for partial matches',
      inputSchema: productSearchSchema,
      outputSchema: productListToolOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args, extra) => {
      try {
        return jsonResult(await client.searchProducts(args, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_search_products', e);
      }
    },
  );
}
