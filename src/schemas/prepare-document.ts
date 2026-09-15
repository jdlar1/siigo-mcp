import { z } from 'zod';
import { prepareInvoiceSchema } from './prepare-invoice.js';
import { purchaseSchema } from './purchases.js';
import { quotationInputSchema } from './quotations.js';
import { advancePaymentVoucherSchema, debtPaymentVoucherSchema } from './vouchers.js';

const referenceFields = {
  document_id: prepareInvoiceSchema.shape.document_id.describe(
    'Document type ID for this workflow; required when multiple active types exist.',
  ),
  customer_identification: prepareInvoiceSchema.shape.customer_identification,
  branch_office: prepareInvoiceSchema.shape.branch_office,
};
export const prepareQuotationSchema = quotationInputSchema.omit({ document: true, customer: true }).extend(referenceFields).strict();

// Preserve purchase cross-field validation by parsing the assembled payload before lookups.
export const preparePurchaseSchema = z
  .object({
    ...purchaseSchema.shape,
  })
  .omit({ document: true, supplier: true })
  .extend({
    document_id: referenceFields.document_id,
    supplier_identification: z.string().min(1).max(50).describe('Exact existing supplier identification'),
    branch_office: referenceFields.branch_office,
  })
  .strict();

export const prepareVoucherSchema = z.discriminatedUnion('type', [
  debtPaymentVoucherSchema.omit({ document: true, customer: true }).extend(referenceFields).strict(),
  advancePaymentVoucherSchema.omit({ document: true, customer: true }).extend(referenceFields).strict(),
]);

export const preparationSchemas = {
  invoice: prepareInvoiceSchema,
  quotation: prepareQuotationSchema,
  purchase: preparePurchaseSchema,
  voucher: prepareVoucherSchema,
};
