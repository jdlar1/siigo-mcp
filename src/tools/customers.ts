import { z } from 'zod';
import { errorResult, jsonResult } from '../mcp-results.js';
import type { ToolContext } from '../tool-context.js';

export function registerCustomerTools({ server, client }: ToolContext) {
  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMERS (5 tools)
  // ═══════════════════════════════════════════════════════════════════════════

  server.registerTool(
    'siigo_get_customers',
    {
      title: 'Get Customers',
      description: 'Get list of customers from Siigo',
      inputSchema: z.object({
        page: z.number().optional().describe('Page number'),
        page_size: z.number().optional().describe('Number of items per page'),
        type: z.string().optional().describe('Customer type filter'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) => {
      try {
        return jsonResult(await client.getCustomers(args));
      } catch (e) {
        return errorResult('siigo_get_customers', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_customer',
    {
      title: 'Get Customer',
      description: 'Get a specific customer by ID',
      inputSchema: z.object({
        id: z.string().describe('Customer ID'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ id }) => {
      try {
        return jsonResult(await client.getCustomer(id));
      } catch (e) {
        return errorResult('siigo_get_customer', e);
      }
    },
  );

  server.registerTool(
    'siigo_create_customer',
    {
      title: 'Create Customer',
      description: 'Create a new customer / third party',
      inputSchema: z.object({
        customer: z
          .object({
            type: z.enum(['Customer', 'Supplier', 'Other']).optional().describe('Customer type (default: Customer)'),
            person_type: z.enum(['Person', 'Company']).describe('Person type'),
            id_type: z.string().describe('ID type code'),
            identification: z.string().describe('Customer identification number'),
            check_digit: z.string().optional().describe('Check digit (auto-calculated)'),
            name: z.array(z.string()).describe('Customer names: [first, last] for Person, [company_name] for Company'),
            commercial_name: z.string().optional().describe('Commercial name'),
            branch_office: z.number().optional().describe('Branch office number'),
            active: z.boolean().optional().describe('Active status'),
            vat_responsible: z.boolean().optional().describe('VAT responsible'),
            fiscal_responsibilities: z
              .array(z.object({ code: z.string() }))
              .optional()
              .describe('Fiscal responsibilities'),
            address: z
              .object({
                address: z.string().describe('Street address'),
                city: z.object({
                  country_code: z.string().describe('Country code'),
                  state_code: z.string().describe('State/department code'),
                  city_code: z.string().describe('City code'),
                }),
                postal_code: z.string().optional().describe('Postal code'),
              })
              .describe('Customer address'),
            phones: z
              .array(
                z.object({
                  indicative: z.string().optional(),
                  number: z.string().describe('Phone number'),
                  extension: z.string().optional(),
                }),
              )
              .describe('Phone numbers'),
            contacts: z
              .array(
                z.object({
                  first_name: z.string().describe('Contact first name'),
                  last_name: z.string().describe('Contact last name'),
                  email: z.string().describe('Contact email'),
                  phone: z
                    .object({
                      indicative: z.string().optional(),
                      number: z.string().optional(),
                      extension: z.string().optional(),
                    })
                    .optional()
                    .describe('Contact phone'),
                }),
              )
              .describe('Contacts (max 10)'),
            comments: z.string().optional().describe('Comments'),
            related_users: z
              .object({
                seller_id: z.number().optional(),
                collector_id: z.number().optional(),
              })
              .optional()
              .describe('Related users'),
          })
          .describe('Customer data'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ customer }) => {
      try {
        return jsonResult(await client.createCustomer(customer));
      } catch (e) {
        return errorResult('siigo_create_customer', e);
      }
    },
  );

  server.registerTool(
    'siigo_update_customer',
    {
      title: 'Update Customer',
      description: 'Update an existing customer',
      inputSchema: z.object({
        id: z.string().describe('Customer ID'),
        customer: z.record(z.string(), z.unknown()).describe('Customer data to update (partial)'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ id, customer }) => {
      try {
        return jsonResult(await client.updateCustomer(id, customer));
      } catch (e) {
        return errorResult('siigo_update_customer', e);
      }
    },
  );

  server.registerTool(
    'siigo_search_customers',
    {
      title: 'Search Customers',
      description: 'Search for customers by identification, name, or type with client-side filtering for partial matches',
      inputSchema: z.object({
        identification: z.string().optional().describe('Search by identification number (partial match)'),
        name: z.string().optional().describe('Search by customer name (partial match)'),
        type: z.enum(['Customer', 'Supplier', 'Other']).optional().describe('Filter by customer type'),
        page: z.number().optional().describe('Page number for pagination'),
        page_size: z.number().optional().describe('Number of items per page (max 100)'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) => {
      try {
        return jsonResult(await client.searchCustomers(args));
      } catch (e) {
        return errorResult('siigo_search_customers', e);
      }
    },
  );
}
