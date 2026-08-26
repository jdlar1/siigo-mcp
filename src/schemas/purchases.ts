import { z } from 'zod';
import {
  currencySchema,
  dateSchema,
  dateTimeSchema,
  deleteResponseSchema,
  documentRefSchema,
  linksSchema,
  metadataSchema,
  paginationQuerySchema,
  positiveAmountSchema,
  positiveIntegerSchema,
  supplierRefSchema,
  taxRefSchema,
  toolOutputSchema,
  uuidSchema,
} from './common.js';

const documentNumberSchema = z.number().int().nonnegative();
const observationsSchema = z.string().max(4000);

export const discountTypeSchema = z.enum(['Percentage', 'Value']);

export const providerInvoiceSchema = z
  .object({
    prefix: z.string().min(1).max(6),
    number: z.string().min(1).max(11),
  })
  .strict();

export const purchaseItemSchema = z
  .object({
    type: z.enum(['Product', 'FixedAsset', 'Account']),
    code: z.string().min(1),
    description: z.string().max(4000).optional(),
    quantity: positiveAmountSchema,
    price: positiveAmountSchema,
    discount: z.number().nonnegative().optional(),
    supplier: positiveIntegerSchema.optional(),
    warehouse: positiveIntegerSchema.optional(),
    taxes: z.array(taxRefSchema).min(1).optional(),
  })
  .strict();

const purchaseOutputTaxSchema = z
  .object({
    id: positiveIntegerSchema,
    name: z.string().optional(),
    type: z.string().optional(),
    percentage: z.number().optional(),
    base: z.number().optional(),
    base_value: z.number().optional(),
    value: z.number().optional(),
    total: z.number().optional(),
  })
  .strict();

const purchaseOutputDiscountSchema = z
  .object({
    percentage: z.number().optional(),
    value: z.number().optional(),
  })
  .passthrough();

const purchaseOutputWarehouseSchema = z
  .object({
    id: positiveIntegerSchema.optional(),
    name: z.string().optional(),
  })
  .strict();

export const purchaseResponseItemSchema = z
  .object({
    id: z.string().optional(),
    type: z.string().optional(),
    code: z.string().optional(),
    description: z.string().optional(),
    quantity: z.number().optional(),
    price: z.number().optional(),
    total: z.number().optional(),
    discount: z.union([z.number(), purchaseOutputDiscountSchema]).optional(),
    taxes: z.array(purchaseOutputTaxSchema).optional(),
    supplier: z.union([positiveIntegerSchema, supplierRefSchema]).optional(),
    warehouse: z.union([positiveIntegerSchema, purchaseOutputWarehouseSchema]).optional(),
  })
  .strict();

export const purchasePaymentSchema = z
  .object({
    id: positiveIntegerSchema,
    value: positiveAmountSchema,
    due_date: dateSchema.optional(),
    name: z.string().optional(),
  })
  .strict();

export const purchaseSchema = z
  .object({
    document: documentRefSchema,
    number: documentNumberSchema.optional(),
    date: dateSchema,
    supplier: supplierRefSchema,
    provider_invoice: providerInvoiceSchema,
    discount_type: discountTypeSchema.optional(),
    supplier_by_item: z.boolean().optional(),
    tax_included: z.boolean().optional(),
    cost_center: positiveIntegerSchema.optional(),
    currency: currencySchema.optional(),
    observations: observationsSchema.optional(),
    retentions: z.array(taxRefSchema).min(1).optional(),
    items: z.array(purchaseItemSchema).min(1),
    payments: z.array(purchasePaymentSchema).min(1),
  })
  .strict();

export const purchaseUpdateSchema = purchaseSchema;

export const purchaseListQuerySchema = z
  .object({
    name: z.string().min(1).optional().describe('Purchase document name, such as FC-1-73'),
    created_start: dateTimeSchema.optional().describe('Created-at lower bound (RFC3339)'),
    created_end: dateTimeSchema.optional().describe('Created-at upper bound (RFC3339)'),
    date_start: dateTimeSchema.optional().describe('Document-date lower bound (RFC3339)'),
    date_end: dateTimeSchema.optional().describe('Document-date upper bound (RFC3339)'),
    updated_start: dateTimeSchema.optional().describe('Last-updated lower bound (RFC3339)'),
    updated_end: dateTimeSchema.optional().describe('Last-updated upper bound (RFC3339)'),
    page: paginationQuerySchema.shape.page,
    page_size: paginationQuerySchema.shape.page_size,
  })
  .strict();

export const purchaseIdInputSchema = z
  .object({
    id: uuidSchema.describe('Purchase UUID'),
  })
  .strict();

export const purchaseCreateToolSchema = z
  .object({
    purchase: purchaseSchema.describe('Purchase invoice request'),
  })
  .strict();

export const purchaseUpdateToolSchema = z
  .object({
    id: uuidSchema.describe('Purchase UUID'),
    purchase: purchaseUpdateSchema.describe('Complete replacement purchase invoice payload'),
  })
  .strict();

export const purchaseMetadataSchema = metadataSchema.optional();

export const purchaseResponseSchema = z
  .object({
    id: z.string().optional(),
    document: documentRefSchema,
    number: documentNumberSchema.optional(),
    name: z.string().optional(),
    date: dateSchema,
    supplier: supplierRefSchema.extend({ id: z.string().optional() }).strict(),
    total: z.number().optional(),
    balance: z.number().optional(),
    provider_invoice: providerInvoiceSchema.optional(),
    cost_center: positiveIntegerSchema.optional(),
    currency: currencySchema.optional(),
    discount_type: discountTypeSchema.optional(),
    supplier_by_item: z.boolean().optional(),
    tax_included: z.boolean().optional(),
    items: z.array(purchaseResponseItemSchema).optional(),
    payments: z.array(purchasePaymentSchema).optional(),
    observations: observationsSchema.optional(),
    metadata: purchaseMetadataSchema,
  })
  .strict();

export const purchaseListResponseSchema = z
  .object({
    pagination: z
      .object({
        page: positiveIntegerSchema,
        page_size: positiveIntegerSchema,
        total_results: z.number().int().nonnegative(),
      })
      .strict(),
    results: z.array(purchaseResponseSchema),
    _links: linksSchema.optional(),
    __links: linksSchema.optional(),
  })
  .strict();

export const purchaseEntityToolOutputSchema = toolOutputSchema(purchaseResponseSchema);
export const purchaseListToolOutputSchema = toolOutputSchema(purchaseListResponseSchema);
export const purchaseDeleteToolOutputSchema = toolOutputSchema(deleteResponseSchema);

export type Purchase = z.infer<typeof purchaseSchema>;
export type PurchaseUpdate = z.infer<typeof purchaseUpdateSchema>;
export type PurchaseListQuery = z.infer<typeof purchaseListQuerySchema>;
export type PurchaseResponse = z.infer<typeof purchaseResponseSchema>;
