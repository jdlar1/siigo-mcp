import { z } from 'zod';
import {
  currencySchema,
  dateSchema,
  deleteResponseSchema,
  documentRefSchema,
  metadataSchema,
  positiveIntegerSchema,
  stampSchema,
  supplierRefSchema,
  taxRefSchema,
  toolOutputSchema,
  uuidSchema,
} from './common.js';
import { discountTypeSchema, purchaseItemSchema, purchasePaymentSchema } from './purchases.js';

const documentNumberSchema = z.number().int().nonnegative();
const observationsSchema = z.string().max(4000);

export const supplierReceiptNumberSchema = z
  .object({
    prefix: z.string().regex(/^[A-Za-z0-9]{1,6}$/, 'Prefix must be 1-6 alphanumeric characters'),
    number: z.string().regex(/^\d{1,11}$/, 'Number must contain 1-11 digits'),
  })
  .strict();

export const supportDocumentSchema = z
  .object({
    document: documentRefSchema,
    number: documentNumberSchema.optional(),
    date: dateSchema,
    supplier: supplierRefSchema,
    supplier_receipt_number: supplierReceiptNumberSchema,
    cost_center: positiveIntegerSchema.optional(),
    currency: currencySchema.optional(),
    observations: observationsSchema.optional(),
    discount_type: discountTypeSchema.optional(),
    stamp: stampSchema.optional(),
    retentions: z.array(taxRefSchema).min(1).optional(),
    items: z.array(purchaseItemSchema).min(1),
    payments: z.array(purchasePaymentSchema).min(1),
  })
  .strict();

export const supportDocumentUpdateSchema = supportDocumentSchema;

export const supportDocumentIdInputSchema = z
  .object({
    id: uuidSchema.describe('Purchase support document UUID'),
  })
  .strict();

export const supportDocumentCreateToolSchema = z
  .object({
    purchase_support_document: supportDocumentSchema.describe('Purchase support document request'),
  })
  .strict();

export const supportDocumentUpdateToolSchema = z
  .object({
    id: uuidSchema.describe('Purchase support document UUID'),
    purchase_support_document: supportDocumentUpdateSchema.describe('Complete replacement support document payload'),
  })
  .strict();

const outputItemSchema = z
  .object({
    id: z.string().optional(),
    type: z.string().optional(),
    code: z.string().optional(),
    description: z.string().optional(),
    quantity: z.number().optional(),
    price: z.number().optional(),
    discount: z
      .union([
        z.number(),
        z
          .object({
            id: positiveIntegerSchema.optional(),
            name: z.string().optional(),
            value: z.number().optional(),
            percentage: z.number().optional(),
          })
          .strict(),
      ])
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
            total: z.number().optional(),
          })
          .strict(),
      )
      .optional(),
    total: z.number().optional(),
  })
  .strict();

export const supportDocumentResponseSchema = z
  .object({
    id: z.string().optional(),
    document: documentRefSchema,
    number: documentNumberSchema.optional(),
    name: z.string().optional(),
    date: dateSchema,
    supplier: supplierRefSchema.extend({ id: z.string().optional() }).strict(),
    supplier_receipt_number: supplierReceiptNumberSchema.optional(),
    cost_center: positiveIntegerSchema.optional(),
    currency: currencySchema.optional(),
    observations: observationsSchema.optional(),
    discount_type: discountTypeSchema.optional(),
    stamp: stampSchema.optional(),
    retentions: z.array(taxRefSchema).optional(),
    items: z.array(outputItemSchema).optional(),
    payments: z.array(purchasePaymentSchema.partial().passthrough()).optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    metadata: metadataSchema.optional(),
  })
  .strict();

export const supportDocumentEntityToolOutputSchema = toolOutputSchema(supportDocumentResponseSchema);
export const supportDocumentDeleteToolOutputSchema = toolOutputSchema(deleteResponseSchema);

export type SupportDocument = z.infer<typeof supportDocumentSchema>;
export type SupportDocumentUpdate = z.infer<typeof supportDocumentUpdateSchema>;
