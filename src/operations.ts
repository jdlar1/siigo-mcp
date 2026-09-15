import type { CallToolResult, ServerContext } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { documentTasks, preparationKindSchema } from './document-tasks.js';
import type { SiigoClient } from './siigo-client.js';
import type { OperationConfig, ToolContext, ToolRegistrar } from './tool-context.js';

// Only domain metadata is eager. Operation names, schemas, and annotations stay
// in their original definitions and are read when the domain is requested.
const domains = {
  products: {
    description: 'Products, services, inventory; productos, servicios',
    load: () => import('./tools/products.js').then((m) => m.registerProductTools),
  },
  customers: {
    description: 'Customers and third parties; clientes, terceros',
    load: () => import('./tools/customers.js').then((m) => m.registerCustomerTools),
  },
  invoices: {
    description: 'Sales invoices, batches, email, PDF, XML; facturas de venta',
    load: () => import('./tools/invoices.js').then((m) => m.registerInvoiceTools),
  },
  quotations: {
    description: 'Quotations; cotizaciones',
    load: () => import('./tools/quotations.js').then((m) => m.registerQuotationTools),
  },
  credit_notes: {
    description: 'Credit notes; notas credito',
    load: () => import('./tools/credit-notes.js').then((m) => m.registerCreditNoteTools),
  },
  vouchers: {
    description: 'Cash receipts; recibos de caja',
    load: () => import('./tools/vouchers.js').then((m) => m.registerVoucherTools),
  },
  purchases: {
    description: 'Purchases and suppliers; compras, proveedores',
    load: () => import('./tools/purchases.js').then((m) => m.registerPurchaseTools),
  },
  purchase_support_documents: {
    description: 'Purchase support documents; documentos soporte',
    load: () => import('./tools/purchase-support-documents.js').then((m) => m.registerPurchaseSupportDocumentTools),
  },
  payment_receipts: {
    description: 'Payment receipts; comprobantes de pago',
    load: () => import('./tools/payment-receipts.js').then((m) => m.registerPaymentReceiptTools),
  },
  journals: {
    description: 'Accounting journals; comprobantes contables',
    load: () => import('./tools/journals.js').then((m) => m.registerJournalTools),
  },
  webhooks: {
    description: 'Webhook subscriptions; suscripciones, eventos',
    load: () => import('./tools/webhooks.js').then((m) => m.registerWebhookTools),
  },
  catalogs: {
    description: 'Taxes, payment types, sellers, warehouses; impuestos, medios de pago, vendedores, bodegas',
    load: () => import('./tools/catalogs.js').then((m) => m.registerCatalogTools),
  },
  reports: {
    description: 'Trial balances, accounts payable; balances, cuentas por pagar',
    load: () => import('./tools/reports.js').then((m) => m.registerReportTools),
  },
  account_groups: {
    description: 'Account groups: inventory classifications; grupos de inventario. Not the chart of accounts (PUC).',
    load: () => import('./tools/account-groups.js').then((m) => m.registerAccountGroupTools),
  },
} satisfies Record<string, { description: string; load: () => Promise<(context: ToolContext) => void> }>;

export const operationDomainSchema = z.enum(Object.keys(domains) as [keyof typeof domains, ...(keyof typeof domains)[]]);
export type OperationDomain = keyof typeof domains;
export type OperationKind = 'read' | 'write' | 'destructive';

interface Operation extends OperationConfig {
  name: string;
  execute: (args: unknown, context: ServerContext) => Promise<CallToolResult>;
}

function kindOf(operation: Operation): OperationKind {
  if (operation.annotations.readOnlyHint === true) return 'read';
  return operation.annotations.destructiveHint === false ? 'write' : 'destructive';
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** A registry belongs to one Siigo client, never to a global credential cache. */
export class OperationRegistry {
  private readonly loaded = new Map<OperationDomain, Promise<Map<string, Operation>>>();

  constructor(private readonly client: SiigoClient) {}

  isFor(client: SiigoClient): boolean {
    return this.client === client;
  }

  private load(domain: OperationDomain): Promise<Map<string, Operation>> {
    const existing = this.loaded.get(domain);
    if (existing) return existing;
    const pending = (async () => {
      const operations = new Map<string, Operation>();
      const server: ToolRegistrar = {
        registerTool(name, config, handler) {
          if (operations.has(name)) throw new Error(`Duplicate operation: ${name}`);
          operations.set(name, {
            ...config,
            name,
            async execute(args, context) {
              context.mcpReq.signal.throwIfAborted();
              const parsed = await config.inputSchema.parseAsync(args);
              context.mcpReq.signal.throwIfAborted();
              const result = await handler(parsed, context);
              if (!result.isError) await config.outputSchema.parseAsync(result.structuredContent);
              return result;
            },
          });
        },
      };
      const register = await domains[domain].load();
      register({ server, client: this.client });
      return operations;
    })();
    this.loaded.set(domain, pending);
    void pending.catch(() => this.loaded.delete(domain));
    return pending;
  }

  async discover({ domain, query, limit = 5 }: { domain?: OperationDomain; query?: string; limit?: number }) {
    const words = normalize(query ?? '')
      .split(/\s+/)
      .filter(Boolean);
    if (!domain) {
      return {
        domains: Object.entries(domains)
          .filter(([name, value]) => words.every((word) => normalize(`${name} ${value.description}`).includes(word)))
          .map(([name, value]) => ({ domain: name, description: value.description })),
        next: 'Choose a domain to retrieve operation schemas.',
      };
    }
    const operations = [...(await this.load(domain)).values()]
      .filter((op) => words.every((word) => normalize(`${op.name} ${op.title} ${op.description}`).includes(word)))
      .sort((a, b) => a.name.localeCompare(b.name));
    return {
      domain,
      total: operations.length,
      operations: await Promise.all(
        operations.slice(0, limit).map(async (op) => {
          const task = Object.entries(documentTasks).find(([, route]) => route.domain === domain && route.operation === op.name);
          let workflow = {};
          if (task) {
            const [type, route] = task;
            if (!(op.inputSchema instanceof z.ZodObject))
              throw new Error(`Document operation '${op.name}' must have an object input schema.`);
            const payloadSchema = op.inputSchema.shape[route.field];
            if (!payloadSchema) throw new Error(`Missing document field '${route.field}' for '${op.name}'.`);
            workflow = {
              creation: {
                tool: 'siigo_create_document',
                type,
                payloadSchema: z.toJSONSchema(payloadSchema, { io: 'input' }),
                supports_idempotency_key: 'idempotency_key' in op.inputSchema.shape,
              },
              ...(route.prepare
                ? {
                    preparation: {
                      tool: 'siigo_prepare_document',
                      type,
                      inputSchema: z.toJSONSchema(
                        (await import('./schemas/prepare-document.js')).preparationSchemas[preparationKindSchema.parse(type)],
                        { io: 'input' },
                      ),
                    },
                  }
                : {}),
            };
          }
          return {
            operation: op.name,
            description: op.description,
            executor: `siigo_execute_${kindOf(op)}`,
            annotations: op.annotations,
            inputSchema: z.toJSONSchema(op.inputSchema, { io: 'input' }),
            outputSchema: z.toJSONSchema(op.outputSchema),
            ...workflow,
          };
        }),
      ),
    };
  }

  async execute(domain: OperationDomain, name: string, kind: OperationKind, args: unknown, context: ServerContext) {
    const operation = (await this.load(domain)).get(name);
    if (!operation) throw new Error(`Unknown operation '${name}' in domain '${domain}'. Use siigo_discover_operations.`);
    if (kindOf(operation) !== kind) throw new Error(`Operation '${name}' requires siigo_execute_${kindOf(operation)}.`);
    return operation.execute(args, context);
  }
}
