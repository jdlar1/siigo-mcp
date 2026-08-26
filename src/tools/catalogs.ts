import { errorResult, jsonResult } from '../mcp-results.js';
import {
  costCentersToolOutputSchema,
  documentTypeQuerySchema,
  documentTypesToolOutputSchema,
  emptyCatalogQuerySchema,
  expensesToolOutputSchema,
  fixedAssetsToolOutputSchema,
  miscIncomeToolOutputSchema,
  paymentTypeQuerySchema,
  paymentTypesToolOutputSchema,
  priceListsToolOutputSchema,
  taxesToolOutputSchema,
  usersQuerySchema,
  usersToolOutputSchema,
  warehousesToolOutputSchema,
} from '../schemas/catalogs.js';
import type { ToolContext } from '../tool-context.js';

const readAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export function registerCatalogTools({ server, client }: ToolContext) {
  server.registerTool(
    'siigo_get_document_types',
    {
      title: 'Get Document Types',
      description: 'Get document-type catalog entries, optionally filtered by accounting document code.',
      inputSchema: documentTypeQuerySchema,
      outputSchema: documentTypesToolOutputSchema,
      annotations: readAnnotations,
    },
    async ({ type }, extra) => {
      try {
        return jsonResult(await client.getDocumentTypes(type, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_get_document_types', error);
      }
    },
  );

  server.registerTool(
    'siigo_get_taxes',
    {
      title: 'Get Taxes',
      description: 'Get the configured taxes catalog.',
      inputSchema: emptyCatalogQuerySchema,
      outputSchema: taxesToolOutputSchema,
      annotations: readAnnotations,
    },
    async (_, extra) => {
      try {
        return jsonResult(await client.getTaxes({ signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_get_taxes', error);
      }
    },
  );

  server.registerTool(
    'siigo_get_payment_types',
    {
      title: 'Get Payment Types',
      description: 'Get payment methods. document_type is required by Siigo (for example FV, FC, RC, RP, or NC).',
      inputSchema: paymentTypeQuerySchema,
      outputSchema: paymentTypesToolOutputSchema,
      annotations: readAnnotations,
    },
    async ({ document_type }, extra) => {
      try {
        return jsonResult(await client.getPaymentTypes(document_type, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_get_payment_types', error);
      }
    },
  );

  server.registerTool(
    'siigo_get_cost_centers',
    {
      title: 'Get Cost Centers',
      description: 'Get the cost-centers catalog.',
      inputSchema: emptyCatalogQuerySchema,
      outputSchema: costCentersToolOutputSchema,
      annotations: readAnnotations,
    },
    async (_, extra) => {
      try {
        return jsonResult(await client.getCostCenters({ signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_get_cost_centers', error);
      }
    },
  );

  server.registerTool(
    'siigo_get_users',
    {
      title: 'Get Users',
      description: 'Get the paginated users/sellers catalog.',
      inputSchema: usersQuerySchema,
      outputSchema: usersToolOutputSchema,
      annotations: readAnnotations,
    },
    async (args, extra) => {
      try {
        return jsonResult(await client.getUsers(args, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_get_users', error);
      }
    },
  );

  server.registerTool(
    'siigo_get_warehouses',
    {
      title: 'Get Warehouses',
      description: 'Get the warehouses catalog.',
      inputSchema: emptyCatalogQuerySchema,
      outputSchema: warehousesToolOutputSchema,
      annotations: readAnnotations,
    },
    async (_, extra) => {
      try {
        return jsonResult(await client.getWarehouses({ signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_get_warehouses', error);
      }
    },
  );

  server.registerTool(
    'siigo_get_price_lists',
    {
      title: 'Get Price Lists',
      description: 'Get the price-lists catalog.',
      inputSchema: emptyCatalogQuerySchema,
      outputSchema: priceListsToolOutputSchema,
      annotations: readAnnotations,
    },
    async (_, extra) => {
      try {
        return jsonResult(await client.getPriceLists({ signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_get_price_lists', error);
      }
    },
  );

  server.registerTool(
    'siigo_get_fixed_assets',
    {
      title: 'Get Fixed Assets',
      description: 'Get the fixed-assets catalog used by journals and accounting documents.',
      inputSchema: emptyCatalogQuerySchema,
      outputSchema: fixedAssetsToolOutputSchema,
      annotations: readAnnotations,
    },
    async (_, extra) => {
      try {
        return jsonResult(await client.getFixedAssets({ signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_get_fixed_assets', error);
      }
    },
  );

  server.registerTool(
    'siigo_get_expenses',
    {
      title: 'Get Expenses',
      description: 'Get discount concepts used by DebtPayment cash receipts.',
      inputSchema: emptyCatalogQuerySchema,
      outputSchema: expensesToolOutputSchema,
      annotations: readAnnotations,
    },
    async (_, extra) => {
      try {
        return jsonResult(await client.getExpenses({ signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_get_expenses', error);
      }
    },
  );

  server.registerTool(
    'siigo_get_misc_income',
    {
      title: 'Get Misc Income',
      description: 'Get other-income concepts used by MiscIncome cash receipts.',
      inputSchema: emptyCatalogQuerySchema,
      outputSchema: miscIncomeToolOutputSchema,
      annotations: readAnnotations,
    },
    async (_, extra) => {
      try {
        return jsonResult(await client.getMiscIncome({ signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_get_misc_income', error);
      }
    },
  );
}
