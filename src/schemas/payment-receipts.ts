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
  toolOutputSchema,
  uuidSchema,
} from './common.js';
import { voucherDiscountSchema, voucherDueSchema, voucherPaymentSchema } from './vouchers.js';

const documentNumberSchema = z.number().int().nonnegative();
const observationsSchema = z.string().max(4000);
const paymentReceiptDateFilterSchema = z.union([dateSchema, dateTimeSchema]);

export const paymentReceiptAccountSchema = z
  .object({
    code: z.string().min(1),
    movement: z.enum(['Debit', 'Credit']),
  })
  .strict();

export const paymentReceiptTaxSchema = z
  .object({
    id: positiveIntegerSchema,
    base: positiveAmountSchema.optional(),
    base_value: positiveAmountSchema.optional(),
  })
  .strict();

export const paymentReceiptDueSchema = z
  .object({
    prefix: z.string().min(1),
    consecutive: positiveIntegerSchema,
    quote: positiveIntegerSchema,
    date: dateSchema,
  })
  .strict();

export const paymentReceiptDebtItemSchema = z
  .object({
    due: paymentReceiptDueSchema,
    taxes: z.array(paymentReceiptTaxSchema).min(1).optional(),
    discounts: z.array(voucherDiscountSchema).min(1).optional(),
    value: positiveAmountSchema,
  })
  .strict();

export const paymentReceiptDetailedItemSchema = z
  .object({
    account: paymentReceiptAccountSchema,
    due: voucherDueSchema.optional(),
    tax: paymentReceiptTaxSchema.optional(),
    fixed_asset: z
      .object({
        id: positiveIntegerSchema,
      })
      .strict()
      .optional(),
    product: z
      .object({
        code: z.string().min(1),
        warehouse: positiveIntegerSchema.optional(),
        quantity: positiveAmountSchema.optional(),
      })
      .strict()
      .optional(),
    customer: supplierRefSchema.optional(),
    cost_center: positiveIntegerSchema.optional(),
    description: z.string().max(4000).optional(),
    value: positiveAmountSchema,
  })
  .strict();

const paymentReceiptBaseShape = {
  document: documentRefSchema,
  number: documentNumberSchema.optional(),
  date: dateSchema,
  supplier: supplierRefSchema,
  cost_center: positiveIntegerSchema.optional(),
  currency: currencySchema.optional(),
  observations: observationsSchema.optional(),
};

export const debtPaymentReceiptSchema = z
  .object({
    ...paymentReceiptBaseShape,
    type: z.literal('DebtPayment'),
    items: z.array(paymentReceiptDebtItemSchema).min(1),
    payment: voucherPaymentSchema.optional(),
    payments: z.array(voucherPaymentSchema).min(1).optional(),
  })
  .strict()
  .superRefine((receipt, context) => {
    if (!receipt.payment && !receipt.payments) {
      context.addIssue({ code: 'custom', path: ['payment'], message: 'DebtPayment requires payment or payments' });
    }
    if (receipt.payment && receipt.payments) {
      context.addIssue({ code: 'custom', path: ['payments'], message: 'Use payment or payments, not both' });
    }
  });

export const advancePaymentReceiptSchema = z
  .object({
    ...paymentReceiptBaseShape,
    type: z.literal('AdvancePayment'),
    payment: voucherPaymentSchema,
  })
  .strict();

export const detailedPaymentReceiptSchema = z
  .object({
    ...paymentReceiptBaseShape,
    type: z.literal('Detailed'),
    items: z.array(paymentReceiptDetailedItemSchema).min(1),
  })
  .strict();

export const paymentReceiptSchema = z.discriminatedUnion('type', [
  debtPaymentReceiptSchema,
  advancePaymentReceiptSchema,
  detailedPaymentReceiptSchema,
]);

export const paymentReceiptUpdateSchema = z
  .object({
    document: documentRefSchema.optional(),
    number: documentNumberSchema.optional(),
    date: dateSchema.optional(),
    type: z.enum(['DebtPayment', 'AdvancePayment', 'Detailed']).optional(),
    supplier: supplierRefSchema.optional(),
    cost_center: positiveIntegerSchema.optional(),
    currency: currencySchema.optional(),
    items: z
      .array(z.union([paymentReceiptDebtItemSchema, paymentReceiptDetailedItemSchema]))
      .min(1)
      .optional(),
    payment: voucherPaymentSchema.optional(),
    payments: z.array(voucherPaymentSchema).min(1).optional(),
    observations: observationsSchema.optional(),
  })
  .strict();

export const paymentReceiptListQuerySchema = z
  .object({
    created_start: paymentReceiptDateFilterSchema.optional().describe('Created-at lower bound (yyyy-MM-dd or UTC RFC3339)'),
    created_end: paymentReceiptDateFilterSchema.optional().describe('Created-at upper bound (yyyy-MM-dd or UTC RFC3339)'),
    updated_start: paymentReceiptDateFilterSchema.optional().describe('Last-updated lower bound (yyyy-MM-dd or UTC RFC3339)'),
    updated_end: paymentReceiptDateFilterSchema.optional().describe('Last-updated upper bound (yyyy-MM-dd or UTC RFC3339)'),
    page: paginationQuerySchema.shape.page,
    page_size: paginationQuerySchema.shape.page_size,
  })
  .strict();

export const paymentReceiptIdInputSchema = z
  .object({
    id: uuidSchema.describe('Payment receipt UUID'),
  })
  .strict();

export const paymentReceiptCreateToolSchema = z
  .object({
    paymentReceipt: paymentReceiptSchema.describe('Payment receipt request'),
  })
  .strict();

export const paymentReceiptUpdateToolSchema = z
  .object({
    id: uuidSchema.describe('Payment receipt UUID'),
    paymentReceipt: paymentReceiptUpdateSchema.describe('Editable payment receipt fields'),
  })
  .strict();

const outputPaymentReceiptItemSchema = z
  .object({
    account: paymentReceiptAccountSchema.optional(),
    due: paymentReceiptDueSchema.partial().strict().optional(),
    tax: z
      .object({
        id: positiveIntegerSchema,
        name: z.string().optional(),
        type: z.string().optional(),
        percentage: z.number().optional(),
        base: z.number().optional(),
        base_value: z.number().optional(),
        value: z.number().optional(),
      })
      .strict()
      .optional(),
    taxes: z
      .array(
        z
          .object({
            id: positiveIntegerSchema,
            name: z.string().optional(),
            type: z.string().optional(),
            percentage: z.number().optional(),
            base: z.number().optional(),
            base_value: z.number().optional(),
            value: z.number().optional(),
          })
          .strict(),
      )
      .optional(),
    discounts: z.array(voucherDiscountSchema).optional(),
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
    customer: supplierRefSchema.optional(),
    cost_center: positiveIntegerSchema.optional(),
    description: z.string().optional(),
    value: z.number().optional(),
  })
  .strict();

export const paymentReceiptResponseSchema = z
  .object({
    id: z.string().optional(),
    document: documentRefSchema,
    number: documentNumberSchema.optional(),
    name: z.string().optional(),
    date: dateSchema,
    type: z.enum(['DebtPayment', 'AdvancePayment', 'Detailed']),
    supplier: supplierRefSchema.extend({ id: z.string().optional() }).strict(),
    cost_center: positiveIntegerSchema.optional(),
    currency: currencySchema.optional(),
    items: z.array(outputPaymentReceiptItemSchema).optional(),
    payment: voucherPaymentSchema.extend({ name: z.string().optional() }).strict().optional(),
    payments: z.array(voucherPaymentSchema.extend({ name: z.string().optional() }).strict()).optional(),
    observations: observationsSchema.optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    metadata: metadataSchema.optional(),
  })
  .strict();

export const paymentReceiptListResponseSchema = z
  .object({
    pagination: z
      .object({
        page: positiveIntegerSchema,
        page_size: positiveIntegerSchema,
        total_results: z.number().int().nonnegative(),
      })
      .strict(),
    results: z.array(paymentReceiptResponseSchema),
    _links: linksSchema.optional(),
    __links: linksSchema.optional(),
  })
  .strict();

export const paymentReceiptEntityToolOutputSchema = toolOutputSchema(paymentReceiptResponseSchema);
export const paymentReceiptListToolOutputSchema = toolOutputSchema(paymentReceiptListResponseSchema);
export const paymentReceiptDeleteToolOutputSchema = toolOutputSchema(deleteResponseSchema);

export type PaymentReceipt = z.infer<typeof paymentReceiptSchema>;
export type PaymentReceiptUpdate = z.infer<typeof paymentReceiptUpdateSchema>;
export type PaymentReceiptListQuery = z.infer<typeof paymentReceiptListQuerySchema>;
