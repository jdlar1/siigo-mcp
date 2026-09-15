import { type CallToolResult, McpServer, type ServerContext } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { documentTasks } from './document-tasks.js';
import { errorResult, jsonResult } from './mcp-results.js';
import { OperationRegistry, operationDomainSchema } from './operations.js';
import { positiveIntegerSchema } from './schemas/common.js';
import { createDocumentSchema, prepareDocumentOutputSchema, prepareDocumentSchema } from './schemas/document-tasks.js';
import { searchSchema } from './schemas/search.js';
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

const recordOperations = {
  customer: ['customers', 'siigo_get_customer'],
  product: ['products', 'siigo_get_product'],
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
        'Find customers/suppliers, products and supported accounting documents. Returns candidates and pagination; never selects a match. Use siigo_get_record with a selected UUID. List uses exact API filters; partial customer/product searches may scan many pages. Suppliers are customers with type Supplier.',
      inputSchema: searchSchema,
      outputSchema: flexibleOutput,
      annotations: readAnnotations,
    },
    async ({ query }, ctx) =>
      handle('siigo_search', () => {
        const route = {
          customers: ['customers', 'siigo_get_customers'],
          products: ['products', 'siigo_get_products'],
          invoices: ['invoices', 'siigo_get_invoices'],
          payment_receipts: ['payment_receipts', 'siigo_get_payment_receipts'],
          journals: ['journals', 'siigo_get_journals'],
          credit_notes: ['credit_notes', 'siigo_get_credit_notes'],
          vouchers: ['vouchers', 'siigo_get_vouchers'],
          purchases: ['purchases', 'siigo_get_purchases'],
          quotations: ['quotations', 'siigo_get_quotations'],
          customer_matches: ['customers', 'siigo_search_customers'],
          product_matches: ['products', 'siigo_search_products'],
        } as const;
        const [domain, operation] = route[query.entity];
        return operations.execute(domain, operation, 'read', query.filters, ctx);
      }),
  );

  server.registerTool(
    'siigo_get_record',
    {
      title: 'Get Record',
      description:
        'Inspect a customer, product or accounting document by a selected UUID from siigo_search. Optionally include invoice PDF/XML, credit-note PDF or invoice DIAN stamp errors. Unsupported extras are rejected before any read.',
      inputSchema: z
        .object({
          type: z
            .enum([
              'customer',
              'product',
              'invoice',
              'quotation',
              'credit_note',
              'voucher',
              'purchase',
              'purchase_support_document',
              'payment_receipt',
              'journal',
            ])
            .describe('Record kind'),
          id: z.uuid().describe('Selected record UUID'),
          include_stamp_errors: z.boolean().default(false).describe('Include DIAN rejection details; invoices only.'),
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
    async ({ type, id, files, include_stamp_errors }, ctx) =>
      handle('siigo_get_record', async () => {
        if (files.some((file) => type !== 'invoice' && !(type === 'credit_note' && file === 'pdf')))
          throw new Error('Requested file format is not supported for this document type.');
        if (include_stamp_errors && type !== 'invoice') throw new Error('Stamp errors are supported only for invoices.');
        const [domain, operation] = recordOperations[type];
        const document = await operations.execute(domain, operation, 'read', { id }, ctx);
        if (document.isError || (!files.length && !include_stamp_errors)) return document;
        const attachments: Record<string, unknown> = {};
        for (const file of new Set(files)) {
          const result = await operations.execute(domain, `${operation}_${file}`, 'read', { id }, ctx);
          if (result.isError) return result;
          attachments[file] = unwrap(result);
        }
        if (include_stamp_errors) {
          const errors = await operations.execute('invoices', 'siigo_get_invoice_stamp_errors', 'read', { id }, ctx);
          if (errors.isError) return errors;
          return jsonResult({ record: unwrap(document), files: attachments, stamp_errors: unwrap(errors) });
        }
        return jsonResult({ record: unwrap(document), files: attachments });
      }),
  );

  server.registerTool(
    'siigo_prepare_document',
    {
      title: 'Prepare Document',
      description:
        'Prepare an invoice, quotation, purchase or customer cash receipt without writing. Discover the create operation for preparation.inputSchema. Resolve exact party/product references and selected catalogs; return unresolved choices or a creation object for siigo_create_document. Prices, amounts and debt references must be supplied. Does not check accounting accounts, debt balances or totals.',
      inputSchema: prepareDocumentSchema,
      outputSchema: prepareDocumentOutputSchema,
      annotations: readAnnotations,
    },
    async ({ type, input }, ctx) =>
      handle('siigo_prepare_document', async () => {
        const { prepareDocument } = await import('./tasks/prepare-document.js');
        return jsonResult(await prepareDocument(client, type, input, ctx.mcpReq.signal));
      }),
  );

  server.registerTool(
    'siigo_create_document',
    {
      title: 'Create Document',
      description:
        'Create one accounting document in Siigo. Preferred document creation route: pass preparation.creation or use discovery creation.payloadSchema for a complete payload. Exact endpoint validation applies. Only invoices, credit notes, journals and vouchers support idempotency_key. Use siigo_execute_write for updates, sending and other advanced writes.',
      inputSchema: createDocumentSchema,
      outputSchema: flexibleOutput,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ type, payload, idempotency_key }, ctx) =>
      handle('siigo_create_document', () => {
        const route = documentTasks[type];
        return operations.execute(
          route.domain,
          route.operation,
          'write',
          {
            [route.field]: payload,
            ...(idempotency_key === undefined ? {} : { idempotency_key }),
          },
          ctx,
        );
      }),
  );

  server.registerTool(
    'siigo_discover_operations',
    {
      title: 'Discover Operations',
      description:
        'Find advanced operations, catalogs and reports. Without a domain, list matching domains; with a domain, return exact input/output schemas and executors. Document create operations also include creation payload schemas and supported preparation schemas. Prefer siigo_prepare_document/siigo_create_document for documents. Does not call Siigo or change tools/list.',
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
        description: `Execute a discovered ${kind} operation. Discover its exact schema first. Prefer siigo_search/siigo_get_record for common reads and siigo_create_document for document creation. Operations in other categories are rejected before any API call.`,
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
