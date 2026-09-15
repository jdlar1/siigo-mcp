import { type CallToolResult, McpServer, type ServerContext } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { errorResult, jsonResult } from './mcp-results.js';
import { OperationRegistry, operationDomainSchema } from './operations.js';
import { paginationQuerySchema, positiveIntegerSchema } from './schemas/common.js';
import { customerListQuerySchema, customerSearchSchema } from './schemas/customers.js';
import { invoiceCreateInputSchema, invoiceEntityToolOutputSchema, invoiceListQuerySchema } from './schemas/invoices.js';
import { prepareInvoiceSchema } from './schemas/prepare-invoice.js';
import { productListQuerySchema, productSearchSchema } from './schemas/products.js';
import { accountsPayableQuerySchema, trialBalanceByThirdSchema, trialBalanceSchema } from './schemas/reports.js';
import type { SiigoClient } from './siigo-client.js';
import { PACKAGE_NAME, PACKAGE_VERSION } from './version.js';

const readAnnotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const;
// The selected operation has its own exact output schema, available via discovery.
const flexibleOutput = z.object({ result: z.json() });
const operationArguments = z
  .record(z.string(), z.unknown())
  .describe('Arguments matching the exact schema returned by siigo_discover_operations');

function unwrap(result: CallToolResult): unknown {
  return z.object({ result: z.unknown() }).parse(result.structuredContent).result;
}

function handle(name: string, callback: () => Promise<CallToolResult>): Promise<CallToolResult> {
  return callback().catch((error: unknown) => errorResult(name, error));
}

const documentOperations = {
  invoice: ['invoices', 'siigo_get_invoice'],
  quotation: ['quotations', 'siigo_get_quotation'],
  credit_note: ['credit_notes', 'siigo_get_credit_note'],
  voucher: ['vouchers', 'siigo_get_voucher'],
  purchase: ['purchases', 'siigo_get_purchase'],
  purchase_support_document: ['purchase_support_documents', 'siigo_get_purchase_support_document'],
  payment_receipt: ['payment_receipts', 'siigo_get_payment_receipt'],
  journal: ['journals', 'siigo_get_journal'],
} as const;

export interface McpServerOptions {
  /** Reuse only with the same client; HTTP uses this to retain lazy registrations between requests. */
  operations?: OperationRegistry;
}

export function createMcpServer(client: SiigoClient, options: McpServerOptions = {}): McpServer {
  if (options.operations && !options.operations.isFor(client)) throw new Error('Operation registry belongs to a different Siigo client.');
  const server = new McpServer({ name: PACKAGE_NAME, version: PACKAGE_VERSION });
  const operations = options.operations ?? new OperationRegistry(client);

  server.registerTool(
    'siigo_search',
    {
      title: 'Search Siigo',
      description:
        'Find customers, products or sales invoices. List mode uses API filters and pagination; partial mode scans customers/products and can require many API requests.',
      inputSchema: z
        .object({
          query: z
            .discriminatedUnion('entity', [
              z.object({ entity: z.literal('customers'), mode: z.literal('list'), filters: customerListQuerySchema }).strict(),
              z.object({ entity: z.literal('products'), mode: z.literal('list'), filters: productListQuerySchema }).strict(),
              z.object({ entity: z.literal('invoices'), mode: z.literal('list'), filters: invoiceListQuerySchema }).strict(),
              z.object({ entity: z.literal('customer_matches'), mode: z.literal('partial'), filters: customerSearchSchema }).strict(),
              z.object({ entity: z.literal('product_matches'), mode: z.literal('partial'), filters: productSearchSchema }).strict(),
            ])
            .describe('Entity and its supported filters'),
        })
        .strict(),
      outputSchema: flexibleOutput,
      annotations: readAnnotations,
    },
    async ({ query }, ctx) =>
      handle('siigo_search', () => {
        const route = {
          customers: ['customers', 'siigo_get_customers'],
          products: ['products', 'siigo_get_products'],
          invoices: ['invoices', 'siigo_get_invoices'],
          customer_matches: ['customers', 'siigo_search_customers'],
          product_matches: ['products', 'siigo_search_products'],
        } as const;
        const [domain, operation] = route[query.entity];
        return operations.execute(domain, operation, 'read', query.filters, ctx);
      }),
  );

  server.registerTool(
    'siigo_get_document',
    {
      title: 'Get Document',
      description: 'Read an accounting document by UUID. Invoice PDF/XML and credit-note PDF can be requested in the same call.',
      inputSchema: z
        .object({
          type: z
            .enum(['invoice', 'quotation', 'credit_note', 'voucher', 'purchase', 'purchase_support_document', 'payment_receipt', 'journal'])
            .describe('Document kind'),
          id: z.uuid().describe('Document UUID'),
          files: z
            .array(z.enum(['pdf', 'xml']))
            .max(2)
            .default([])
            .describe('Optional files; PDF/XML for invoices, PDF for credit notes'),
        })
        .strict(),
      outputSchema: flexibleOutput,
      annotations: readAnnotations,
    },
    async ({ type, id, files }, ctx) =>
      handle('siigo_get_document', async () => {
        if (files.some((file) => type !== 'invoice' && !(type === 'credit_note' && file === 'pdf')))
          throw new Error('Requested file format is not supported for this document type.');
        const [domain, operation] = documentOperations[type];
        const document = await operations.execute(domain, operation, 'read', { id }, ctx);
        if (document.isError || !files.length) return document;
        const attachments: Record<string, unknown> = {};
        for (const file of new Set(files)) {
          const result = await operations.execute(domain, `${operation}_${file}`, 'read', { id }, ctx);
          if (result.isError) return result;
          attachments[file] = unwrap(result);
        }
        return jsonResult({ document: unwrap(document), files: attachments });
      }),
  );

  server.registerTool(
    'siigo_get_catalogs',
    {
      title: 'Get Catalogs',
      description: 'Fetch selected reference catalogs together. Payment types require document_type. Only requested catalogs are fetched.',
      inputSchema: z
        .object({
          catalogs: z
            .array(
              z.enum([
                'document_types',
                'taxes',
                'payment_types',
                'cost_centers',
                'users',
                'warehouses',
                'price_lists',
                'fixed_assets',
                'expenses',
                'misc_income',
              ]),
            )
            .min(1)
            .max(10)
            .describe('Catalogs needed for the current task'),
          document_type: z
            .enum(['FV', 'RC', 'NC', 'FC', 'CC', 'RP', 'C', 'DS'])
            .optional()
            .describe('Document type for payment methods and document types'),
          page: paginationQuerySchema.shape.page,
          page_size: paginationQuerySchema.shape.page_size,
        })
        .strict(),
      outputSchema: flexibleOutput,
      annotations: readAnnotations,
    },
    async ({ catalogs, document_type, page, page_size }, ctx) =>
      handle('siigo_get_catalogs', async () => {
        if (catalogs.includes('payment_types') && !document_type) throw new Error('document_type is required for payment_types.');
        const results: Record<string, unknown> = {};
        for (const catalog of new Set(catalogs)) {
          const args =
            catalog === 'payment_types'
              ? { document_type }
              : catalog === 'document_types'
                ? { type: document_type }
                : catalog === 'users'
                  ? { page, page_size }
                  : {};
          const result = await operations.execute('catalogs', `siigo_get_${catalog}`, 'read', args, ctx);
          if (result.isError) return result;
          results[catalog] = unwrap(result);
        }
        return jsonResult(results);
      }),
  );

  server.registerTool(
    'siigo_prepare_invoice',
    {
      title: 'Prepare Invoice',
      description:
        'Prepare a common sales invoice without writing. Resolve exact customer/product references and validate selected document, tax and payment IDs. Ambiguities are returned for selection. Prices and amounts must be supplied; advanced invoice fields use siigo_create_invoice.',
      inputSchema: prepareInvoiceSchema,
      outputSchema: flexibleOutput,
      annotations: readAnnotations,
    },
    async (args, ctx) =>
      handle('siigo_prepare_invoice', async () => {
        const { prepareInvoice } = await import('./tasks/prepare-invoice.js');
        return jsonResult(await prepareInvoice(client, args, ctx.mcpReq.signal));
      }),
  );

  server.registerTool(
    'siigo_create_invoice',
    {
      title: 'Create Invoice',
      description:
        'Create a sales invoice using a prepared or complete payload. Supports advanced fields and an optional idempotency key. This writes to Siigo.',
      inputSchema: invoiceCreateInputSchema,
      outputSchema: invoiceEntityToolOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (args, ctx) => handle('siigo_create_invoice', () => operations.execute('invoices', 'siigo_create_invoice', 'write', args, ctx)),
  );

  server.registerTool(
    'siigo_get_report',
    {
      title: 'Get Report',
      description:
        'Generate a trial balance (optionally by third party), or retrieve accounts payable. Exact operation validation is applied before the API call.',
      inputSchema: z
        .object({
          request: z
            .discriminatedUnion('report', [
              z.object({ report: z.literal('trial_balance'), filters: trialBalanceSchema }).strict(),
              z.object({ report: z.literal('trial_balance_by_third'), filters: trialBalanceByThirdSchema }).strict(),
              z.object({ report: z.literal('accounts_payable'), filters: accountsPayableQuerySchema }).strict(),
            ])
            .describe('Report and filters'),
        })
        .strict(),
      outputSchema: flexibleOutput,
      annotations: readAnnotations,
    },
    async ({ request }, ctx) =>
      handle('siigo_get_report', () => operations.execute('reports', `siigo_get_${request.report}`, 'read', request.filters, ctx)),
  );

  server.registerTool(
    'siigo_discover_operations',
    {
      title: 'Discover Operations',
      description:
        'Without a domain, list matching domains. With a domain, return matching secondary operations and their exact input/output schemas. Use a returned executor with the same domain and operation. Does not change tools/list.',
      inputSchema: z
        .object({
          domain: operationDomainSchema.optional().describe('Domain to load; omit to list domains'),
          query: z.string().max(200).optional().describe('Optional words to match against names and descriptions'),
          limit: positiveIntegerSchema
            .max(20)
            .default(5)
            .describe('Maximum operation schemas to return; narrow query for remaining matches'),
        })
        .strict(),
      outputSchema: flexibleOutput,
      annotations: readAnnotations,
    },
    async (args) => handle('siigo_discover_operations', async () => jsonResult(await operations.discover(args))),
  );

  for (const kind of ['read', 'write', 'destructive'] as const) {
    const name = `siigo_execute_${kind}`;
    server.registerTool(
      name,
      {
        title: `Execute ${kind} Operation`,
        description: `Execute a discovered ${kind} operation. Discover its exact schema first. Operations in other categories are rejected before any API call.`,
        inputSchema: z
          .object({
            domain: operationDomainSchema.describe('Domain from discovery'),
            operation: z.string().min(1).max(100).describe('Exact operation name from discovery'),
            arguments: operationArguments,
          })
          .strict(),
        outputSchema: flexibleOutput,
        annotations: {
          readOnlyHint: kind === 'read',
          destructiveHint: kind === 'destructive',
          idempotentHint: kind === 'read',
          openWorldHint: true,
        },
      },
      async (args, ctx: ServerContext) => handle(name, () => operations.execute(args.domain, args.operation, kind, args.arguments, ctx)),
    );
  }
  return server;
}
