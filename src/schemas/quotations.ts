import { z } from 'zod';
import {
  currencySchema,
  dateSchema,
  dateTimeSchema,
  deleteResponseSchema,
  documentRefSchema,
  hasAtMostDecimalPlaces,
  listResponseSchema,
  metadataSchema,
  paginationQuerySchema,
  positiveIntegerSchema,
  taxRefSchema,
  toolOutputSchema,
} from './common.js';
import { customerOrInlineSchema } from './customers.js';
import { invoiceResponseCustomerSchema, invoiceResponseDiscountSchema, invoiceResponseTaxSchema } from './invoices.js';

const quotationDateFilterSchema = z.union([z.iso.date(), dateTimeSchema]);
const quotationDecimalSchema = (maximumDecimals: number, minimum = 0, maximum = Number.MAX_VALUE) =>
  z
    .number()
    .finite()
    .min(minimum)
    .max(maximum)
    .refine((value) => hasAtMostDecimalPlaces(value, maximumDecimals), `Value must have at most ${maximumDecimals} decimal places`);

export const quotationListQuerySchema = paginationQuerySchema
  .extend({
    created_start: quotationDateFilterSchema.optional(),
    created_end: quotationDateFilterSchema.optional(),
    name: z.string().min(1).max(100).optional(),
    customer_identification: z.string().min(1).max(50).optional(),
    customer_branch_office: z.number().int().min(0).max(999).optional(),
  })
  .strict();

export const quotationItemSchema = z
  .object({
    code: z.string().min(1).max(30),
    description: z.string().max(2500).optional(),
    quantity: quotationDecimalSchema(2, Number.MIN_VALUE, 9_999_999.99),
    price: quotationDecimalSchema(6, 0, 99_999_999_999.99),
    discount: quotationDecimalSchema(2).optional(),
    taxes: z.array(taxRefSchema).max(3).optional(),
  })
  .strict();

export const quotationInputSchema = z
  .object({
    document: documentRefSchema,
    number: positiveIntegerSchema.optional(),
    date: dateSchema,
    customer: customerOrInlineSchema,
    cost_center: positiveIntegerSchema.optional(),
    currency: currencySchema.optional(),
    seller: positiveIntegerSchema,
    observations: z.string().max(4000).optional(),
    items: z.array(quotationItemSchema).min(1).max(500),
  })
  .strict();

export const quotationIdSchema = z.uuid().describe('Quotation UUID');

export const quotationIdInputSchema = z
  .object({
    id: quotationIdSchema,
  })
  .strict();

export const quotationCreateInputSchema = z
  .object({
    quotation: quotationInputSchema,
  })
  .strict();

export const quotationUpdateInputSchema = z
  .object({
    id: quotationIdSchema,
    quotation: quotationInputSchema,
  })
  .strict();

export const quotationResponseItemSchema = z
  .object({
    id: z.string().optional(),
    code: z.string().optional(),
    description: z.string().optional(),
    quantity: z.number().optional(),
    price: z.number().optional(),
    taxed_price: z.number().optional(),
    discount: z.union([z.number(), invoiceResponseDiscountSchema]).optional(),
    taxes: z.array(invoiceResponseTaxSchema).optional(),
    total: z.number().optional(),
  })
  .passthrough();

export const quotationResponseSchema = z
  .object({
    id: z.string().optional(),
    document: z.object({ id: positiveIntegerSchema }).passthrough().optional(),
    number: positiveIntegerSchema.optional(),
    name: z.string().optional(),
    date: dateSchema.optional(),
    customer: invoiceResponseCustomerSchema.optional(),
    seller: positiveIntegerSchema.optional(),
    items: z.array(quotationResponseItemSchema).optional(),
    total: z.number().optional(),
    public_url: z.string().optional(),
    metadata: metadataSchema.optional(),
  })
  .passthrough();

export const quotationEntityToolOutputSchema = toolOutputSchema(quotationResponseSchema);
export const quotationListToolOutputSchema = toolOutputSchema(listResponseSchema(quotationResponseSchema));
export const quotationDeleteToolOutputSchema = toolOutputSchema(deleteResponseSchema);
