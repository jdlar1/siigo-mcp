import type { z } from 'zod';
import type { accountGroupInputSchema } from './schemas/account-groups.js';
import type { documentTypeQuerySchema, paymentTypeQuerySchema, usersQuerySchema } from './schemas/catalogs.js';
import type { creditNoteInputSchema, creditNoteListQuerySchema } from './schemas/credit-notes.js';
import type { customerInputSchema, customerListQuerySchema, customerSearchSchema } from './schemas/customers.js';
import type {
  creditNoteHealthcareCompanySchema,
  healthcareCompanySchema,
  invoiceBatchInputSchema,
  invoiceInputSchema,
  invoiceItemSchema,
  invoiceListQuerySchema,
  invoiceMailInputSchema,
} from './schemas/invoices.js';
import type { journalListQuerySchema, journalSchema } from './schemas/journals.js';
import type { paymentReceiptListQuerySchema, paymentReceiptSchema, paymentReceiptUpdateSchema } from './schemas/payment-receipts.js';
import type { productInputSchema, productListQuerySchema, productSearchSchema } from './schemas/products.js';
import type { supportDocumentSchema, supportDocumentUpdateSchema } from './schemas/purchase-support-documents.js';
import type { purchaseListQuerySchema, purchaseSchema, purchaseUpdateSchema } from './schemas/purchases.js';
import type { quotationInputSchema, quotationListQuerySchema } from './schemas/quotations.js';
import type { accountsPayableQuerySchema, trialBalanceByThirdSchema, trialBalanceSchema } from './schemas/reports.js';
import type { miscIncomeVoucherSchema, voucherListQuerySchema, voucherSchema } from './schemas/vouchers.js';
import type { webhookListQuerySchema, webhookSchema, webhookUpdateSchema } from './schemas/webhooks.js';

export type SiigoProductInput = z.infer<typeof productInputSchema>;
export type SiigoProductListQuery = z.infer<typeof productListQuerySchema>;
export type SiigoProductSearch = z.infer<typeof productSearchSchema>;
export type SiigoAccountGroupInput = z.infer<typeof accountGroupInputSchema>;

export type SiigoCustomerInput = z.infer<typeof customerInputSchema>;
export type SiigoCustomerListQuery = z.infer<typeof customerListQuerySchema>;
export type SiigoCustomerSearch = z.infer<typeof customerSearchSchema>;

export type SiigoHealthcareCompanyInput = z.infer<typeof healthcareCompanySchema>;
export type SiigoCreditNoteHealthcareCompanyInput = z.infer<typeof creditNoteHealthcareCompanySchema>;
export type SiigoInvoiceItemInput = z.infer<typeof invoiceItemSchema>;
export type SiigoInvoiceInput = z.infer<typeof invoiceInputSchema>;
export type SiigoInvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;
export type SiigoInvoiceMailInput = z.infer<typeof invoiceMailInputSchema>;
export type SiigoInvoiceBatchInput = z.infer<typeof invoiceBatchInputSchema>;
export type SiigoQuotationInput = z.infer<typeof quotationInputSchema>;
export type SiigoQuotationListQuery = z.infer<typeof quotationListQuerySchema>;
export type SiigoCreditNoteInput = z.infer<typeof creditNoteInputSchema>;
export type SiigoCreditNoteListQuery = z.infer<typeof creditNoteListQuerySchema>;

export type SiigoVoucherInput = z.infer<typeof voucherSchema>;
export type SiigoMiscIncomeVoucherInput = z.infer<typeof miscIncomeVoucherSchema>;
export type SiigoVoucherListQuery = z.infer<typeof voucherListQuerySchema>;
export type SiigoPurchaseInput = z.infer<typeof purchaseSchema>;
export type SiigoPurchaseUpdateInput = z.infer<typeof purchaseUpdateSchema>;
export type SiigoPurchaseListQuery = z.infer<typeof purchaseListQuerySchema>;
export type SiigoSupportDocumentInput = z.infer<typeof supportDocumentSchema>;
export type SiigoSupportDocumentUpdateInput = z.infer<typeof supportDocumentUpdateSchema>;
export type SiigoPaymentReceiptInput = z.infer<typeof paymentReceiptSchema>;
export type SiigoPaymentReceiptUpdateInput = z.infer<typeof paymentReceiptUpdateSchema>;
export type SiigoPaymentReceiptListQuery = z.infer<typeof paymentReceiptListQuerySchema>;
export type SiigoJournalInput = z.infer<typeof journalSchema>;
export type SiigoJournalListQuery = z.infer<typeof journalListQuerySchema>;

export type SiigoDocumentTypeQuery = z.infer<typeof documentTypeQuerySchema>;
export type SiigoPaymentTypeQuery = z.infer<typeof paymentTypeQuerySchema>;
export type SiigoUsersQuery = z.infer<typeof usersQuerySchema>;
export type SiigoTrialBalanceInput = z.infer<typeof trialBalanceSchema>;
export type SiigoTrialBalanceByThirdInput = z.infer<typeof trialBalanceByThirdSchema>;
export type SiigoAccountsPayableQuery = z.infer<typeof accountsPayableQuerySchema>;
export type SiigoWebhookInput = z.infer<typeof webhookSchema>;
export type SiigoWebhookUpdateInput = z.infer<typeof webhookUpdateSchema>;
export type SiigoWebhookListQuery = z.infer<typeof webhookListQuerySchema>;
