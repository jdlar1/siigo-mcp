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
const voucherDateFilterSchema = z.union([dateSchema, dateTimeSchema]);

export const voucherDueSchema = z
  .object({
    prefix: z.string().min(1),
    consecutive: positiveIntegerSchema,
    quote: positiveIntegerSchema,
    date: dateSchema.optional(),
  })
  .strict();

export const voucherTaxSchema = z
  .object({
    id: positiveIntegerSchema,
    name: z.string().optional(),
    type: z.string().optional(),
    percentage: z.number().nonnegative().optional(),
    base: positiveAmountSchema.optional(),
    value: positiveAmountSchema.optional(),
  })
  .strict();

export const voucherDiscountSchema = z
  .object({
    id: positiveIntegerSchema,
    name: z.string().optional(),
    type: z.string().optional(),
    percentage: z.number().nonnegative().optional(),
    value: positiveAmountSchema,
  })
  .strict();

export const voucherPaymentSchema = z
  .object({
    id: positiveIntegerSchema,
    value: positiveAmountSchema,
    due_date: dateSchema.optional(),
  })
  .strict();

const voucherBaseShape = {
  document: documentRefSchema,
  number: documentNumberSchema.optional(),
  date: dateSchema,
  customer: customerRefSchema,
  cost_center: positiveIntegerSchema.optional(),
  currency: currencySchema.optional(),
  observations: observationsSchema.optional(),
};

export const debtPaymentVoucherItemSchema = z
  .object({
    due: voucherDueSchema,
    taxes: z.array(voucherTaxSchema).min(1).optional(),
    discounts: z.array(voucherDiscountSchema).min(1).optional(),
    value: positiveAmountSchema,
  })
  .strict();

export const debtPaymentVoucherSchema = z
  .object({
    ...voucherBaseShape,
    type: z.literal('DebtPayment'),
    items: z.array(debtPaymentVoucherItemSchema).min(1),
    payment: voucherPaymentSchema,
  })
  .strict();

export const advancePaymentVoucherSchema = z
  .object({
    ...voucherBaseShape,
    type: z.literal('AdvancePayment'),
    payment: voucherPaymentSchema,
  })
  .strict();

export const miscIncomeVoucherSchema = z
  .object({
    ...voucherBaseShape,
    type: z.literal('MiscIncome'),
    income: z
      .object({
        id: positiveIntegerSchema,
      })
      .strict(),
    payment: voucherPaymentSchema,
  })
  .strict();

export const voucherSchema = z.discriminatedUnion('type', [debtPaymentVoucherSchema, advancePaymentVoucherSchema, miscIncomeVoucherSchema]);

export const voucherListQuerySchema = z
  .object({
    name: z.string().min(1).optional().describe('Voucher name, such as RC-1-45'),
    created_start: voucherDateFilterSchema.optional().describe('Created-at lower bound (yyyy-MM-dd or UTC RFC3339)'),
    created_end: voucherDateFilterSchema.optional().describe('Created-at upper bound (yyyy-MM-dd or UTC RFC3339)'),
    date_start: voucherDateFilterSchema.optional().describe('Voucher-date lower bound (yyyy-MM-dd or UTC RFC3339)'),
    date_end: voucherDateFilterSchema.optional().describe('Voucher-date upper bound (yyyy-MM-dd or UTC RFC3339)'),
    updated_start: voucherDateFilterSchema.optional().describe('Last-updated lower bound (yyyy-MM-dd or UTC RFC3339)'),
    updated_end: voucherDateFilterSchema.optional().describe('Last-updated upper bound (yyyy-MM-dd or UTC RFC3339)'),
    page: paginationQuerySchema.shape.page,
    page_size: paginationQuerySchema.shape.page_size,
  })
  .strict();

export const voucherIdInputSchema = z
  .object({
    id: uuidSchema.describe('Voucher UUID'),
  })
  .strict();

export const voucherCreateToolSchema = z
  .object({
    voucher: voucherSchema.describe('Cash receipt request. MiscIncome is sent through its dedicated endpoint variant.'),
    idempotency_key: idempotencyKeySchema.optional().describe('Optional idempotency key for safe retries'),
  })
  .strict();

const outputTaxSchema = z
  .object({
    id: positiveIntegerSchema,
    name: z.string().optional(),
    type: z.string().optional(),
    percentage: z.number().optional(),
    base: z.number().optional(),
    base_value: z.number().optional(),
    value: z.number().optional(),
  })
  .strict();

const outputDiscountSchema = z
  .object({
    id: positiveIntegerSchema,
    name: z.string().optional(),
    type: z.string().optional(),
    percentage: z.number().optional(),
    value: z.number(),
  })
  .strict();

const outputItemSchema = z
  .object({
    due: voucherDueSchema.optional(),
    tax: outputTaxSchema.optional(),
    taxes: z.array(outputTaxSchema).optional(),
    discounts: z.array(outputDiscountSchema).optional(),
    description: z.string().optional(),
    value: z.number().optional(),
  })
  .strict();

export const voucherResponseSchema = z
  .object({
    id: z.string().optional(),
    document: documentRefSchema,
    number: documentNumberSchema.optional(),
    name: z.string().optional(),
    date: dateSchema,
    type: z.enum(['DebtPayment', 'AdvancePayment', 'MiscIncome']),
    customer: customerRefSchema.extend({ id: z.string().optional() }).strict(),
    income: z
      .object({
        id: positiveIntegerSchema,
        name: z.string().optional(),
      })
      .strict()
      .optional(),
    cost_center: positiveIntegerSchema.optional(),
    currency: currencySchema.optional(),
    items: z.array(outputItemSchema).optional(),
    payment: voucherPaymentSchema.extend({ name: z.string().optional() }).strict().optional(),
    observations: observationsSchema.optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    metadata: metadataSchema.optional(),
  })
  .strict();

export const voucherListResponseSchema = z
  .object({
    pagination: z
      .object({
        page: positiveIntegerSchema,
        page_size: positiveIntegerSchema,
        total_results: z.number().int().nonnegative(),
      })
      .strict(),
    results: z.array(voucherResponseSchema),
    _links: linksSchema.optional(),
    __links: linksSchema.optional(),
  })
  .strict();

export const voucherEntityToolOutputSchema = toolOutputSchema(voucherResponseSchema);
export const voucherListToolOutputSchema = toolOutputSchema(voucherListResponseSchema);

export type Voucher = z.infer<typeof voucherSchema>;
export type DebtPaymentVoucher = z.infer<typeof debtPaymentVoucherSchema>;
export type AdvancePaymentVoucher = z.infer<typeof advancePaymentVoucherSchema>;
export type MiscIncomeVoucher = z.infer<typeof miscIncomeVoucherSchema>;
export type VoucherListQuery = z.infer<typeof voucherListQuerySchema>;
