import { z } from 'zod';
import { dateSchema, positiveIntegerSchema } from './common.js';
import { invoiceInputSchema, invoiceItemSchema } from './invoices.js';

export const prepareInvoiceSchema = z
  .object({
    customer_identification: z.string().min(1).max(50).describe('Exact existing customer identification'),
    branch_office: z.number().int().min(0).max(999).optional().describe('Required when the identification has multiple active branches'),
    document_id: positiveIntegerSchema.optional().describe('Sales document type; required when multiple active FV types exist'),
    date: dateSchema.describe('Invoice date'),
    seller: positiveIntegerSchema.describe('Seller ID selected by the caller'),
    items: z.array(invoiceItemSchema).min(1).max(500).describe('Exact product codes, caller-supplied quantities, prices and tax IDs'),
    payments: invoiceInputSchema.shape.payments.describe('Caller-selected payment IDs, amounts and due dates'),
    observations: invoiceInputSchema.shape.observations,
  })
  .strict();
