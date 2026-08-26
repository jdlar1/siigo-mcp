import { errorResult, jsonResult } from '../mcp-results.js';
import {
  invoiceAnnulToolOutputSchema,
  invoiceBatchInputSchema,
  invoiceBatchToolOutputSchema,
  invoiceCreateInputSchema,
  invoiceDeleteToolOutputSchema,
  invoiceEmailToolOutputSchema,
  invoiceEntityToolOutputSchema,
  invoiceIdInputSchema,
  invoiceListQuerySchema,
  invoiceListToolOutputSchema,
  invoiceMailInputSchema,
  invoicePdfToolOutputSchema,
  invoiceStampErrorsToolOutputSchema,
  invoiceUpdateInputSchema,
  invoiceXmlToolOutputSchema,
} from '../schemas/invoices.js';
import type { ToolContext } from '../tool-context.js';

export function registerInvoiceTools({ server, client }: ToolContext) {
  // ═══════════════════════════════════════════════════════════════════════════
  // INVOICES (10 tools)
  // ═══════════════════════════════════════════════════════════════════════════

  server.registerTool(
    'siigo_get_invoices',
    {
      title: 'Get Invoices',
      description: 'List sales invoices with the official Siigo document, customer, name, and date filters.',
      inputSchema: invoiceListQuerySchema,
      outputSchema: invoiceListToolOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args, extra) => {
      try {
        return jsonResult(await client.getInvoices(args, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_get_invoices', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_invoice',
    {
      title: 'Get Invoice',
      description: 'Get a specific invoice by UUID',
      inputSchema: invoiceIdInputSchema,
      outputSchema: invoiceEntityToolOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }, extra) => {
      try {
        return jsonResult(await client.getInvoice(id, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_get_invoice', e);
      }
    },
  );

  server.registerTool(
    'siigo_create_invoice',
    {
      title: 'Create Invoice',
      description: 'Create a sales invoice with complete item, payment, additional-field, transport, gift-item, and healthcare support.',
      inputSchema: invoiceCreateInputSchema,
      outputSchema: invoiceEntityToolOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ invoice, idempotency_key }, extra) => {
      try {
        return jsonResult(await client.createInvoice(invoice, { idempotencyKey: idempotency_key, signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_create_invoice', e);
      }
    },
  );

  server.registerTool(
    'siigo_update_invoice',
    {
      title: 'Update Invoice',
      description: 'Replace an existing invoice with a complete validated payload; immutable fields remain API-controlled.',
      inputSchema: invoiceUpdateInputSchema,
      outputSchema: invoiceEntityToolOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id, invoice }, extra) => {
      try {
        return jsonResult(await client.updateInvoice(id, invoice, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_update_invoice', e);
      }
    },
  );

  server.registerTool(
    'siigo_delete_invoice',
    {
      title: 'Delete Invoice',
      description: 'Delete an invoice that is eligible for deletion in Siigo.',
      inputSchema: invoiceIdInputSchema,
      outputSchema: invoiceDeleteToolOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }, extra) => {
      try {
        return jsonResult(await client.deleteInvoice(id, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_delete_invoice', e);
      }
    },
  );

  server.registerTool(
    'siigo_annul_invoice',
    {
      title: 'Annul Invoice',
      description: 'Annul a sales invoice that is eligible for annulment in Siigo.',
      inputSchema: invoiceIdInputSchema,
      outputSchema: invoiceAnnulToolOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }, extra) => {
      try {
        return jsonResult(await client.annulInvoice(id, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_annul_invoice', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_invoice_pdf',
    {
      title: 'Get Invoice PDF',
      description: 'Get invoice PDF content as base64.',
      inputSchema: invoiceIdInputSchema,
      outputSchema: invoicePdfToolOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }, extra) => {
      try {
        return jsonResult(await client.getInvoicePdf(id, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_get_invoice_pdf', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_invoice_xml',
    {
      title: 'Get Invoice XML',
      description: 'Get invoice electronic XML content as base64.',
      inputSchema: invoiceIdInputSchema,
      outputSchema: invoiceXmlToolOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }, extra) => {
      try {
        return jsonResult(await client.getInvoiceXml(id, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_get_invoice_xml', e);
      }
    },
  );

  server.registerTool(
    'siigo_get_invoice_stamp_errors',
    {
      title: 'Get Invoice DIAN Errors',
      description: 'Get DIAN rejection errors for an invoice that failed electronic stamping.',
      inputSchema: invoiceIdInputSchema,
      outputSchema: invoiceStampErrorsToolOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }, extra) => {
      try {
        return jsonResult(await client.getInvoiceStampErrors(id, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_get_invoice_stamp_errors', e);
      }
    },
  );

  server.registerTool(
    'siigo_send_invoice_email',
    {
      title: 'Send Invoice Email',
      description: 'Send an invoice by email with up to five semicolon-separated copy recipients.',
      inputSchema: invoiceMailInputSchema,
      outputSchema: invoiceEmailToolOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ id, guid, mail_to, copy_to }, extra) => {
      try {
        return jsonResult(await client.sendInvoiceByEmail(id, { guid, mail_to, copy_to }, { signal: extra.signal }));
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
      description: 'Create invoices asynchronously. Requires an HTTPS callback URL and a per-invoice idempotency key.',
      inputSchema: invoiceBatchInputSchema,
      outputSchema: invoiceBatchToolOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ notification_url, invoices }, extra) => {
      try {
        return jsonResult(await client.createInvoiceBatch({ notification_url, invoices }, { signal: extra.signal }));
      } catch (e) {
        return errorResult('siigo_create_invoice_batch', e);
      }
    },
  );
}
