import { z } from 'zod';
import { paginationQuerySchema, positiveIntegerSchema } from './common.js';

// Advertise shared filter structure once. The selected operation still enforces
// its exact supported keys, date formats, lengths, enums and other constraints.
const textFilter = z.string().min(1).optional();
const branchFilter = z.number().int().min(0).max(999).optional();
const dateFilter = textFilter.describe(
  'List mode only. RFC3339 timestamp; yyyy-MM-dd also accepted except for purchases/journals. Discover the list operation for exact formats.',
);
export const searchFiltersSchema = z
  .object({
    ...paginationQuerySchema.shape,
    identification: textFilter.describe('Customers/customer_matches: identification number.'),
    branch_office: branchFilter.describe('Customers list only: selected branch.'),
    customer_identification: textFilter.describe('Invoices/quotations: customer identification.'),
    customer_branch_office: branchFilter.describe('Invoices/quotations: customer branch.'),
    name: textFilter.describe(
      'Document name except payment_receipts, or partial customer/product name in *_matches. Not supported for customer/product list mode.',
    ),
    code: textFilter.describe('Products: exact code in list mode, partial code in product_matches.'),
    reference: textFilter.describe('product_matches only: partial product reference.'),
    type: textFilter.describe('Customer list/matches: Customer, Supplier or Other. Product list: Product, Service, ConsumerGood or Combo.'),
    person_type: textFilter.describe('Customers list only: Person or Company.'),
    active: z.boolean().optional().describe('Customers/products list only: active status.'),
    account_group: textFilter.describe('Products list only: inventory classification ID as a string.'),
    stock_control: z.boolean().optional().describe('Products list only: inventory stock control.'),
    ids: textFilter.describe('Products list only: up to 20 comma-separated UUIDs.'),
    document_id: positiveIntegerSchema.optional().describe('Invoices/journals: document type ID.'),
    created_start: dateFilter,
    created_end: dateFilter,
    date_start: dateFilter.describe('Document date lower bound; unsupported for quotations/payment_receipts and partial searches.'),
    date_end: dateFilter.describe('Document date upper bound; unsupported for quotations/payment_receipts and partial searches.'),
    updated_start: dateFilter.describe('Updated-at lower bound; unsupported for quotations and partial searches.'),
    updated_end: dateFilter.describe('Updated-at upper bound; unsupported for quotations and partial searches.'),
  })
  .strict();

export const searchSchema = z
  .object({
    query: z
      .object({
        entity: z.enum([
          'customers',
          'products',
          'invoices',
          'quotations',
          'purchases',
          'vouchers',
          'credit_notes',
          'journals',
          'payment_receipts',
          'customer_matches',
          'product_matches',
        ]),
        mode: z
          .enum(['list', 'partial'])
          .describe('Use partial only for customer_matches/product_matches; use list for all other entities.'),
        filters: searchFiltersSchema.describe(
          'Supply only filters supported by the chosen entity/mode. Exact endpoint validation is applied before any read.',
        ),
      })
      .strict()
      .refine(({ entity, mode }) => entity.endsWith('_matches') === (mode === 'partial'), {
        path: ['mode'],
        message: 'Use partial for customer_matches/product_matches and list for all other entities.',
      }),
  })
  .strict();
