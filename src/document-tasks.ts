import { z } from 'zod';

// Routing metadata only: endpoint schemas and handlers remain lazy in the registry.
export const documentTasks = {
  invoice: { domain: 'invoices', operation: 'siigo_create_invoice', field: 'invoice', prepare: true },
  quotation: { domain: 'quotations', operation: 'siigo_create_quotation', field: 'quotation', prepare: true },
  purchase: { domain: 'purchases', operation: 'siigo_create_purchase', field: 'purchase', prepare: true },
  voucher: { domain: 'vouchers', operation: 'siigo_create_voucher', field: 'voucher', prepare: true },
  credit_note: { domain: 'credit_notes', operation: 'siigo_create_credit_note', field: 'creditNote', prepare: false },
  payment_receipt: { domain: 'payment_receipts', operation: 'siigo_create_payment_receipt', field: 'paymentReceipt', prepare: false },
  purchase_support_document: {
    domain: 'purchase_support_documents',
    operation: 'siigo_create_purchase_support_document',
    field: 'purchase_support_document',
    prepare: false,
  },
  journal: { domain: 'journals', operation: 'siigo_create_journal', field: 'journal', prepare: false },
} as const;

export const documentKindSchema = z.enum([
  'invoice',
  'quotation',
  'purchase',
  'voucher',
  'credit_note',
  'payment_receipt',
  'purchase_support_document',
  'journal',
]);
export const preparationKindSchema = z.enum(['invoice', 'quotation', 'purchase', 'voucher']);
export type PreparationKind = z.infer<typeof preparationKindSchema>;
