import { z } from 'zod';
import { errorResult, jsonResult } from '../mcp-results.js';
import type { ToolContext } from '../tool-context.js';

export function registerProductTools({ server, client }: ToolContext) {
  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCTS (6 tools)
  // ═══════════════════════════════════════════════════════════════════════════

  server.registerTool(
    'siigo_get_products',
    {
      title: 'Get Products',
      description: 'Get list of products from Siigo',
      inputSchema: z.object({
        page: z.number().optional().describe('Page number'),
        page_size: z.number().optional().describe('Number of items per page'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) => {
      try {
        return jsonResult(await client.getProducts(args));
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
      inputSchema: z.object({
        id: z.string().describe('Product ID'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ id }) => {
      try {
        return jsonResult(await client.getProduct(id));
      } catch (e) {
        return errorResult('siigo_get_product', e);
      }
    },
  );

  server.registerTool(
    'siigo_create_product',
    {
      title: 'Create Product',
      description:
        'Create a new product. Supports Product, Service, ConsumerGood, and Combo types. For Combo products, include a components array with code and quantity.',
      inputSchema: z.object({
        product: z
          .object({
            code: z.string().describe('Unique product code'),
            name: z.string().describe('Product name'),
            account_group: z.number().describe('Account group / inventory category ID'),
            type: z.enum(['Product', 'Service', 'ConsumerGood', 'Combo']).optional().describe('Product type (default: Product)'),
            stock_control: z.boolean().optional().describe('Enable stock control'),
            active: z.boolean().optional().describe('Product active status'),
            tax_classification: z.enum(['Taxed', 'Exempt', 'Excluded']).optional().describe('Tax classification'),
            tax_included: z.boolean().optional().describe('Tax included in price'),
            taxes: z
              .array(
                z.object({
                  id: z.number().describe('Tax ID'),
                  milliliters: z.number().optional().describe('Milliliters (for sweetened beverages tax)'),
                  rate: z.number().optional().describe('Tax rate'),
                }),
              )
              .optional()
              .describe('Product taxes'),
            prices: z
              .array(
                z.object({
                  currency_code: z.string().describe('Currency code'),
                  price_list: z
                    .array(
                      z.object({
                        position: z.number().describe('Price list position'),
                        value: z.number().describe('Price value'),
                      }),
                    )
                    .describe('Price list entries'),
                }),
              )
              .optional()
              .describe('Product prices'),
            unit: z.string().optional().describe('Unit of measure code (default: 94)'),
            unit_label: z.string().optional().describe('Unit label for invoice printing'),
            reference: z.string().optional().describe('Product reference / factory code'),
            description: z.string().optional().describe('Product description'),
            additional_fields: z
              .object({
                barcode: z.string().optional(),
                brand: z.string().optional(),
                tariff: z.string().optional(),
                model: z.string().optional(),
              })
              .optional()
              .describe('Additional fields'),
            components: z
              .array(
                z.object({
                  code: z.string().describe('Component product code'),
                  quantity: z.number().describe('Component quantity'),
                }),
              )
              .optional()
              .describe('Combo product components (only for type Combo)'),
          })
          .describe('Product data'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ product }) => {
      try {
        return jsonResult(await client.createProduct(product));
      } catch (e) {
        return errorResult('siigo_create_product', e);
      }
    },
  );

  server.registerTool(
    'siigo_update_product',
    {
      title: 'Update Product',
      description: 'Update an existing product',
      inputSchema: z.object({
        id: z.string().describe('Product ID'),
        product: z.record(z.string(), z.unknown()).describe('Product data to update (partial)'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ id, product }) => {
      try {
        return jsonResult(await client.updateProduct(id, product));
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
      inputSchema: z.object({
        id: z.string().describe('Product ID'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ id }) => {
      try {
        return jsonResult(await client.deleteProduct(id));
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
      inputSchema: z.object({
        code: z.string().optional().describe('Search by product code (partial match)'),
        name: z.string().optional().describe('Search by product name (partial match)'),
        reference: z.string().optional().describe('Search by product reference (partial match)'),
        page: z.number().optional().describe('Page number for pagination'),
        page_size: z.number().optional().describe('Number of items per page (max 100)'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) => {
      try {
        return jsonResult(await client.searchProducts(args));
      } catch (e) {
        return errorResult('siigo_search_products', e);
      }
    },
  );
}
