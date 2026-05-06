import { z } from 'zod';
import { errorResult, jsonResult } from '../mcp-results.js';
import type { ToolContext } from '../tool-context.js';

export function registerInvoiceTools({ server, client }: ToolContext) {
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
      } catch (e) {
        return errorResult('siigo_get_invoices', e);
      }
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
      } catch (e) {
        return errorResult('siigo_get_invoice', e);
      }
    },
  );

  server.registerTool(
    'siigo_create_invoice',
    {
      title: 'Create Invoice',
      description:
        'Create a new sales invoice. Supports healthcare sector (healthcare_company) and cargo transportation (cargo_transportation) fields.',
      inputSchema: z.object({
        invoice: z
          .object({
            document: z.object({ id: z.number().describe('Document type ID') }),
            date: z.string().describe('Invoice date (YYYY-MM-DD)'),
            customer: z
              .object({
                identification: z.string().describe('Customer identification'),
                branch_office: z.number().optional().describe('Branch office'),
              })
              .describe('Customer reference'),
            cost_center: z.number().optional().describe('Cost center ID'),
            currency: z
              .object({
                code: z.string().describe('Currency code'),
                exchange_rate: z.number().describe('Exchange rate'),
              })
              .optional()
              .describe('Currency (omit for local currency)'),
            seller: z.number().describe('Seller ID'),
            observations: z.string().optional().describe('Observations'),
            items: z
              .array(
                z.object({
                  code: z.string().describe('Product code'),
                  description: z.string().optional(),
                  quantity: z.number().describe('Quantity'),
                  price: z.number().describe('Unit price'),
                  discount: z.number().optional().describe('Discount'),
                  taxes: z.array(z.object({ id: z.number() })).optional(),
                  warehouse: z.number().optional().describe('Warehouse ID'),
                }),
              )
              .describe('Invoice items'),
            payments: z
              .array(
                z.object({
                  id: z.number().describe('Payment type ID'),
                  value: z.number().describe('Payment value'),
                  due_date: z.string().optional().describe('Due date (YYYY-MM-DD)'),
                }),
              )
              .describe('Payment methods'),
            stamp: z.object({ send: z.boolean() }).optional().describe('Send to DIAN electronically'),
            mail: z.object({ send: z.boolean() }).optional().describe('Send by email'),
            retentions: z
              .array(z.object({ id: z.number() }))
              .optional()
              .describe('Retention taxes'),
            global_discounts: z
              .array(
                z.object({
                  id: z.number(),
                  percentage: z.number().optional(),
                  value: z.number().optional(),
                }),
              )
              .optional()
              .describe('Global discounts'),
            healthcare_company: z
              .object({
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
              })
              .optional()
              .describe('Healthcare sector fields (required if document type is healthcare)'),
          })
          .describe('Invoice data'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ invoice }) => {
      try {
        return jsonResult(await client.createInvoice(invoice));
      } catch (e) {
        return errorResult('siigo_create_invoice', e);
      }
    },
  );

  server.registerTool(
    'siigo_update_invoice',
    {
      title: 'Update Invoice',
      description: 'Update an existing invoice',
      inputSchema: z.object({
        id: z.string().describe('Invoice ID'),
        invoice: z.record(z.string(), z.unknown()).describe('Invoice data to update (partial)'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ id, invoice }) => {
      try {
        return jsonResult(await client.updateInvoice(id, invoice));
      } catch (e) {
        return errorResult('siigo_update_invoice', e);
      }
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
      } catch (e) {
        return errorResult('siigo_delete_invoice', e);
      }
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
      } catch (e) {
        return errorResult('siigo_annul_invoice', e);
      }
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
      } catch (e) {
        return errorResult('siigo_get_invoice_pdf', e);
      }
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
      } catch (e) {
        return errorResult('siigo_get_invoice_xml', e);
      }
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
      } catch (e) {
        return errorResult('siigo_get_invoice_stamp_errors', e);
      }
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
      } catch (e) {
        return errorResult('siigo_send_invoice_email', e);
      }
    },
  );

  // ─── Batch Invoices ────────────────────────────────────────────────────────

  server.registerTool(
    'siigo_create_invoice_batch',
    {
      title: 'Create Invoice Batch',
      description:
        'Create invoices in batch asynchronously. Requires a notification_url (HTTPS webhook) that will receive the results when processing completes.',
      inputSchema: z.object({
        notification_url: z.string().describe('HTTPS URL for webhook notification when batch completes (max 2048 chars)'),
        invoices: z
          .array(
            z.object({
              idempotency_key: z.string().describe('Unique external identifier (alphanumeric, max 30 chars)'),
              document: z.object({ id: z.number() }),
              date: z.string().describe('Date (YYYY-MM-DD)'),
              customer: z.object({
                identification: z.string(),
                branch_office: z.number().optional(),
              }),
              cost_center: z.number().optional(),
              seller: z.number().describe('Seller ID'),
              items: z.array(
                z.object({
                  code: z.string(),
                  description: z.string().optional(),
                  quantity: z.number(),
                  price: z.number(),
                  discount: z.number().optional(),
                  taxes: z.array(z.object({ id: z.number() })).optional(),
                }),
              ),
              payments: z.array(
                z.object({
                  id: z.number(),
                  value: z.number(),
                  due_date: z.string().optional(),
                }),
              ),
              stamp: z.object({ send: z.boolean() }).optional(),
              mail: z.object({ send: z.boolean() }).optional(),
              observations: z.string().optional(),
            }),
          )
          .describe('Array of invoices to create'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ notification_url, invoices }) => {
      try {
        return jsonResult(await client.createInvoiceBatch({ notification_url, invoices }));
      } catch (e) {
        return errorResult('siigo_create_invoice_batch', e);
      }
    },
  );
}
