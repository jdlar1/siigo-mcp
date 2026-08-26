import { z } from 'zod';
import {
  currencySchema,
  customerRefSchema,
  dateSchema,
  dateTimeSchema,
  documentRefSchema,
  idempotencyKeySchema,
  linksSchema,
  metadataSchema,
  paginationQuerySchema,
  positiveAmountSchema,
  positiveIntegerSchema,
  toolOutputSchema,
  uuidSchema,
} from './common.js';

const documentNumberSchema = z.number().int().nonnegative();
const observationsSchema = z.string().max(4000);

export const journalAccountSchema = z
  .object({
    code: z.string().min(1),
    movement: z.enum(['Debit', 'Credit']),
  })
  .strict();

export const journalDueSchema = z
  .object({
    prefix: z.string().min(1),
    consecutive: positiveIntegerSchema,
    quote: positiveIntegerSchema,
    date: dateSchema.optional(),
  })
  .strict();

export const journalTaxSchema = z
  .object({
    id: positiveIntegerSchema,
    name: z.string().optional(),
    type: z.string().optional(),
    percentage: z.number().nonnegative().optional(),
    base_value: positiveAmountSchema.optional(),
    value: positiveAmountSchema.optional(),
  })
  .strict();

export const journalFixedAssetSchema = z
  .object({
    id: positiveIntegerSchema,
  })
  .strict();

export const journalProductSchema = z
  .object({
    code: z.string().min(1),
    warehouse: positiveIntegerSchema.optional(),
    quantity: positiveAmountSchema,
  })
  .strict();

export const journalItemSchema = z
  .object({
    account: journalAccountSchema,
    customer: customerRefSchema.optional(),
    due: journalDueSchema.optional(),
    tax: journalTaxSchema.optional(),
    fixed_asset: journalFixedAssetSchema.optional(),
    product: journalProductSchema.optional(),
    cost_center: positiveIntegerSchema.optional(),
    description: z.string().max(4000).optional(),
    value: positiveAmountSchema,
  })
  .strict();

export const journalSchema = z
  .object({
    document: documentRefSchema,
    number: documentNumberSchema.optional(),
    date: dateSchema,
    currency: currencySchema.optional(),
    items: z.array(journalItemSchema).min(1),
    observations: observationsSchema.optional(),
  })
  .strict();

export const journalListQuerySchema = z
  .object({
    document_id: positiveIntegerSchema.optional().describe('Document type ID filter'),
    name: z.string().min(1).optional().describe('Journal name, such as CC-1-85'),
    created_start: dateTimeSchema.optional().describe('Created-at lower bound (RFC3339)'),
    created_end: dateTimeSchema.optional().describe('Created-at upper bound (RFC3339)'),
    date_start: dateTimeSchema.optional().describe('Journal-date lower bound (RFC3339)'),
    date_end: dateTimeSchema.optional().describe('Journal-date upper bound (RFC3339)'),
    updated_start: dateTimeSchema.optional().describe('Last-updated lower bound (RFC3339)'),
    updated_end: dateTimeSchema.optional().describe('Last-updated upper bound (RFC3339)'),
    page: paginationQuerySchema.shape.page,
    page_size: paginationQuerySchema.shape.page_size,
  })
  .strict();

export const journalIdInputSchema = z
  .object({
    id: uuidSchema.describe('Journal UUID'),
  })
  .strict();

export const journalCreateToolSchema = z
  .object({
    journal: journalSchema.describe('Accounting journal request'),
    idempotency_key: idempotencyKeySchema.optional().describe('Optional idempotency key for safe retries'),
  })
  .strict();

const outputTaxSchema = z
  .object({
    id: positiveIntegerSchema,
    name: z.string().optional(),
    type: z.string().optional(),
    percentage: z.number().optional(),
    value: z.number().optional(),
    base_value: z.number().optional(),
  })
  .strict();

const outputItemSchema = z
  .object({
    account: journalAccountSchema,
    customer: customerRefSchema.extend({ id: z.string().optional() }).strict().optional(),
    due: journalDueSchema.optional(),
    tax: outputTaxSchema.optional(),
    fixed_asset: z
      .object({
        id: positiveIntegerSchema,
        name: z.string().optional(),
      })
      .strict()
      .optional(),
    product: z
      .object({
        id: z.string().optional(),
        code: z.string().optional(),
        name: z.string().optional(),
        warehouse: z
          .object({
            id: positiveIntegerSchema,
            name: z.string().optional(),
          })
          .strict()
          .optional(),
        quantity: z.number().optional(),
      })
      .strict()
      .optional(),
    cost_center: positiveIntegerSchema.optional(),
    description: z.string().optional(),
    value: z.number().optional(),
  })
  .strict();

export const journalResponseSchema = z
  .object({
    id: z.string().optional(),
    document: documentRefSchema,
    number: documentNumberSchema.optional(),
    name: z.string().optional(),
    date: dateSchema,
    currency: currencySchema.optional(),
    items: z.array(outputItemSchema),
    observations: observationsSchema.optional(),
    total: z.number().optional(),
    metadata: metadataSchema.optional(),
  })
  .strict();

export const journalListResponseSchema = z
  .object({
    pagination: z
      .object({
        page: positiveIntegerSchema,
        page_size: positiveIntegerSchema,
        total_results: z.number().int().nonnegative(),
      })
      .strict(),
    results: z.array(journalResponseSchema),
    _links: linksSchema.optional(),
    __links: linksSchema.optional(),
  })
  .strict();

export const journalEntityToolOutputSchema = toolOutputSchema(journalResponseSchema);
export const journalListToolOutputSchema = toolOutputSchema(journalListResponseSchema);

export type Journal = z.infer<typeof journalSchema>;
export type JournalListQuery = z.infer<typeof journalListQuerySchema>;
