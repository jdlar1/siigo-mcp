import { errorResult, jsonResult } from '../mcp-results.js';
import {
  customerCreateInputSchema,
  customerEntityToolOutputSchema,
  customerIdInputSchema,
  customerListQuerySchema,
  customerListToolOutputSchema,
  customerSearchSchema,
  customerUpdateInputSchema,
} from '../schemas/customers.js';
import type { ToolContext } from '../tool-context.js';

export function registerCustomerTools({ server, client }: ToolContext) {
  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMERS (5 tools)
  // ═══════════════════════════════════════════════════════════════════════════

  server.registerTool(
    'siigo_get_customers',
    {
      title: 'Get Customers',
      description: 'List customers and third parties with the official Siigo filters.',
      inputSchema: customerListQuerySchema,
      outputSchema: customerListToolOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args, extra) => {
      try {
        return jsonResult(await client.getCustomers(args, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_get_customers', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_customer',
    {
      title: 'Get Customer',
      description: 'Get a specific customer by UUID',
      inputSchema: customerIdInputSchema,
      outputSchema: customerEntityToolOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }, extra) => {
      try {
        return jsonResult(await client.getCustomer(id, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_get_customer', e);
      }
    },
  );

  server.registerTool(
    'siigo_create_customer',
    {
      title: 'Create Customer',
      description: 'Create a new customer or third party, including CUCON through custom_fields.',
      inputSchema: customerCreateInputSchema,
      outputSchema: customerEntityToolOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ customer }, extra) => {
      try {
        return jsonResult(await client.createCustomer(customer, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_create_customer', e);
      }
    },
  );

  server.registerTool(
    'siigo_update_customer',
    {
      title: 'Update Customer',
      description: 'Replace an existing customer with the complete creation-shaped payload required by Siigo.',
      inputSchema: customerUpdateInputSchema,
      outputSchema: customerEntityToolOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id, customer }, extra) => {
      try {
        return jsonResult(await client.updateCustomer(id, customer, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_update_customer', e);
      }
    },
  );

  server.registerTool(
    'siigo_search_customers',
    {
      title: 'Search Customers',
      description: 'Search customers by identification, name, or type with client-side partial matching.',
      inputSchema: customerSearchSchema,
      outputSchema: customerListToolOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args, extra) => {
      try {
        return jsonResult(await client.searchCustomers(args, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_search_customers', e);
      }
    },
  );
}
