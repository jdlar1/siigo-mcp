import { z } from 'zod';
import {
  currencySchema,
  dateSchema,
  dateTimeSchema,
  documentRefSchema,
  hasAtMostDecimalPlaces,
  idempotencyKeySchema,
  listResponseSchema,
  mailSchema,
  metadataSchema,
  paginationQuerySchema,
  positiveAmountSchema,
  positiveIntegerSchema,
  stampSchema,
  taxRefSchema,
  toolOutputSchema,
} from './common.js';
import { customerReferenceSchema } from './customers.js';
import {
  creditNoteHealthcareCompanySchema,
  electronicStampResponseSchema,
  invoiceResponseCustomerSchema,
  invoiceResponseItemSchema,
  invoiceResponseTaxSchema,
  mailStatusResponseSchema,
} from './invoices.js';

export { creditNoteHealthcareCompanySchema } from './invoices.js';

const creditNoteDateFilterSchema = z.union([z.iso.date(), dateTimeSchema]);
// The current page documents reason as conditional: it is required for
// electronic credit notes, but is not required for every credit-note payload.
// Keep the numeric union broad enough to accept the page's narrative and
// generated contracts; the API remains authoritative for electronic notes.
const creditNoteReasonSchema = z.number().int().min(1).max(7);

export const creditNoteListQuerySchema = paginationQuerySchema
  .extend({
    name: z.string().min(1).max(100).optional(),
    created_start: creditNoteDateFilterSchema.optional(),
    created_end: creditNoteDateFilterSchema.optional(),
    date_start: creditNoteDateFilterSchema.optional(),
    date_end: creditNoteDateFilterSchema.optional(),
    updated_start: creditNoteDateFilterSchema.optional(),
    updated_end: creditNoteDateFilterSchema.optional(),
  })
  .strict();

const invoiceDataSchema = z
  .object({
    prefix: z.string().max(20).optional(),
    number: positiveIntegerSchema.optional(),
    date: dateSchema,
    cufe: z.string().max(200).optional(),
  })
  .strict();

const creditNoteAmountSchema = positiveAmountSchema.refine(
  (value) => hasAtMostDecimalPlaces(value, 2),
  'Amount must have at most 2 decimal places',
);

const creditNoteItemSchema = z
  .object({
    code: z.string().min(1).max(30),
    description: z.string().max(2500).optional(),
    quantity: z
      .number()
      .finite()
      .positive()
      .refine((value) => hasAtMostDecimalPlaces(value, 2), 'Quantity must have at most 2 decimal places'),
    price: z
      .number()
      .finite()
      .nonnegative()
      .refine((value) => hasAtMostDecimalPlaces(value, 6), 'Price must have at most 6 decimal places'),
    taxed_price: z
      .number()
      .finite()
      .nonnegative()
      .refine((value) => hasAtMostDecimalPlaces(value, 6), 'Taxed price must have at most 6 decimal places')
      .optional(),
    discount: z
      .number()
      .finite()
      .nonnegative()
      .refine((value) => hasAtMostDecimalPlaces(value, 2), 'Discount must have at most 2 decimal places')
      .optional(),
    taxes: z.array(taxRefSchema).max(3).optional(),
    warehouse: positiveIntegerSchema.optional(),
    seller: positiveIntegerSchema.optional(),
    tax_base: z
      .number()
      .finite()
      .nonnegative()
      .refine((value) => hasAtMostDecimalPlaces(value, 2), 'Tax base must have at most 2 decimal places')
      .optional(),
    taxpayer: z.enum(['Customer', 'Company']).optional(),
  })
  .strict()
  .superRefine((item, context) => {
    if (item.price === 0 && (item.tax_base === undefined || item.taxpayer === undefined)) {
      context.addIssue({ code: 'custom', path: ['tax_base'], message: 'Gift items with price 0 require tax_base and taxpayer' });
    }
    if (item.price === 0 && item.tax_base !== undefined && item.tax_base <= 0) {
      context.addIssue({ code: 'custom', path: ['tax_base'], message: 'Gift item tax_base must be positive' });
    }
    if (item.price > 0 && (item.tax_base !== undefined || item.taxpayer !== undefined)) {
      context.addIssue({ code: 'custom', path: ['tax_base'], message: 'tax_base and taxpayer are only valid when price is 0' });
    }
  });

export const creditNoteInputSchema = z
  .object({
    document: documentRefSchema,
    number: positiveIntegerSchema.optional(),
    date: dateSchema,
    invoice: z.uuid().optional().describe('Existing Siigo invoice UUID'),
    invoice_data: invoiceDataSchema.optional().describe('External invoice data'),
    customer: customerReferenceSchema.optional().describe('Required for external invoices'),
    seller: positiveIntegerSchema.optional().describe('Required for external invoices'),
    cost_center: positiveIntegerSchema.optional(),
    currency: currencySchema.optional(),
    advance_payment: creditNoteAmountSchema.optional(),
    reason: creditNoteReasonSchema.optional().describe('DIAN credit-note reason code; required by Siigo for electronic documents'),
    items: z.array(creditNoteItemSchema).min(1).max(500),
    payments: z
      .array(
        z
          .object({
            id: positiveIntegerSchema,
            value: z
              .number()
              .positive()
              .max(9_999_999_999_999.99)
              .refine((value) => hasAtMostDecimalPlaces(value, 2), 'Payment value must have at most 2 decimal places'),
            due_date: dateSchema.optional(),
          })
          .strict(),
      )
      .min(1),
    retentions: z.array(taxRefSchema).max(20).optional(),
    stamp: stampSchema.optional(),
    mail: mailSchema.optional(),
    observations: z.string().max(4000).optional(),
    healthcare_company: creditNoteHealthcareCompanySchema.optional(),
  })
  .strict()
  .superRefine((creditNote, context) => {
    if (creditNote.invoice && creditNote.invoice_data) {
      context.addIssue({ code: 'custom', path: ['invoice_data'], message: 'invoice and invoice_data are mutually exclusive' });
    }

    if (creditNote.invoice_data && !creditNote.customer) {
      context.addIssue({ code: 'custom', path: ['customer'], message: 'customer is required when invoice_data is provided' });
    }
    if (creditNote.invoice_data && !creditNote.seller) {
      context.addIssue({ code: 'custom', path: ['seller'], message: 'seller is required when invoice_data is provided' });
    }

    if (creditNote.invoice_data && creditNote.reason === 2) {
      if (creditNote.invoice_data.number === undefined) {
        context.addIssue({ code: 'custom', path: ['invoice_data', 'number'], message: 'number is required for reason 2' });
      }
      if (!creditNote.invoice_data.cufe) {
        context.addIssue({ code: 'custom', path: ['invoice_data', 'cufe'], message: 'cufe is required for reason 2' });
      }
    }

    if (creditNote.invoice_data && creditNote.invoice_data.date >= creditNote.date) {
      context.addIssue({
        code: 'custom',
        path: ['invoice_data', 'date'],
        message: 'invoice_data.date must be earlier than the credit-note date',
      });
    }
  });

export const creditNoteCreateInputSchema = z
  .object({
    creditNote: creditNoteInputSchema,
    idempotency_key: idempotencyKeySchema.optional().describe('Optional idempotency key for safe retries'),
  })
  .strict();

export const creditNoteIdSchema = z.uuid().describe('Credit-note UUID');

export const creditNoteIdInputSchema = z
  .object({
    id: creditNoteIdSchema,
  })
  .strict();

export const creditNoteResponseCustomerSchema = invoiceResponseCustomerSchema;

export const creditNoteResponseSchema = z
  .object({
    id: z.string().optional(),
    document: z.object({ id: positiveIntegerSchema }).passthrough().optional(),
    number: z.number().int().nonnegative().optional(),
    name: z.string().optional(),
    date: dateSchema.optional(),
    customer: creditNoteResponseCustomerSchema.optional(),
    seller: positiveIntegerSchema.optional(),
    cost_center: positiveIntegerSchema.optional(),
    currency: z.object({}).passthrough().optional(),
    reason: creditNoteReasonSchema.optional(),
    advance_payment: z.number().optional(),
    observations: z.string().optional(),
    invoice: z.union([z.string(), z.object({ id: z.string(), name: z.string() }).passthrough()]).optional(),
    invoice_data: z
      .object({
        prefix: z.string().optional(),
        number: z.number().int().nonnegative().optional(),
        date: dateSchema,
        cufe: z.string().optional(),
      })
      .passthrough()
      .optional(),
    items: z.array(invoiceResponseItemSchema).optional(),
    payments: z.array(z.object({}).passthrough()).optional(),
    retentions: z.array(invoiceResponseTaxSchema).optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    healthcare_company: z.object({}).passthrough().optional(),
    stamp: electronicStampResponseSchema.optional(),
    mail: mailStatusResponseSchema.optional(),
    metadata: metadataSchema.optional(),
  })
  .passthrough();

export const creditNoteListResponseSchema = listResponseSchema(creditNoteResponseSchema);
export const creditNotePdfResponseSchema = z
  .object({
    id: z.string().optional(),
    base64: z.string(),
    cufe: z.string().optional(),
    cude: z.string().optional(),
  })
  .passthrough();

export const creditNoteEntityToolOutputSchema = toolOutputSchema(creditNoteResponseSchema);
export const creditNoteListToolOutputSchema = toolOutputSchema(creditNoteListResponseSchema);
export const creditNotePdfToolOutputSchema = toolOutputSchema(creditNotePdfResponseSchema);
