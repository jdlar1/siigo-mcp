import { z } from 'zod';
import {
  currencySchema,
  dateSchema,
  dateTimeSchema,
  deleteResponseSchema,
  documentRefSchema,
  hasAtMostDecimalPlaces,
  idempotencyKeySchema,
  listResponseSchema,
  mailSchema,
  metadataSchema,
  nonNegativeIntegerSchema,
  paginationQuerySchema,
  positiveIntegerSchema,
  stampSchema,
  taxRefSchema,
  toolOutputSchema,
} from './common.js';
import { customerOrInlineSchema, customerReferenceSchema } from './customers.js';

const invoiceDateFilterSchema = z.union([z.iso.date(), dateTimeSchema]);
const healthcarePaymentMethodSchema = z.enum(['01', '02', '03', '04']);
const healthcareServicePlanSchema = z.enum([
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
]);
const nonContractInvoiceReasonSchema = z.enum(['01', '02', '03', '04', '05', '06', '07']);

const decimalSchema = (maximumDecimals: number, minimum = 0) =>
  z
    .number()
    .finite()
    .min(minimum)
    .refine((value) => hasAtMostDecimalPlaces(value, maximumDecimals), `Value must have at most ${maximumDecimals} decimal places`);

const nonNegativeMoneySchema = decimalSchema(2);
const positiveMoneySchema = decimalSchema(2, Number.MIN_VALUE);
const healthcareCollectionAmountSchema = decimalSchema(2, Number.MIN_VALUE).max(9_999_999_999.99);
const quantitySchema = decimalSchema(2, Number.MIN_VALUE).describe('Positive quantity, up to 2 decimal places');
const priceSchema = decimalSchema(6).describe('Non-negative price, up to 6 decimal places');

const healthcareCompanyBaseSchema = z
  .object({
    operation_type: z.enum(['SS-CUFE', 'SS-SinAporte', 'SS-Recaudo']),
    period_start: dateSchema.optional(),
    period_end: dateSchema.optional(),
    payment_method: healthcarePaymentMethodSchema.optional(),
    service_plan: healthcareServicePlanSchema.optional(),
    policy_number: z
      .string()
      .regex(/^[A-Za-z0-9]+$/, 'policy_number must be alphanumeric')
      .max(50)
      .optional(),
    contract_number: z.string().max(64).optional(),
    non_contract_invoice_reason: nonContractInvoiceReasonSchema.optional(),
    copayment: healthcareCollectionAmountSchema.optional(),
    coinsurance: healthcareCollectionAmountSchema.optional(),
    cost_sharing: healthcareCollectionAmountSchema.optional(),
    recovery_charge: healthcareCollectionAmountSchema.optional(),
  })
  .strict()
  .superRefine((healthcare, context) => {
    const isContractedOperation = healthcare.operation_type === 'SS-CUFE' || healthcare.operation_type === 'SS-SinAporte';

    if (!isContractedOperation) {
      const unsupportedFields = [
        'period_start',
        'period_end',
        'payment_method',
        'service_plan',
        'policy_number',
        'contract_number',
        'non_contract_invoice_reason',
        'copayment',
        'coinsurance',
        'cost_sharing',
        'recovery_charge',
      ] as const;
      unsupportedFields.forEach((field) => {
        if (healthcare[field] !== undefined) {
          context.addIssue({ code: 'custom', path: [field], message: `${field} is only valid for SS-CUFE or SS-SinAporte` });
        }
      });
      return;
    }

    if (healthcare.operation_type === 'SS-SinAporte') {
      (['copayment', 'coinsurance', 'cost_sharing', 'recovery_charge'] as const).forEach((field) => {
        if (healthcare[field] !== undefined) {
          context.addIssue({ code: 'custom', path: [field], message: `${field} is only valid for SS-CUFE` });
        }
      });
    }

    if (!healthcare.period_start) {
      context.addIssue({ code: 'custom', path: ['period_start'], message: 'period_start is required for healthcare invoices' });
    }
    if (!healthcare.period_end) {
      context.addIssue({ code: 'custom', path: ['period_end'], message: 'period_end is required for healthcare invoices' });
    }
    if (healthcare.period_start && healthcare.period_end && healthcare.period_start > healthcare.period_end) {
      context.addIssue({ code: 'custom', path: ['period_end'], message: 'period_end must be on or after period_start' });
    }
    if (healthcare.contract_number && healthcare.policy_number) {
      context.addIssue({ code: 'custom', path: ['policy_number'], message: 'policy_number cannot be sent with contract_number' });
    }
    if (healthcare.contract_number && healthcare.non_contract_invoice_reason) {
      context.addIssue({
        code: 'custom',
        path: ['non_contract_invoice_reason'],
        message: 'non_contract_invoice_reason cannot be sent with contract_number',
      });
    }
    if (!healthcare.contract_number && !healthcare.non_contract_invoice_reason) {
      context.addIssue({
        code: 'custom',
        path: ['non_contract_invoice_reason'],
        message: 'non_contract_invoice_reason is required when contract_number is absent',
      });
    }
  });

/**
 * Shared Resolution 948 healthcare fields for credit notes.
 *
 * The current invoice reference requires one collection amount for SS-CUFE
 * sales invoices. The credit-note reference does not carry that requirement,
 * so credit notes intentionally use this base contract without that check.
 */
export const creditNoteHealthcareCompanySchema = healthcareCompanyBaseSchema;

export const healthcareCompanySchema = healthcareCompanyBaseSchema.superRefine((healthcare, context) => {
  const hasCollectionAmount = [healthcare.copayment, healthcare.coinsurance, healthcare.cost_sharing, healthcare.recovery_charge].some(
    (value) => value !== undefined,
  );

  if (healthcare.operation_type === 'SS-CUFE' && !hasCollectionAmount) {
    context.addIssue({
      code: 'custom',
      path: ['copayment'],
      message: 'SS-CUFE requires at least one healthcare collection amount',
    });
  }
});

const discountSchema = z
  .object({
    id: positiveIntegerSchema,
    percentage: z
      .number()
      .min(0.01)
      .max(99.99)
      .refine((value) => hasAtMostDecimalPlaces(value, 2), 'Percentage must have at most 2 decimal places')
      .optional(),
    value: nonNegativeMoneySchema.optional(),
  })
  .strict()
  .superRefine((discount, context) => {
    if (discount.percentage === undefined && discount.value === undefined) {
      context.addIssue({ code: 'custom', path: ['value'], message: 'Provide percentage or value for a discount' });
    }
  });

const transportItemSchema = z
  .object({
    file_number: z.number().int().positive().max(100_000_000_000).optional(),
    shipment_number: z.string().max(15).optional(),
    transported_quantity: z.number().int().nonnegative().max(99_999_999).optional(),
    measurement_unit: z.enum(['GLL', 'KGM']).optional(),
    freight_value: z.number().int().nonnegative().max(999_999_999_999).optional(),
    purchase_order: z.string().max(50).optional(),
    service_type: z.enum(['AdditionalService', 'Shipment']).optional(),
  })
  .strict();

export const invoiceItemSchema = z
  .object({
    code: z.string().min(1).max(30),
    description: z.string().max(2500).optional(),
    quantity: quantitySchema,
    price: priceSchema,
    taxed_price: priceSchema.optional(),
    discount: nonNegativeMoneySchema.optional(),
    taxes: z.array(taxRefSchema).max(3).optional(),
    warehouse: positiveIntegerSchema.optional(),
    seller: positiveIntegerSchema.optional(),
    tax_base: nonNegativeMoneySchema.optional(),
    taxpayer: z.enum(['Customer', 'Company']).optional(),
    customer: customerReferenceSchema.optional(),
    transport: transportItemSchema.optional(),
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

const invoiceAdditionalFieldsSchema = z
  .object({
    purchase_order: z
      .object({
        prefix: z.string().max(20).optional(),
        number: z.string().max(20),
      })
      .strict()
      .optional(),
    delivery_order: z
      .object({
        prefix: z.string().max(20).optional(),
        number: z.string().max(20),
        date: dateSchema.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const globalChargesSchema = z.array(discountSchema).max(20).optional();

export const invoiceInputSchema = z
  .object({
    document: documentRefSchema,
    number: positiveIntegerSchema.optional(),
    date: dateSchema,
    customer: customerOrInlineSchema,
    cost_center: positiveIntegerSchema.optional(),
    currency: currencySchema.optional(),
    seller: positiveIntegerSchema,
    observations: z.string().max(4000).optional(),
    advance_payment: positiveMoneySchema.optional(),
    items: z.array(invoiceItemSchema).min(1).max(500),
    payments: z
      .array(
        z
          .object({
            id: positiveIntegerSchema,
            value: positiveMoneySchema,
            due_date: dateSchema.optional(),
          })
          .strict(),
      )
      .min(1),
    stamp: stampSchema.optional(),
    mail: mailSchema.optional(),
    retentions: z.array(taxRefSchema).max(20).optional(),
    global_discounts: z.array(discountSchema).max(20).optional(),
    global_charges: globalChargesSchema,
    additional_fields: invoiceAdditionalFieldsSchema.optional(),
    healthcare_company: healthcareCompanySchema.optional(),
  })
  .strict();

export const invoiceListQuerySchema = paginationQuerySchema
  .extend({
    document_id: positiveIntegerSchema.optional().describe('Document type ID filter'),
    customer_identification: z.string().min(1).max(50).optional(),
    customer_branch_office: z.number().int().min(0).max(999).optional(),
    name: z.string().min(1).max(100).optional(),
    created_start: invoiceDateFilterSchema.optional(),
    created_end: invoiceDateFilterSchema.optional(),
    date_start: invoiceDateFilterSchema.optional(),
    date_end: invoiceDateFilterSchema.optional(),
    updated_start: invoiceDateFilterSchema.optional(),
    updated_end: invoiceDateFilterSchema.optional(),
  })
  .strict();

export const invoiceIdSchema = z.uuid().describe('Invoice UUID');

export const invoiceIdInputSchema = z
  .object({
    id: invoiceIdSchema,
  })
  .strict();

export const invoiceCreateInputSchema = z
  .object({
    invoice: invoiceInputSchema,
    idempotency_key: idempotencyKeySchema.optional().describe('Optional idempotency key for safe retries'),
  })
  .strict();

export const invoiceUpdateInputSchema = z
  .object({
    id: invoiceIdSchema,
    invoice: invoiceInputSchema,
  })
  .strict();

const copyToSchema = z.string().refine((value) => {
  const emails = value
    .split(';')
    .map((email) => email.trim())
    .filter(Boolean);
  return emails.length <= 5 && emails.every((email) => z.email().safeParse(email).success);
}, 'copy_to must contain up to 5 semicolon-separated email addresses');

export const invoiceMailInputSchema = z
  .object({
    id: invoiceIdSchema,
    guid: z.uuid().optional(),
    mail_to: z.email(),
    copy_to: copyToSchema.optional(),
  })
  .strict();

export const invoiceBatchItemSchema = invoiceInputSchema
  .extend({
    idempotency_key: idempotencyKeySchema.describe('Unique invoice idempotency key'),
  })
  .strict();

export const invoiceBatchInputSchema = z
  .object({
    notification_url: z
      .string()
      .max(2048)
      .url()
      .refine((value) => value.startsWith('https://'), 'notification_url must use HTTPS'),
    invoices: z.array(invoiceBatchItemSchema).min(1),
  })
  .strict();

export const electronicStampResponseSchema = z
  .object({
    status: z.string(),
    cufe: z.string().optional(),
    cude: z.string().optional(),
    observations: z.string().optional(),
    errors: z.string().optional(),
  })
  .passthrough();

export const mailStatusResponseSchema = z
  .object({
    status: z.string(),
    observations: z.string().optional(),
  })
  .passthrough();

export const invoiceResponseCustomerSchema = z
  .object({
    id: z.string().optional(),
    person_type: z.string().optional(),
    id_type: z.union([z.string(), z.object({}).passthrough()]).optional(),
    identification: z.string().optional(),
    branch_office: z.union([z.number().int().nonnegative(), z.string()]).optional(),
    name: z.union([z.string(), z.array(z.string())]).optional(),
    address: z.object({}).passthrough().optional(),
    phones: z.array(z.object({}).passthrough()).optional(),
    contacts: z.array(z.object({}).passthrough()).optional(),
  })
  .passthrough();

export const invoiceResponseDiscountSchema = z
  .object({
    id: nonNegativeIntegerSchema.optional(),
    name: z.string().optional(),
    type: z.string().optional(),
    percentage: z.number().optional(),
    value: z.number().optional(),
  })
  .passthrough();

export const invoiceResponseTaxSchema = z
  .object({
    id: positiveIntegerSchema.optional(),
    name: z.string().optional(),
    type: z.string().optional(),
    percentage: z.number().optional(),
    value: z.number().optional(),
    base: z.number().optional(),
    base_value: z.number().optional(),
    total: z.number().optional(),
  })
  .passthrough();

export const invoiceResponseWarehouseSchema = z
  .object({
    id: nonNegativeIntegerSchema.optional(),
    name: z.string().optional(),
  })
  .passthrough();

export const invoiceResponseItemSchema = z
  .object({
    id: z.string().optional(),
    type: z.string().optional(),
    code: z.string().optional(),
    description: z.string().optional(),
    quantity: z.number().optional(),
    price: z.number().optional(),
    taxed_price: z.number().optional(),
    discount: z.union([z.number(), invoiceResponseDiscountSchema]).optional(),
    taxes: z.array(invoiceResponseTaxSchema).optional(),
    warehouse: z.union([nonNegativeIntegerSchema, invoiceResponseWarehouseSchema]).optional(),
    seller: z.union([positiveIntegerSchema, z.object({}).passthrough()]).optional(),
    tax_base: z.number().optional(),
    taxpayer: z.enum(['Customer', 'Company']).optional(),
    customer: invoiceResponseCustomerSchema.optional(),
    transport: z.object({}).passthrough().optional(),
    total: z.number().optional(),
  })
  .passthrough();

export const invoiceResponseGlobalDiscountSchema = z
  .object({
    id: nonNegativeIntegerSchema.optional(),
    name: z.string().optional(),
    type: z.string().optional(),
    percentage: z.number().optional(),
    value: z.number().optional(),
  })
  .passthrough();

export const invoiceResponseSchema = z
  .object({
    id: z.string().optional(),
    document: z.object({ id: positiveIntegerSchema }).passthrough().optional(),
    prefix: z.string().optional(),
    number: z.number().int().nonnegative().optional(),
    name: z.string().optional(),
    date: dateSchema.optional(),
    customer: z.object({}).passthrough().optional(),
    seller: positiveIntegerSchema.optional(),
    items: z.array(invoiceResponseItemSchema).optional(),
    payments: z.array(z.object({}).passthrough()).optional(),
    currency: z.object({}).passthrough().optional(),
    retentions: z.array(invoiceResponseTaxSchema).optional(),
    global_discounts: z.array(invoiceResponseGlobalDiscountSchema).optional(),
    global_charges: z.array(invoiceResponseGlobalDiscountSchema).optional(),
    additional_fields: z.object({}).passthrough().optional(),
    healthcare_company: z.object({}).passthrough().optional(),
    cargo_transportation: z.object({}).passthrough().optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    status: z.string().optional(),
    public_url: z.string().optional(),
    annulled: z.boolean().optional(),
    stamp: electronicStampResponseSchema.optional(),
    mail: mailStatusResponseSchema.optional(),
    metadata: metadataSchema.optional(),
  })
  .passthrough();

export const invoiceListResponseSchema = listResponseSchema(invoiceResponseSchema);

export const invoicePdfResponseSchema = z
  .object({
    id: z.string().optional(),
    base64: z.string(),
    cufe: z.string().optional(),
    cude: z.string().optional(),
  })
  .passthrough();

export const invoiceXmlResponseSchema = z
  .object({
    id: z.string().optional(),
    base64: z.string(),
    cufe: z.string().optional(),
  })
  .passthrough();

export const invoiceStampErrorsResponseSchema = z
  .object({
    id: z.string().optional(),
    errors: z.array(z.object({ message: z.string().optional() }).passthrough()),
  })
  .passthrough();

export const invoiceBatchResponseSchema = z
  .object({
    id: z.string(),
    status: z.string(),
    received_at: z.string(),
  })
  .passthrough();

export const invoiceEmailResponseSchema = mailStatusResponseSchema;

export const invoiceEntityToolOutputSchema = toolOutputSchema(invoiceResponseSchema);
export const invoiceListToolOutputSchema = toolOutputSchema(invoiceListResponseSchema);
export const invoiceAnnulToolOutputSchema = toolOutputSchema(deleteResponseSchema);
export const invoiceDeleteToolOutputSchema = toolOutputSchema(deleteResponseSchema);
export const invoicePdfToolOutputSchema = toolOutputSchema(invoicePdfResponseSchema);
export const invoiceXmlToolOutputSchema = toolOutputSchema(invoiceXmlResponseSchema);
export const invoiceStampErrorsToolOutputSchema = toolOutputSchema(invoiceStampErrorsResponseSchema);
export const invoiceBatchToolOutputSchema = toolOutputSchema(invoiceBatchResponseSchema);
export const invoiceEmailToolOutputSchema = toolOutputSchema(invoiceEmailResponseSchema);
