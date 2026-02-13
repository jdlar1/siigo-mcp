#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { SiigoClient } from './siigo-client.js';
import { SiigoConfig } from './types.js';
import * as dotenv from 'dotenv';

dotenv.config();

// ─── Helper ────────────────────────────────────────────────────────────────

function jsonResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(toolName: string, error: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: `Error executing ${toolName}: ${error instanceof Error ? error.message : String(error)}`,
      },
    ],
    isError: true as const,
  };
}

// ─── Config ────────────────────────────────────────────────────────────────

const config: SiigoConfig = {
  username: process.env.SIIGO_USERNAME || '',
  accessKey: process.env.SIIGO_ACCESS_KEY || '',
  baseUrl: process.env.SIIGO_BASE_URL || 'https://api.siigo.com',
  partnerId: process.env.SIIGO_PARTNER_ID || '',
};

if (!config.username || !config.accessKey || !config.partnerId) {
  console.error('SIIGO_USERNAME, SIIGO_ACCESS_KEY, and SIIGO_PARTNER_ID environment variables are required');
  process.exit(1);
}

const client = new SiigoClient(config);

// ─── Server ────────────────────────────────────────────────────────────────

const server = new McpServer(
  {
    name: 'siigo-mcp-server',
    version: '3.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

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
    } catch (e) { return errorResult('siigo_get_products', e); }
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
    } catch (e) { return errorResult('siigo_get_product', e); }
  },
);

server.registerTool(
  'siigo_create_product',
  {
    title: 'Create Product',
    description: 'Create a new product. Supports Product, Service, ConsumerGood, and Combo types. For Combo products, include a components array with code and quantity.',
    inputSchema: z.object({
      product: z.object({
        code: z.string().describe('Unique product code'),
        name: z.string().describe('Product name'),
        account_group: z.number().describe('Account group / inventory category ID'),
        type: z.enum(['Product', 'Service', 'ConsumerGood', 'Combo']).optional().describe('Product type (default: Product)'),
        stock_control: z.boolean().optional().describe('Enable stock control'),
        active: z.boolean().optional().describe('Product active status'),
        tax_classification: z.enum(['Taxed', 'Exempt', 'Excluded']).optional().describe('Tax classification'),
        tax_included: z.boolean().optional().describe('Tax included in price'),
        taxes: z.array(z.object({
          id: z.number().describe('Tax ID'),
          milliliters: z.number().optional().describe('Milliliters (for sweetened beverages tax)'),
          rate: z.number().optional().describe('Tax rate'),
        })).optional().describe('Product taxes'),
        prices: z.array(z.object({
          currency_code: z.string().describe('Currency code'),
          price_list: z.array(z.object({
            position: z.number().describe('Price list position'),
            value: z.number().describe('Price value'),
          })).describe('Price list entries'),
        })).optional().describe('Product prices'),
        unit: z.string().optional().describe('Unit of measure code (default: 94)'),
        unit_label: z.string().optional().describe('Unit label for invoice printing'),
        reference: z.string().optional().describe('Product reference / factory code'),
        description: z.string().optional().describe('Product description'),
        additional_fields: z.object({
          barcode: z.string().optional(),
          brand: z.string().optional(),
          tariff: z.string().optional(),
          model: z.string().optional(),
        }).optional().describe('Additional fields'),
        components: z.array(z.object({
          code: z.string().describe('Component product code'),
          quantity: z.number().describe('Component quantity'),
        })).optional().describe('Combo product components (only for type Combo)'),
      }).describe('Product data'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ product }) => {
    try {
      return jsonResult(await client.createProduct(product));
    } catch (e) { return errorResult('siigo_create_product', e); }
  },
);

server.registerTool(
  'siigo_update_product',
  {
    title: 'Update Product',
    description: 'Update an existing product',
    inputSchema: z.object({
      id: z.string().describe('Product ID'),
      product: z.record(z.unknown()).describe('Product data to update (partial)'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ id, product }) => {
    try {
      return jsonResult(await client.updateProduct(id, product));
    } catch (e) { return errorResult('siigo_update_product', e); }
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
    } catch (e) { return errorResult('siigo_delete_product', e); }
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
    } catch (e) { return errorResult('siigo_search_products', e); }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// ACCOUNT GROUPS / INVENTORY CATEGORIES (3 tools)
// ═══════════════════════════════════════════════════════════════════════════

server.registerTool(
  'siigo_get_account_groups',
  {
    title: 'Get Account Groups',
    description: 'Get inventory classification groups (account groups) catalog',
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  async () => {
    try {
      return jsonResult(await client.getAccountGroups());
    } catch (e) { return errorResult('siigo_get_account_groups', e); }
  },
);

server.registerTool(
  'siigo_create_account_group',
  {
    title: 'Create Account Group',
    description: 'Create a new inventory category (account group). Code must be max 10 alphanumeric chars, name max 50 chars.',
    inputSchema: z.object({
      code: z.string().describe('Unique category code (max 10 alphanumeric chars, no special chars or spaces)'),
      name: z.string().describe('Category name (max 50 chars)'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async (args) => {
    try {
      return jsonResult(await client.createAccountGroup(args));
    } catch (e) { return errorResult('siigo_create_account_group', e); }
  },
);

server.registerTool(
  'siigo_update_account_group',
  {
    title: 'Update Account Group',
    description: 'Update an existing inventory category (account group)',
    inputSchema: z.object({
      id: z.number().describe('Account group ID'),
      code: z.string().describe('Category code'),
      name: z.string().describe('Category name'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ id, code, name }) => {
    try {
      return jsonResult(await client.updateAccountGroup(id, { code, name }));
    } catch (e) { return errorResult('siigo_update_account_group', e); }
  },
);

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
    } catch (e) { return errorResult('siigo_get_customers', e); }
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
    } catch (e) { return errorResult('siigo_get_customer', e); }
  },
);

server.registerTool(
  'siigo_create_customer',
  {
    title: 'Create Customer',
    description: 'Create a new customer / third party',
    inputSchema: z.object({
      customer: z.object({
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
        fiscal_responsibilities: z.array(z.object({ code: z.string() })).optional().describe('Fiscal responsibilities'),
        address: z.object({
          address: z.string().describe('Street address'),
          city: z.object({
            country_code: z.string().describe('Country code'),
            state_code: z.string().describe('State/department code'),
            city_code: z.string().describe('City code'),
          }),
          postal_code: z.string().optional().describe('Postal code'),
        }).describe('Customer address'),
        phones: z.array(z.object({
          indicative: z.string().optional(),
          number: z.string().describe('Phone number'),
          extension: z.string().optional(),
        })).describe('Phone numbers'),
        contacts: z.array(z.object({
          first_name: z.string().describe('Contact first name'),
          last_name: z.string().describe('Contact last name'),
          email: z.string().describe('Contact email'),
          phone: z.object({
            indicative: z.string().optional(),
            number: z.string().optional(),
            extension: z.string().optional(),
          }).optional().describe('Contact phone'),
        })).describe('Contacts (max 10)'),
        comments: z.string().optional().describe('Comments'),
        related_users: z.object({
          seller_id: z.number().optional(),
          collector_id: z.number().optional(),
        }).optional().describe('Related users'),
      }).describe('Customer data'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ customer }) => {
    try {
      return jsonResult(await client.createCustomer(customer));
    } catch (e) { return errorResult('siigo_create_customer', e); }
  },
);

server.registerTool(
  'siigo_update_customer',
  {
    title: 'Update Customer',
    description: 'Update an existing customer',
    inputSchema: z.object({
      id: z.string().describe('Customer ID'),
      customer: z.record(z.unknown()).describe('Customer data to update (partial)'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ id, customer }) => {
    try {
      return jsonResult(await client.updateCustomer(id, customer));
    } catch (e) { return errorResult('siigo_update_customer', e); }
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
    } catch (e) { return errorResult('siigo_search_customers', e); }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// INVOICES (10 tools)
// ═══════════════════════════════════════════════════════════════════════════

server.registerTool(
  'siigo_get_invoices',
  {
    title: 'Get Invoices',
    description: 'Get list of invoices from Siigo',
    inputSchema: z.object({
      page: z.number().optional().describe('Page number'),
      page_size: z.number().optional().describe('Number of items per page'),
      created_start: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
      created_end: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  async (args) => {
    try {
      return jsonResult(await client.getInvoices(args));
    } catch (e) { return errorResult('siigo_get_invoices', e); }
  },
);

server.registerTool(
  'siigo_get_invoice',
  {
    title: 'Get Invoice',
    description: 'Get a specific invoice by ID',
    inputSchema: z.object({
      id: z.string().describe('Invoice ID'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  async ({ id }) => {
    try {
      return jsonResult(await client.getInvoice(id));
    } catch (e) { return errorResult('siigo_get_invoice', e); }
  },
);

server.registerTool(
  'siigo_create_invoice',
  {
    title: 'Create Invoice',
    description: 'Create a new sales invoice. Supports healthcare sector (healthcare_company) and cargo transportation (cargo_transportation) fields.',
    inputSchema: z.object({
      invoice: z.object({
        document: z.object({ id: z.number().describe('Document type ID') }),
        date: z.string().describe('Invoice date (YYYY-MM-DD)'),
        customer: z.object({
          identification: z.string().describe('Customer identification'),
          branch_office: z.number().optional().describe('Branch office'),
        }).describe('Customer reference'),
        cost_center: z.number().optional().describe('Cost center ID'),
        currency: z.object({
          code: z.string().describe('Currency code'),
          exchange_rate: z.number().describe('Exchange rate'),
        }).optional().describe('Currency (omit for local currency)'),
        seller: z.number().describe('Seller ID'),
        observations: z.string().optional().describe('Observations'),
        items: z.array(z.object({
          code: z.string().describe('Product code'),
          description: z.string().optional(),
          quantity: z.number().describe('Quantity'),
          price: z.number().describe('Unit price'),
          discount: z.number().optional().describe('Discount'),
          taxes: z.array(z.object({ id: z.number() })).optional(),
          warehouse: z.number().optional().describe('Warehouse ID'),
        })).describe('Invoice items'),
        payments: z.array(z.object({
          id: z.number().describe('Payment type ID'),
          value: z.number().describe('Payment value'),
          due_date: z.string().optional().describe('Due date (YYYY-MM-DD)'),
        })).describe('Payment methods'),
        stamp: z.object({ send: z.boolean() }).optional().describe('Send to DIAN electronically'),
        mail: z.object({ send: z.boolean() }).optional().describe('Send by email'),
        retentions: z.array(z.object({ id: z.number() })).optional().describe('Retention taxes'),
        global_discounts: z.array(z.object({
          id: z.number(),
          percentage: z.number().optional(),
          value: z.number().optional(),
        })).optional().describe('Global discounts'),
        healthcare_company: z.object({
          operation_type: z.enum(['SS-CUFE', 'SS-SinAporte', 'SS-Recaudo']).describe('Healthcare operation type'),
          period_start: z.string().optional().describe('Period start date'),
          period_end: z.string().optional().describe('Period end date'),
          payment_method: z.number().optional().describe('Payment method (01-05)'),
          service_plan: z.number().optional().describe('Service plan (01-15)'),
          policy_number: z.string().optional().describe('Policy number (max 50)'),
          contract_number: z.string().optional().describe('Contract number (max 50)'),
          copayment: z.number().optional().describe('Copayment amount'),
          coinsurance: z.number().optional().describe('Coinsurance amount'),
          cost_sharing: z.number().optional().describe('Cost sharing amount'),
          recovery_charge: z.number().optional().describe('Recovery charge amount'),
        }).optional().describe('Healthcare sector fields (required if document type is healthcare)'),
      }).describe('Invoice data'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ invoice }) => {
    try {
      return jsonResult(await client.createInvoice(invoice));
    } catch (e) { return errorResult('siigo_create_invoice', e); }
  },
);

server.registerTool(
  'siigo_update_invoice',
  {
    title: 'Update Invoice',
    description: 'Update an existing invoice',
    inputSchema: z.object({
      id: z.string().describe('Invoice ID'),
      invoice: z.record(z.unknown()).describe('Invoice data to update (partial)'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ id, invoice }) => {
    try {
      return jsonResult(await client.updateInvoice(id, invoice));
    } catch (e) { return errorResult('siigo_update_invoice', e); }
  },
);

server.registerTool(
  'siigo_delete_invoice',
  {
    title: 'Delete Invoice',
    description: 'Delete an invoice',
    inputSchema: z.object({
      id: z.string().describe('Invoice ID'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: true },
  },
  async ({ id }) => {
    try {
      return jsonResult(await client.deleteInvoice(id));
    } catch (e) { return errorResult('siigo_delete_invoice', e); }
  },
);

server.registerTool(
  'siigo_annul_invoice',
  {
    title: 'Annul Invoice',
    description: 'Annul (void) a sales invoice',
    inputSchema: z.object({
      id: z.string().describe('Invoice ID to annul'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: true },
  },
  async ({ id }) => {
    try {
      return jsonResult(await client.annulInvoice(id));
    } catch (e) { return errorResult('siigo_annul_invoice', e); }
  },
);

server.registerTool(
  'siigo_get_invoice_pdf',
  {
    title: 'Get Invoice PDF',
    description: 'Get invoice PDF as base64',
    inputSchema: z.object({
      id: z.string().describe('Invoice ID'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  async ({ id }) => {
    try {
      return jsonResult(await client.getInvoicePdf(id));
    } catch (e) { return errorResult('siigo_get_invoice_pdf', e); }
  },
);

server.registerTool(
  'siigo_get_invoice_xml',
  {
    title: 'Get Invoice XML',
    description: 'Get invoice electronic XML as base64',
    inputSchema: z.object({
      id: z.string().describe('Invoice ID'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  async ({ id }) => {
    try {
      return jsonResult(await client.getInvoiceXml(id));
    } catch (e) { return errorResult('siigo_get_invoice_xml', e); }
  },
);

server.registerTool(
  'siigo_get_invoice_stamp_errors',
  {
    title: 'Get Invoice DIAN Errors',
    description: 'Get DIAN rejection errors for an invoice that failed electronic stamping',
    inputSchema: z.object({
      id: z.string().describe('Invoice ID'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  async ({ id }) => {
    try {
      return jsonResult(await client.getInvoiceStampErrors(id));
    } catch (e) { return errorResult('siigo_get_invoice_stamp_errors', e); }
  },
);

server.registerTool(
  'siigo_send_invoice_email',
  {
    title: 'Send Invoice Email',
    description: 'Send invoice by email (up to 5 addresses)',
    inputSchema: z.object({
      id: z.string().describe('Invoice ID'),
      mail_to: z.string().describe('Recipient email'),
      copy_to: z.string().optional().describe('CC emails (semicolon separated)'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ id, mail_to, copy_to }) => {
    try {
      return jsonResult(await client.sendInvoiceByEmail(id, { mail_to, copy_to }));
    } catch (e) { return errorResult('siigo_send_invoice_email', e); }
  },
);

// ─── Batch Invoices ────────────────────────────────────────────────────────

server.registerTool(
  'siigo_create_invoice_batch',
  {
    title: 'Create Invoice Batch',
    description: 'Create invoices in batch asynchronously. Requires a notification_url (HTTPS webhook) that will receive the results when processing completes.',
    inputSchema: z.object({
      notification_url: z.string().describe('HTTPS URL for webhook notification when batch completes (max 2048 chars)'),
      invoices: z.array(z.object({
        idempotency_key: z.string().describe('Unique external identifier (alphanumeric, max 30 chars)'),
        document: z.object({ id: z.number() }),
        date: z.string().describe('Date (YYYY-MM-DD)'),
        customer: z.object({
          identification: z.string(),
          branch_office: z.number().optional(),
        }),
        cost_center: z.number().optional(),
        seller: z.number().describe('Seller ID'),
        items: z.array(z.object({
          code: z.string(),
          description: z.string().optional(),
          quantity: z.number(),
          price: z.number(),
          discount: z.number().optional(),
          taxes: z.array(z.object({ id: z.number() })).optional(),
        })),
        payments: z.array(z.object({
          id: z.number(),
          value: z.number(),
          due_date: z.string().optional(),
        })),
        stamp: z.object({ send: z.boolean() }).optional(),
        mail: z.object({ send: z.boolean() }).optional(),
        observations: z.string().optional(),
      })).describe('Array of invoices to create'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ notification_url, invoices }) => {
    try {
      return jsonResult(await client.createInvoiceBatch({ notification_url, invoices }));
    } catch (e) { return errorResult('siigo_create_invoice_batch', e); }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// QUOTATIONS (5 tools)
// ═══════════════════════════════════════════════════════════════════════════

server.registerTool(
  'siigo_get_quotations',
  {
    title: 'Get Quotations',
    description: 'Get list of quotations (cotizaciones) from Siigo',
    inputSchema: z.object({
      page: z.number().optional().describe('Page number'),
      page_size: z.number().optional().describe('Number of items per page'),
      created_start: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
      created_end: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  async (args) => {
    try {
      return jsonResult(await client.getQuotations(args));
    } catch (e) { return errorResult('siigo_get_quotations', e); }
  },
);

server.registerTool(
  'siigo_get_quotation',
  {
    title: 'Get Quotation',
    description: 'Get a specific quotation by ID',
    inputSchema: z.object({
      id: z.string().describe('Quotation ID'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  async ({ id }) => {
    try {
      return jsonResult(await client.getQuotation(id));
    } catch (e) { return errorResult('siigo_get_quotation', e); }
  },
);

server.registerTool(
  'siigo_create_quotation',
  {
    title: 'Create Quotation',
    description: 'Create a new quotation (cotizacion). Use document type C.',
    inputSchema: z.object({
      quotation: z.object({
        document: z.object({ id: z.number().describe('Document type ID (type C)') }),
        date: z.string().describe('Quotation date (YYYY-MM-DD)'),
        customer: z.object({
          identification: z.string().describe('Customer identification'),
          branch_office: z.number().optional().describe('Branch office'),
        }).describe('Customer reference'),
        cost_center: z.number().optional().describe('Cost center ID'),
        currency: z.object({
          code: z.string().describe('Currency code'),
          exchange_rate: z.number().describe('Exchange rate'),
        }).optional().describe('Currency (omit for local currency)'),
        seller: z.number().describe('Seller ID'),
        observations: z.string().optional().describe('Observations'),
        items: z.array(z.object({
          code: z.string().describe('Product code'),
          description: z.string().optional(),
          quantity: z.number().describe('Quantity (max 9999999.99)'),
          price: z.number().describe('Unit price (max 99999999999.99)'),
          discount: z.number().optional().describe('Discount'),
          taxes: z.array(z.object({ id: z.number() })).optional(),
        })).describe('Quotation items'),
      }).describe('Quotation data'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ quotation }) => {
    try {
      return jsonResult(await client.createQuotation(quotation));
    } catch (e) { return errorResult('siigo_create_quotation', e); }
  },
);

server.registerTool(
  'siigo_update_quotation',
  {
    title: 'Update Quotation',
    description: 'Update an existing quotation',
    inputSchema: z.object({
      id: z.string().describe('Quotation ID'),
      quotation: z.record(z.unknown()).describe('Quotation data to update (partial)'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ id, quotation }) => {
    try {
      return jsonResult(await client.updateQuotation(id, quotation));
    } catch (e) { return errorResult('siigo_update_quotation', e); }
  },
);

server.registerTool(
  'siigo_delete_quotation',
  {
    title: 'Delete Quotation',
    description: 'Delete a quotation',
    inputSchema: z.object({
      id: z.string().describe('Quotation ID'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: true },
  },
  async ({ id }) => {
    try {
      return jsonResult(await client.deleteQuotation(id));
    } catch (e) { return errorResult('siigo_delete_quotation', e); }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// CREDIT NOTES (4 tools)
// ═══════════════════════════════════════════════════════════════════════════

server.registerTool(
  'siigo_get_credit_notes',
  {
    title: 'Get Credit Notes',
    description: 'Get list of credit notes from Siigo',
    inputSchema: z.object({
      page: z.number().optional().describe('Page number'),
      page_size: z.number().optional().describe('Number of items per page'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  async (args) => {
    try {
      return jsonResult(await client.getCreditNotes(args));
    } catch (e) { return errorResult('siigo_get_credit_notes', e); }
  },
);

server.registerTool(
  'siigo_get_credit_note',
  {
    title: 'Get Credit Note',
    description: 'Get a specific credit note by ID',
    inputSchema: z.object({
      id: z.string().describe('Credit note ID'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  async ({ id }) => {
    try {
      return jsonResult(await client.getCreditNote(id));
    } catch (e) { return errorResult('siigo_get_credit_note', e); }
  },
);

server.registerTool(
  'siigo_create_credit_note',
  {
    title: 'Create Credit Note',
    description: 'Create a new credit note. Supports healthcare sector fields via healthcare_company. Can reference an existing invoice or provide invoice_data for external invoices.',
    inputSchema: z.object({
      creditNote: z.object({
        document: z.object({ id: z.number().describe('Document type ID (type NC)') }),
        date: z.string().describe('Date (YYYY-MM-DD)'),
        customer: z.object({
          identification: z.string(),
          branch_office: z.number().optional(),
        }),
        cost_center: z.number().optional(),
        seller: z.number().optional().describe('Seller ID'),
        items: z.array(z.object({
          code: z.string(),
          description: z.string().optional(),
          quantity: z.number(),
          price: z.number(),
          discount: z.number().optional(),
          taxes: z.array(z.object({ id: z.number() })).optional(),
        })),
        payments: z.array(z.object({
          id: z.number(),
          value: z.number(),
          due_date: z.string().optional(),
        })).optional(),
        retentions: z.array(z.object({ id: z.number() })).optional(),
        stamp: z.object({ send: z.boolean() }).optional(),
        mail: z.object({ send: z.boolean() }).optional(),
        observations: z.string().optional(),
        invoice: z.string().optional().describe('Related invoice ID'),
        invoice_data: z.object({
          prefix: z.string().optional(),
          number: z.number().optional(),
          date: z.string().optional(),
          cufe: z.string().optional(),
        }).optional().describe('External invoice data (when invoice is not in Siigo)'),
        reason: z.string().optional().describe('Credit note reason'),
        healthcare_company: z.object({
          operation_type: z.enum(['SS-CUFE', 'SS-SinAporte', 'SS-Recaudo']),
          period_start: z.string().optional(),
          period_end: z.string().optional(),
          payment_method: z.number().optional(),
          service_plan: z.number().optional(),
          policy_number: z.string().optional(),
          contract_number: z.string().optional(),
          copayment: z.number().optional(),
          coinsurance: z.number().optional(),
          cost_sharing: z.number().optional(),
          recovery_charge: z.number().optional(),
        }).optional().describe('Healthcare sector fields'),
      }).describe('Credit note data'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ creditNote }) => {
    try {
      return jsonResult(await client.createCreditNote(creditNote));
    } catch (e) { return errorResult('siigo_create_credit_note', e); }
  },
);

server.registerTool(
  'siigo_get_credit_note_pdf',
  {
    title: 'Get Credit Note PDF',
    description: 'Get credit note PDF as base64',
    inputSchema: z.object({
      id: z.string().describe('Credit note ID'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  async ({ id }) => {
    try {
      return jsonResult(await client.getCreditNotePdf(id));
    } catch (e) { return errorResult('siigo_get_credit_note_pdf', e); }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// VOUCHERS / CASH RECEIPTS - Recibos de Caja (3 tools)
// ═══════════════════════════════════════════════════════════════════════════

server.registerTool(
  'siigo_get_vouchers',
  {
    title: 'Get Vouchers',
    description: 'Get list of vouchers / cash receipts (recibos de caja) from Siigo',
    inputSchema: z.object({
      page: z.number().optional().describe('Page number'),
      page_size: z.number().optional().describe('Number of items per page'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  async (args) => {
    try {
      return jsonResult(await client.getVouchers(args));
    } catch (e) { return errorResult('siigo_get_vouchers', e); }
  },
);

server.registerTool(
  'siigo_get_voucher',
  {
    title: 'Get Voucher',
    description: 'Get a specific voucher / cash receipt by ID',
    inputSchema: z.object({
      id: z.string().describe('Voucher ID'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  async ({ id }) => {
    try {
      return jsonResult(await client.getVoucher(id));
    } catch (e) { return errorResult('siigo_get_voucher', e); }
  },
);

server.registerTool(
  'siigo_create_voucher',
  {
    title: 'Create Voucher',
    description: 'Create a new voucher / cash receipt (recibo de caja). Supports DebtPayment, AdvancePayment, and Advanced types.',
    inputSchema: z.object({
      voucher: z.object({
        document: z.object({ id: z.number().describe('Document type ID (type RC)') }),
        date: z.string().describe('Date (YYYY-MM-DD)'),
        type: z.enum(['DebtPayment', 'AdvancePayment', 'Advanced']).describe('Voucher type'),
        customer: z.object({
          identification: z.string(),
          branch_office: z.number().optional(),
        }),
        cost_center: z.number().optional(),
        currency: z.object({
          code: z.string(),
          exchange_rate: z.number(),
        }).optional(),
        items: z.array(z.record(z.unknown())).describe('Voucher items (structure varies by type)'),
        payments: z.array(z.object({
          id: z.number(),
          value: z.number(),
          due_date: z.string().optional(),
        })).optional(),
        observations: z.string().optional(),
      }).describe('Voucher data'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ voucher }) => {
    try {
      return jsonResult(await client.createVoucher(voucher));
    } catch (e) { return errorResult('siigo_create_voucher', e); }
  },
);

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
    } catch (e) { return errorResult('siigo_get_purchases', e); }
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
    } catch (e) { return errorResult('siigo_get_purchase', e); }
  },
);

server.registerTool(
  'siigo_create_purchase',
  {
    title: 'Create Purchase',
    description: 'Create a new purchase invoice (factura de compra). Use document type FC. If the document type has document_support=true, it creates a Documento Soporte.',
    inputSchema: z.object({
      purchase: z.record(z.unknown()).describe('Purchase data'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ purchase }) => {
    try {
      return jsonResult(await client.createPurchase(purchase));
    } catch (e) { return errorResult('siigo_create_purchase', e); }
  },
);

server.registerTool(
  'siigo_update_purchase',
  {
    title: 'Update Purchase',
    description: 'Update an existing purchase invoice',
    inputSchema: z.object({
      id: z.string().describe('Purchase ID'),
      purchase: z.record(z.unknown()).describe('Purchase data to update (partial)'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ id, purchase }) => {
    try {
      return jsonResult(await client.updatePurchase(id, purchase));
    } catch (e) { return errorResult('siigo_update_purchase', e); }
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
    } catch (e) { return errorResult('siigo_delete_purchase', e); }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT RECEIPTS - Recibos de Pago / Comprobantes de Egreso (5 tools)
// ═══════════════════════════════════════════════════════════════════════════

server.registerTool(
  'siigo_get_payment_receipts',
  {
    title: 'Get Payment Receipts',
    description: 'Get list of payment receipts / disbursements (recibos de pago / comprobantes de egreso) from Siigo',
    inputSchema: z.object({
      page: z.number().optional().describe('Page number'),
      page_size: z.number().optional().describe('Number of items per page'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  async (args) => {
    try {
      return jsonResult(await client.getPaymentReceipts(args));
    } catch (e) { return errorResult('siigo_get_payment_receipts', e); }
  },
);

server.registerTool(
  'siigo_get_payment_receipt',
  {
    title: 'Get Payment Receipt',
    description: 'Get a specific payment receipt by ID',
    inputSchema: z.object({
      id: z.string().describe('Payment receipt ID'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  async ({ id }) => {
    try {
      return jsonResult(await client.getPaymentReceipt(id));
    } catch (e) { return errorResult('siigo_get_payment_receipt', e); }
  },
);

server.registerTool(
  'siigo_create_payment_receipt',
  {
    title: 'Create Payment Receipt',
    description: 'Create a new payment receipt / disbursement (recibo de pago / comprobante de egreso). Supports DebtPayment, AdvancePayment, and Advanced types.',
    inputSchema: z.object({
      paymentReceipt: z.object({
        document: z.object({ id: z.number().describe('Document type ID (type RP)') }),
        date: z.string().describe('Date (YYYY-MM-DD)'),
        type: z.enum(['DebtPayment', 'AdvancePayment', 'Advanced']).describe('Receipt type'),
        customer: z.object({
          identification: z.string(),
          branch_office: z.number().optional(),
        }),
        cost_center: z.number().optional(),
        currency: z.object({
          code: z.string(),
          exchange_rate: z.number(),
        }).optional(),
        items: z.array(z.record(z.unknown())).describe('Receipt items (structure varies by type)'),
        payments: z.array(z.object({
          id: z.number(),
          value: z.number(),
          due_date: z.string().optional(),
        })).optional(),
        observations: z.string().optional(),
      }).describe('Payment receipt data'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ paymentReceipt }) => {
    try {
      return jsonResult(await client.createPaymentReceipt(paymentReceipt));
    } catch (e) { return errorResult('siigo_create_payment_receipt', e); }
  },
);

server.registerTool(
  'siigo_update_payment_receipt',
  {
    title: 'Update Payment Receipt',
    description: 'Update an existing payment receipt',
    inputSchema: z.object({
      id: z.string().describe('Payment receipt ID'),
      paymentReceipt: z.record(z.unknown()).describe('Payment receipt data to update (partial)'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ id, paymentReceipt }) => {
    try {
      return jsonResult(await client.updatePaymentReceipt(id, paymentReceipt));
    } catch (e) { return errorResult('siigo_update_payment_receipt', e); }
  },
);

server.registerTool(
  'siigo_delete_payment_receipt',
  {
    title: 'Delete Payment Receipt',
    description: 'Delete a payment receipt',
    inputSchema: z.object({
      id: z.string().describe('Payment receipt ID'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: true },
  },
  async ({ id }) => {
    try {
      return jsonResult(await client.deletePaymentReceipt(id));
    } catch (e) { return errorResult('siigo_delete_payment_receipt', e); }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// JOURNALS - Comprobantes Contables (3 tools)
// ═══════════════════════════════════════════════════════════════════════════

server.registerTool(
  'siigo_get_journals',
  {
    title: 'Get Journals',
    description: 'Get list of accounting journals (comprobantes contables) from Siigo',
    inputSchema: z.object({
      page: z.number().optional().describe('Page number'),
      page_size: z.number().optional().describe('Number of items per page'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  async (args) => {
    try {
      return jsonResult(await client.getJournals(args));
    } catch (e) { return errorResult('siigo_get_journals', e); }
  },
);

server.registerTool(
  'siigo_get_journal',
  {
    title: 'Get Journal',
    description: 'Get a specific accounting journal by ID',
    inputSchema: z.object({
      id: z.string().describe('Journal ID'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  async ({ id }) => {
    try {
      return jsonResult(await client.getJournal(id));
    } catch (e) { return errorResult('siigo_get_journal', e); }
  },
);

server.registerTool(
  'siigo_create_journal',
  {
    title: 'Create Journal',
    description: 'Create a new accounting journal entry (comprobante contable)',
    inputSchema: z.object({
      journal: z.object({
        document: z.object({ id: z.number().describe('Document type ID (type CC)') }),
        date: z.string().describe('Date (YYYY-MM-DD)'),
        items: z.array(z.object({
          account: z.object({
            code: z.string().describe('Account code'),
            movement: z.enum(['Debit', 'Credit']).describe('Movement type'),
          }),
          customer: z.object({
            identification: z.string(),
            branch_office: z.number().optional(),
          }).optional().describe('Third party reference'),
          description: z.string().optional(),
          value: z.number().describe('Value'),
          cost_center: z.number().optional(),
        })).describe('Journal items (debits must equal credits)'),
        observations: z.string().optional(),
      }).describe('Journal data'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ journal }) => {
    try {
      return jsonResult(await client.createJournal(journal));
    } catch (e) { return errorResult('siigo_create_journal', e); }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOKS (4 tools)
// ═══════════════════════════════════════════════════════════════════════════

server.registerTool(
  'siigo_get_webhooks',
  {
    title: 'Get Webhooks',
    description: 'Get list of webhook subscriptions',
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  async () => {
    try {
      return jsonResult(await client.getWebhooks());
    } catch (e) { return errorResult('siigo_get_webhooks', e); }
  },
);

server.registerTool(
  'siigo_create_webhook',
  {
    title: 'Create Webhook',
    description: 'Subscribe to a webhook event',
    inputSchema: z.object({
      event: z.string().describe('Event to subscribe to'),
      url: z.string().describe('Webhook URL (HTTPS)'),
      secret: z.string().optional().describe('Webhook secret for signature verification'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async (args) => {
    try {
      return jsonResult(await client.createWebhook(args));
    } catch (e) { return errorResult('siigo_create_webhook', e); }
  },
);

server.registerTool(
  'siigo_update_webhook',
  {
    title: 'Update Webhook',
    description: 'Update an existing webhook subscription',
    inputSchema: z.object({
      id: z.string().describe('Webhook ID'),
      event: z.string().optional().describe('Event to subscribe to'),
      url: z.string().optional().describe('Webhook URL (HTTPS)'),
      secret: z.string().optional().describe('Webhook secret'),
      active: z.boolean().optional().describe('Active status'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async (args) => {
    try {
      return jsonResult(await client.updateWebhook(args));
    } catch (e) { return errorResult('siigo_update_webhook', e); }
  },
);

server.registerTool(
  'siigo_delete_webhook',
  {
    title: 'Delete Webhook',
    description: 'Delete a webhook subscription',
    inputSchema: z.object({
      id: z.string().describe('Webhook ID'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: true },
  },
  async ({ id }) => {
    try {
      return jsonResult(await client.deleteWebhook(id));
    } catch (e) { return errorResult('siigo_delete_webhook', e); }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// CATALOGS (12 tools)
// ═══════════════════════════════════════════════════════════════════════════

server.registerTool(
  'siigo_get_document_types',
  {
    title: 'Get Document Types',
    description: 'Get document types catalog. Filter by type: FV (sales invoice), RC (cash receipt), NC (credit note), FC (purchase invoice), CC (journal), RP (payment receipt), C (quotation).',
    inputSchema: z.object({
      type: z.enum(['FV', 'RC', 'NC', 'FC', 'CC', 'RP', 'C']).optional().describe('Document type filter'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  async ({ type }) => {
    try {
      return jsonResult(await client.getDocumentTypes(type));
    } catch (e) { return errorResult('siigo_get_document_types', e); }
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
    } catch (e) { return errorResult('siigo_get_taxes', e); }
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
    } catch (e) { return errorResult('siigo_get_payment_types', e); }
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
    } catch (e) { return errorResult('siigo_get_cost_centers', e); }
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
    } catch (e) { return errorResult('siigo_get_users', e); }
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
    } catch (e) { return errorResult('siigo_get_warehouses', e); }
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
    } catch (e) { return errorResult('siigo_get_price_lists', e); }
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
    } catch (e) { return errorResult('siigo_get_cities', e); }
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
    } catch (e) { return errorResult('siigo_get_id_types', e); }
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
    } catch (e) { return errorResult('siigo_get_fiscal_responsibilities', e); }
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
    } catch (e) { return errorResult('siigo_get_fixed_assets', e); }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// REPORTS (3 tools)
// ═══════════════════════════════════════════════════════════════════════════

server.registerTool(
  'siigo_get_trial_balance',
  {
    title: 'Get Trial Balance',
    description: 'Generate trial balance report (Excel). Uses POST as per Siigo API spec.',
    inputSchema: z.object({
      account_start: z.string().optional().describe('Starting account code'),
      account_end: z.string().optional().describe('Ending account code'),
      year: z.number().describe('Year'),
      month_start: z.number().describe('Starting month (1-13)'),
      month_end: z.number().describe('Ending month (1-13)'),
      includes_tax_difference: z.boolean().describe('Include tax differences'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  async (args) => {
    try {
      return jsonResult(await client.getTrialBalance(args));
    } catch (e) { return errorResult('siigo_get_trial_balance', e); }
  },
);

server.registerTool(
  'siigo_get_trial_balance_by_third',
  {
    title: 'Get Trial Balance by Third',
    description: 'Generate trial balance by third party report (Excel). Uses POST as per Siigo API spec.',
    inputSchema: z.object({
      account_start: z.string().optional().describe('Starting account code'),
      account_end: z.string().optional().describe('Ending account code'),
      year: z.number().describe('Year'),
      month_start: z.number().describe('Starting month (1-13)'),
      month_end: z.number().describe('Ending month (1-13)'),
      includes_tax_difference: z.boolean().describe('Include tax differences'),
      customer: z.object({
        identification: z.string(),
        branch_office: z.number().optional(),
      }).optional().describe('Customer filter'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  async (args) => {
    try {
      return jsonResult(await client.getTrialBalanceByThird(args));
    } catch (e) { return errorResult('siigo_get_trial_balance_by_third', e); }
  },
);

server.registerTool(
  'siigo_get_accounts_payable',
  {
    title: 'Get Accounts Payable',
    description: 'Get accounts payable report',
    inputSchema: z.object({
      page: z.number().optional().describe('Page number'),
      page_size: z.number().optional().describe('Number of items per page'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  async (args) => {
    try {
      return jsonResult(await client.getAccountsPayable(args));
    } catch (e) { return errorResult('siigo_get_accounts_payable', e); }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
