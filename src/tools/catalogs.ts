import { z } from 'zod';
import { errorResult, jsonResult } from '../mcp-results.js';
import type { ToolContext } from '../tool-context.js';

export function registerCatalogTools({ server, client }: ToolContext) {
  // ═══════════════════════════════════════════════════════════════════════════
  // CATALOGS (14 tools)
  // ═══════════════════════════════════════════════════════════════════════════

  server.registerTool(
    'siigo_get_document_types',
    {
      title: 'Get Document Types',
      description:
        'Get document types catalog. Filter by type: FV (sales invoice), RC (cash receipt), NC (credit note), FC (purchase invoice), CC (journal), RP (payment receipt), C (quotation), DS (purchase support document).',
      inputSchema: z.object({
        type: z.enum(['FV', 'RC', 'NC', 'FC', 'CC', 'RP', 'C', 'DS']).optional().describe('Document type filter'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ type }) => {
      try {
        return jsonResult(await client.getDocumentTypes(type));
      } catch (e) {
        return errorResult('siigo_get_document_types', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_taxes',
    {
      title: 'Get Taxes',
      description: 'Get taxes catalog (IVA, Retefuente, ReteIVA, ReteICA, Impoconsumo, AdValorem, Autorretencion)',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async () => {
      try {
        return jsonResult(await client.getTaxes());
      } catch (e) {
        return errorResult('siigo_get_taxes', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_payment_types',
    {
      title: 'Get Payment Types',
      description: 'Get payment types catalog. Filter by document_type to get applicable payment methods.',
      inputSchema: z.object({
        document_type: z.string().optional().describe('Document type filter (FV, NC, RC, etc.)'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ document_type }) => {
      try {
        return jsonResult(await client.getPaymentTypes(document_type));
      } catch (e) {
        return errorResult('siigo_get_payment_types', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_cost_centers',
    {
      title: 'Get Cost Centers',
      description: 'Get cost centers catalog',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async () => {
      try {
        return jsonResult(await client.getCostCenters());
      } catch (e) {
        return errorResult('siigo_get_cost_centers', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_users',
    {
      title: 'Get Users',
      description: 'Get users/sellers catalog',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async () => {
      try {
        return jsonResult(await client.getUsers());
      } catch (e) {
        return errorResult('siigo_get_users', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_warehouses',
    {
      title: 'Get Warehouses',
      description: 'Get warehouses catalog',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async () => {
      try {
        return jsonResult(await client.getWarehouses());
      } catch (e) {
        return errorResult('siigo_get_warehouses', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_price_lists',
    {
      title: 'Get Price Lists',
      description: 'Get price lists catalog (up to 12 price lists)',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async () => {
      try {
        return jsonResult(await client.getPriceLists());
      } catch (e) {
        return errorResult('siigo_get_price_lists', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_cities',
    {
      title: 'Get Cities',
      description: 'Get cities catalog (Colombian cities with country/state/city codes)',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async () => {
      try {
        return jsonResult(await client.getCities());
      } catch (e) {
        return errorResult('siigo_get_cities', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_id_types',
    {
      title: 'Get ID Types',
      description: 'Get identification types catalog',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async () => {
      try {
        return jsonResult(await client.getIdTypes());
      } catch (e) {
        return errorResult('siigo_get_id_types', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_fiscal_responsibilities',
    {
      title: 'Get Fiscal Responsibilities',
      description: 'Get fiscal responsibilities catalog',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async () => {
      try {
        return jsonResult(await client.getFiscalResponsibilities());
      } catch (e) {
        return errorResult('siigo_get_fiscal_responsibilities', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_fixed_assets',
    {
      title: 'Get Fixed Assets',
      description: 'Get fixed assets catalog',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async () => {
      try {
        return jsonResult(await client.getFixedAssets());
      } catch (e) {
        return errorResult('siigo_get_fixed_assets', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_expenses',
    {
      title: 'Get Expenses',
      description: 'Get expenses catalog used by cash receipt debt payment adjustments',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async () => {
      try {
        return jsonResult(await client.getExpenses());
      } catch (e) {
        return errorResult('siigo_get_expenses', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_misc_income',
    {
      title: 'Get Misc Income',
      description: 'Get miscellaneous income concepts used by MiscIncome cash receipts',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async () => {
      try {
        return jsonResult(await client.getMiscIncome());
      } catch (e) {
        return errorResult('siigo_get_misc_income', e);
      }
    },
  );
}
