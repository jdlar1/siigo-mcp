// ─── Configuration & Authentication ────────────────────────────────────────

export interface SiigoConfig {
  username: string;
  accessKey: string;
  baseUrl: string;
  partnerId: string;
  /** Client-side request budget per rolling minute (production defaults to 100). */
  requestsPerMinute?: number;
}

export interface SiigoToken {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

// ─── Common / Shared Types ─────────────────────────────────────────────────

export interface SiigoPagination {
  page: number;
  page_size: number;
  total_results: number;
}

export interface SiigoListResponse<T> {
  pagination: SiigoPagination;
  results: T[];
  _links?: Record<string, { href: string }>;
  __links?: Record<string, { href: string }>;
}

export interface SiigoErrorDetail {
  Code: string;
  Message: string;
  Params?: string[];
  Detail?: string;
}

export interface SiigoErrorResponse {
  Status: number;
  Errors?: SiigoErrorDetail[];
  errors?: SiigoErrorDetail[];
}

/** @deprecated Use the endpoint-specific entity, array, or SiigoListResponse type. */
export type SiigoApiResponse<T> =
  | T
  | T[]
  | SiigoListResponse<T>
  | {
      data: T;
      _links?: Record<string, { href: string }>;
    };

export interface SiigoRequestOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface SiigoDeleteResponse {
  id: string;
  deleted: true;
}

export interface SiigoPaginationParams {
  page?: number;
  page_size?: number;
}

export interface SiigoDateFilterParams {
  created_start?: string;
  created_end?: string;
  date_start?: string;
  date_end?: string;
  updated_start?: string;
  updated_end?: string;
}

export interface SiigoProductListParams extends SiigoPaginationParams, SiigoDateFilterParams {
  code?: string;
  account_group?: string;
  type?: ProductType;
  stock_control?: boolean;
  active?: boolean;
  ids?: string;
}

export interface SiigoCustomerListParams extends SiigoPaginationParams, SiigoDateFilterParams {
  identification?: string;
  branch_office?: number;
  type?: CustomerType;
  person_type?: PersonType;
  active?: boolean;
}

export interface SiigoDocumentListParams extends SiigoPaginationParams, SiigoDateFilterParams {
  document_id?: number;
  number?: number;
  name?: string;
  date_start?: string;
  date_end?: string;
  customer_identification?: string;
  customer_branch_office?: number;
}

export interface SiigoMetadata {
  created: string;
  last_updated?: string | null;
  stock_updated?: string | null;
}

export interface SiigoCity {
  country_code: string;
  state_code: string;
  city_code: string;
}

export interface SiigoCityOut extends SiigoCity {
  country_name?: string;
  state_name?: string;
  city_name?: string;
}

export interface SiigoAddress {
  address: string;
  city: SiigoCity;
  postal_code?: string;
}

export interface SiigoPhone {
  indicative?: string;
  number?: string;
  extension?: string;
}

export interface SiigoContact {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: {
    indicative?: string;
    number?: string;
    extension?: string;
  };
}

export interface SiigoCurrency {
  code: string;
  exchange_rate: number;
}

export interface SiigoDiscount {
  id?: number;
  name?: string;
  type?: string;
  percentage?: number;
  value?: number;
}

export interface SiigoTaxRef {
  id: number;
}

export interface SiigoTaxWithBaseRef extends SiigoTaxRef {
  base?: number;
}

export interface SiigoTaxOut {
  id: number;
  name?: string;
  type?: 'IVA' | 'Retefuente' | 'ReteIVA' | 'ReteICA' | 'Impoconsumo' | 'AdValorem' | 'Autorretencion';
  percentage?: number;
  value?: number;
}

export interface SiigoTaxDetail extends SiigoTaxOut {
  base?: number;
  base_value?: number;
  total?: number;
}

export interface SiigoDocumentRef {
  id: number;
}

export interface SiigoGlobalDiscount {
  id: number;
  percentage?: number;
  value?: number;
}

export interface SiigoGlobalDiscountResponse {
  id?: number;
  name?: string;
  type?: string;
  percentage?: number;
  value?: number;
}

export interface SiigoPayment {
  id: number;
  name?: string;
  value: number;
  due_date?: string;
}

export interface SiigoNamedPayment extends SiigoPayment {
  name?: string;
}

export interface SiigoStamp {
  send: boolean;
}

export interface SiigoMail {
  send: boolean;
}

export interface SiigoElectronicStamp {
  status: string;
  cufe?: string;
  cude?: string;
  observations?: string;
  errors?: string;
}

export interface SiigoMailStatus {
  status: string;
  observations?: string;
}

// ─── Products ──────────────────────────────────────────────────────────────

export type ProductType = 'Product' | 'Service' | 'ConsumerGood' | 'Combo';
export type TaxClassification = 'Taxed' | 'Exempt' | 'Excluded';

export interface SiigoProductComponent {
  id?: string;
  code: string;
  name?: string;
  quantity: number;
}

export interface SiigoProductComponentResponse {
  id?: string;
  code: string;
  name?: string;
  quantity?: number;
}

export interface SiigoProductTax {
  id: number;
  name?: string;
  type?: string;
  percentage?: number;
  value?: number;
  milliliters?: number;
  rate?: number;
}

export interface SiigoProductPriceListItem {
  position: number;
  name?: string;
  value: number | string;
}

export interface SiigoProductPrice {
  currency_code: string;
  price_list: SiigoProductPriceListItem[];
}

export interface SiigoProductWarehouse {
  id: number;
  name?: string;
  quantity?: number | string;
}

export interface SiigoProduct {
  id?: string;
  code: string;
  name: string;
  account_group: number | { id: number; name: string };
  type?: ProductType;
  stock_control?: boolean;
  active?: boolean;
  tax_classification?: TaxClassification;
  tax_included?: boolean;
  tax_consumption_value?: number;
  taxes?: SiigoProductTax[];
  prices?: SiigoProductPrice[];
  unit?: string | { code: string; name: string };
  unit_label?: string;
  reference?: string;
  description?: string;
  additional_fields?: {
    barcode?: string;
    brand?: string;
    tariff?: string;
    model?: string;
  };
  components?: SiigoProductComponentResponse[];
  available_quantity?: number;
  warehouses?: SiigoProductWarehouse[];
  metadata?: SiigoMetadata;
}

// ─── Account Groups (Inventory Categories) ─────────────────────────────────

export interface SiigoAccountGroupIn {
  code: string;
  name: string;
}

export interface SiigoAccountGroup {
  id: number;
  name: string;
  active: boolean;
}

// ─── Customers ─────────────────────────────────────────────────────────────

export type CustomerType = 'Customer' | 'Supplier' | 'Other';
export type PersonType = 'Person' | 'Company';

export interface SiigoCustomer {
  id?: string;
  type?: CustomerType;
  person_type: PersonType;
  id_type: SiigoIdType;
  identification: string;
  check_digit?: string;
  name: string[];
  commercial_name?: string;
  branch_office?: number;
  active?: boolean;
  vat_responsible?: boolean;
  fiscal_responsibilities?: Array<{ code: string; name?: string }>;
  address: SiigoAddress & { city: SiigoCityOut };
  phones: SiigoPhone[];
  contacts: SiigoContact[];
  comments?: string;
  related_users?: {
    seller_id?: number;
    collector_id?: number;
  };
  custom_fields?: Array<{
    key: string;
    value: string;
  }>;
  metadata?: SiigoMetadata;
}

// ─── Invoices ──────────────────────────────────────────────────────────────

export interface SiigoHealthcareCompany {
  operation_type: 'SS-CUFE' | 'SS-SinAporte' | 'SS-Recaudo';
  period_start?: string;
  period_end?: string;
  payment_method?: '01' | '02' | '03' | '04';
  service_plan?: '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11' | '12' | '13' | '14' | '15' | '16' | '17';
  policy_number?: string;
  contract_number?: string;
  non_contract_invoice_reason?: '01' | '02' | '03' | '04' | '05' | '06' | '07';
  copayment?: number;
  coinsurance?: number;
  cost_sharing?: number;
  recovery_charge?: number;
}

export interface SiigoCargoTransportation {
  registration_city?: SiigoCity;
  type_document_identification?: string;
  identification?: string;
  first_name?: string;
  last_name?: string;
}

export interface SiigoInvoiceItem {
  code: string;
  description?: string;
  quantity: number;
  price: number;
  taxed_price?: number;
  discount?: number;
  taxes?: SiigoTaxRef[];
  warehouse?: number;
  seller?: number;
  tax_base?: number;
  taxpayer?: 'Customer' | 'Company';
  customer?: {
    identification: string;
    branch_office?: number;
  };
  transport?: {
    file_number?: number;
    shipment_number?: string;
    transported_quantity?: number;
    measurement_unit?: 'GLL' | 'KGM';
    freight_value?: number;
    purchase_order?: string;
    service_type?: 'AdditionalService' | 'Shipment';
  };
}

/** Expanded item returned by invoice, quotation, and credit-note reads. */
export interface SiigoInvoiceItemResponse extends Omit<SiigoInvoiceItem, 'discount' | 'taxes' | 'warehouse' | 'seller' | 'customer'> {
  id?: string;
  type?: string;
  discount?: number | SiigoDiscount;
  taxes?: SiigoTaxDetail[];
  warehouse?: number | { id?: number; name?: string };
  seller?: number | { id?: number; name?: string };
  customer?: {
    identification: string;
    branch_office?: number | string;
  };
  total?: number;
}

export interface SiigoInvoiceCustomer {
  id?: string;
  person_type?: string;
  id_type?: string;
  identification: string;
  branch_office?: number | string;
  name?: string[];
  address?: SiigoAddress;
  phones?: SiigoPhone[];
  contacts?: SiigoContact[];
}

export interface SiigoInvoiceResponseCustomer extends SiigoInvoiceCustomer {
  id?: string;
}

export interface SiigoInvoice {
  id?: string;
  document: SiigoDocumentRef & { number?: number };
  prefix?: string;
  number?: number;
  name?: string;
  date: string;
  customer: SiigoInvoiceResponseCustomer | SiigoCustomer;
  cost_center?: number;
  currency?: SiigoCurrency;
  seller: number;
  observations?: string;
  items: SiigoInvoiceItemResponse[];
  payments: SiigoPayment[];
  stamp?: SiigoElectronicStamp;
  mail?: SiigoMailStatus;
  retentions?: SiigoTaxDetail[];
  global_discounts?: SiigoGlobalDiscountResponse[];
  global_charges?: SiigoGlobalDiscountResponse[];
  additional_fields?: {
    purchase_order?: {
      prefix?: string;
      number: string;
    };
    delivery_order?: {
      prefix?: string;
      number: string;
      date?: string;
    };
  };
  healthcare_company?: SiigoHealthcareCompany;
  cargo_transportation?: SiigoCargoTransportation;
  total?: number;
  balance?: number;
  annulled?: boolean;
  metadata?: SiigoMetadata;
}

// ─── Batch Invoice ─────────────────────────────────────────────────────────

export interface SiigoBatchInvoiceItem {
  idempotency_key: string;
  document: SiigoDocumentRef;
  number?: number;
  date: string;
  customer: SiigoInvoiceCustomer | SiigoCustomer;
  cost_center?: number;
  currency?: SiigoCurrency;
  seller: number;
  items: SiigoInvoiceItem[];
  stamp?: SiigoStamp;
  mail?: SiigoMail;
  observations?: string;
  advance_payment?: number;
  payments: SiigoPayment[];
  retentions?: SiigoTaxRef[];
  global_discounts?: SiigoGlobalDiscount[];
  global_charges?: SiigoGlobalDiscount[];
  additional_fields?: SiigoInvoice['additional_fields'];
  healthcare_company?: SiigoHealthcareCompany;
}

export interface SiigoBatchInvoiceRequest {
  notification_url: string;
  invoices: SiigoBatchInvoiceItem[];
}

export interface SiigoBatchInvoiceResponse {
  id: string;
  status: string;
  received_at: string;
}

export type SiigoInvoiceMailResponse = SiigoMailStatus;

// ─── Quotations ────────────────────────────────────────────────────────────

export interface SiigoQuotationItem {
  code: string;
  description?: string;
  quantity: number;
  price: number;
  discount?: number;
  taxes?: SiigoTaxRef[];
}

/** Expanded item returned by quotation reads. */
export interface SiigoQuotationItemResponse extends Omit<SiigoQuotationItem, 'discount' | 'taxes'> {
  id?: string;
  taxed_price?: number;
  discount?: number | SiigoDiscount;
  taxes?: SiigoTaxDetail[];
  total?: number;
}

export interface SiigoQuotation {
  id?: string;
  document: SiigoDocumentRef;
  number?: number;
  name?: string;
  date: string;
  customer: SiigoInvoiceResponseCustomer | SiigoCustomer;
  cost_center?: number;
  currency?: SiigoCurrency;
  seller: number;
  observations?: string;
  items: SiigoQuotationItemResponse[];
  total?: number;
  public_url?: string;
  metadata?: SiigoMetadata;
}

// ─── Credit Notes ──────────────────────────────────────────────────────────

export interface SiigoCreditNoteCustomer extends SiigoInvoiceResponseCustomer {
  branch_office?: number | string;
}

export interface SiigoCreditNoteItem extends SiigoInvoiceItemResponse {
  id?: string;
}

export interface SiigoCreditNoteRetention extends SiigoTaxDetail {
  id: number;
}

export interface SiigoCreditNote {
  id?: string;
  document: SiigoDocumentRef;
  number?: number;
  name?: string;
  date: string;
  customer?: SiigoCreditNoteCustomer;
  cost_center?: number;
  currency?: SiigoCurrency;
  seller?: number;
  advance_payment?: number;
  items: SiigoCreditNoteItem[];
  payments: SiigoPayment[];
  retentions?: SiigoCreditNoteRetention[];
  stamp?: SiigoElectronicStamp;
  mail?: SiigoMailStatus;
  observations?: string;
  invoice?: string | { id: string; name: string };
  invoice_data?: {
    prefix?: string;
    number?: number;
    date: string;
    cufe?: string;
  };
  healthcare_company?: SiigoHealthcareCompany;
  reason?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  total?: number;
  metadata?: SiigoMetadata;
}

// ─── Vouchers (Recibos de Caja / Cash Receipts) ───────────────────────────

export interface SiigoVoucherItem {
  due?: {
    prefix: string;
    consecutive: number;
    quote: number;
    date?: string;
  };
  tax?: SiigoVoucherOutputTax;
  taxes?: SiigoVoucherOutputTax[];
  discounts?: SiigoVoucherOutputDiscount[];
  description?: string;
  value?: number;
}

export interface SiigoVoucherOutputTax {
  id: number;
  name?: string;
  type?: string;
  percentage?: number;
  base?: number;
  base_value?: number;
  value?: number;
}

export interface SiigoVoucherOutputDiscount {
  id: number;
  name?: string;
  type?: string;
  percentage?: number;
  value: number;
}

export interface SiigoVoucher {
  id?: string;
  document: SiigoDocumentRef;
  number?: number;
  name?: string;
  date: string;
  type: 'DebtPayment' | 'AdvancePayment' | 'MiscIncome';
  customer: {
    id?: string;
    identification: string;
    branch_office?: number;
  };
  income?: {
    id: number;
    name?: string;
  };
  payment?: SiigoPayment;
  cost_center?: number;
  currency?: SiigoCurrency;
  items?: SiigoVoucherItem[];
  observations?: string;
  total?: number;
  balance?: number;
  metadata?: SiigoMetadata;
}

// ─── Payment Receipts (Recibos de Pago / Comprobantes de Egreso) ───────────

export interface SiigoPaymentReceiptItem {
  account?: {
    code: string;
    movement: 'Debit' | 'Credit';
  };
  due?: {
    prefix?: string;
    consecutive?: number;
    quote?: number;
    date?: string;
  };
  tax?: SiigoPaymentReceiptOutputTax;
  taxes?: SiigoPaymentReceiptOutputTax[];
  discounts?: SiigoVoucherOutputDiscount[];
  fixed_asset?: {
    id: number;
    name?: string;
  };
  product?: {
    id?: string;
    code?: string;
    name?: string;
    warehouse?: { id: number; name?: string };
    quantity?: number;
  };
  customer?: SiigoSupplierReference;
  description?: string;
  value?: number;
  cost_center?: number;
}

export interface SiigoPaymentReceiptOutputTax {
  id: number;
  name?: string;
  type?: string;
  percentage?: number;
  base?: number;
  base_value?: number;
  value?: number;
}

export interface SiigoPaymentReceipt {
  id?: string;
  document: SiigoDocumentRef;
  number?: number;
  name?: string;
  date: string;
  type: 'DebtPayment' | 'AdvancePayment' | 'Detailed';
  supplier: {
    id?: string;
    identification: string;
    branch_office?: number;
  };
  cost_center?: number;
  currency?: SiigoCurrency;
  items?: SiigoPaymentReceiptItem[];
  payment?: SiigoPayment;
  payments?: SiigoPayment[];
  observations?: string;
  total?: number;
  balance?: number;
  metadata?: SiigoMetadata;
}

// ─── Purchases (Facturas de Compra) ────────────────────────────────────────

export interface SiigoPurchaseItem {
  id?: string;
  type?: string;
  code?: string;
  description?: string;
  quantity?: number;
  price?: number;
  total?: number;
  discount?: number | SiigoPurchaseOutputDiscount;
  taxes?: SiigoPurchaseOutputTax[];
  supplier?: number | SiigoSupplierReference;
  warehouse?: number | SiigoPurchaseOutputWarehouse;
}

export interface SiigoPurchaseOutputDiscount {
  percentage?: number;
  value?: number;
  [key: string]: unknown;
}

export interface SiigoPurchaseOutputTax {
  id: number;
  name?: string;
  type?: string;
  percentage?: number;
  base?: number;
  base_value?: number;
  value?: number;
  total?: number;
}

export interface SiigoSupplierReference {
  identification: string;
  branch_office?: number;
}

export interface SiigoPurchaseOutputWarehouse {
  id?: number;
  name?: string;
}

export interface SiigoPurchase {
  id?: string;
  document: SiigoDocumentRef;
  number?: number;
  name?: string;
  date: string;
  supplier: SiigoSupplierReference & { id?: string };
  total?: number;
  balance?: number;
  provider_invoice?: {
    prefix: string;
    number: string;
  };
  cost_center?: number;
  currency?: SiigoCurrency;
  discount_type?: 'Percentage' | 'Value';
  supplier_by_item?: boolean;
  tax_included?: boolean;
  items?: SiigoPurchaseItem[];
  payments?: SiigoPayment[];
  observations?: string;
  metadata?: SiigoMetadata;
}

// ─── Purchase Support Documents (Documento Soporte) ─────────────────────────

export interface SiigoSupplierReceiptNumber {
  prefix: string;
  number: string;
}

export interface SiigoPurchaseSupportDocumentItem {
  id?: string;
  type?: string;
  code?: string;
  description?: string;
  quantity?: number;
  price?: number;
  discount?: number | SiigoSupportDocumentOutputDiscount;
  taxes?: SiigoSupportDocumentOutputTax[];
  total?: number;
}

export interface SiigoSupportDocumentOutputDiscount {
  id?: number;
  name?: string;
  value?: number;
  percentage?: number;
}

export interface SiigoSupportDocumentOutputTax {
  id: number;
  name?: string;
  type?: string;
  percentage?: number;
  base?: number;
  base_value?: number;
  value?: number;
  total?: number;
}

export interface SiigoPurchaseSupportDocument {
  id?: string;
  document: SiigoDocumentRef;
  number?: number;
  name?: string;
  date: string;
  supplier: SiigoSupplierReference & { id?: string };
  cost_center?: number;
  supplier_receipt_number?: SiigoSupplierReceiptNumber;
  currency?: SiigoCurrency;
  observations?: string;
  discount_type?: 'Percentage' | 'Value';
  stamp?: SiigoStamp;
  retentions?: SiigoTaxRef[];
  items?: SiigoPurchaseSupportDocumentItem[];
  payments?: Array<Partial<SiigoPayment>>;
  total?: number;
  balance?: number;
  metadata?: SiigoMetadata;
}

// ─── Journals (Comprobantes Contables) ─────────────────────────────────────

export interface SiigoJournalItem {
  account: {
    code: string;
    movement: 'Debit' | 'Credit';
  };
  customer?: {
    id?: string;
    identification: string;
    branch_office?: number;
  };
  due?: {
    prefix: string;
    consecutive: number;
    quote: number;
    date?: string;
  };
  tax?: SiigoJournalOutputTax;
  fixed_asset?: {
    id: number;
    name?: string;
  };
  product?: {
    id?: string;
    code?: string;
    name?: string;
    warehouse?: { id: number; name?: string };
    quantity?: number;
  };
  description?: string;
  value?: number;
  cost_center?: number;
}

export interface SiigoJournalOutputTax {
  id: number;
  name?: string;
  type?: string;
  percentage?: number;
  value?: number;
  base_value?: number;
}

export interface SiigoJournal {
  id?: string;
  document: SiigoDocumentRef;
  number?: number;
  name?: string;
  date: string;
  currency?: SiigoCurrency;
  items: SiigoJournalItem[];
  observations?: string;
  total?: number;
  metadata?: SiigoMetadata;
}

// ─── Webhooks ──────────────────────────────────────────────────────────────

export interface SiigoWebhook {
  id: string;
  application_id: string;
  topic: string;
  url: string;
  company_key: string;
  active: boolean;
  created_at: string;
}

// ─── Fixed Assets ──────────────────────────────────────────────────────────

export interface SiigoFixedAsset {
  id: number;
  name: string;
  group: string;
  active: boolean;
}

// ─── Catalog Types ─────────────────────────────────────────────────────────

export type DocumentTypeCode = 'FV' | 'RC' | 'NC' | 'FC' | 'CC' | 'RP' | 'C' | 'DS';

export interface SiigoDocumentType {
  id: number;
  code: string;
  name: string;
  description: string;
  type: DocumentTypeCode;
  active: boolean;
  seller_by_item?: boolean;
  cost_center?: boolean;
  cost_center_mandatory?: boolean;
  cost_center_default?: number;
  automatic_number?: boolean;
  consecutive?: number;
  discount_type?: 'Percentage' | 'Value';
  decimals?: boolean;
  advance_payment?: boolean;
  reteiva?: boolean;
  reteica?: boolean;
  self_withholding?: boolean;
  self_withholding_limit?: number;
  electronic_type?: 'NoElectronic' | 'Electronicvoice' | 'ContingencyInvoice' | 'ExportInvoice' | 'Physical' | 'Electronic';
  official_book?: string;
  prefix?: string;
  global_discounts?: Array<{
    id: number;
    name: string;
    percentage: number;
    active: boolean;
  }>;
  global_charges?: Array<{
    id: number;
    name: string;
    percentage: number;
    active: boolean;
  }>;
  consumption_tax?: boolean;
  document_support?: boolean;
  cargo_transportation?: boolean;
  healthcare_company?: boolean;
  customer_by_item?: boolean;
}

export interface SiigoTax {
  id: number;
  name: string;
  type: 'IVA' | 'Retefuente' | 'ReteIVA' | 'ReteICA' | 'Impoconsumo' | 'AdValorem' | 'Autorretencion';
  percentage: number;
  active: boolean;
}

export type PaymentTypeCategory = 'Cartera' | 'Proveedor' | 'CarteraProveedor';

export interface SiigoPaymentType {
  id: number;
  name: string;
  type: PaymentTypeCategory;
  active: boolean;
  due_date: boolean;
}

export interface SiigoCostCenter {
  id: number;
  code: string;
  name: string;
  active: boolean;
}

export interface SiigoUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  active: boolean;
  identification: string;
}

export interface SiigoWarehouse {
  id: number;
  name: string;
  active: boolean;
  has_movements?: boolean;
}

export interface SiigoPriceList {
  id: number;
  name: string;
  active: boolean;
  position: number;
}

export interface SiigoCityInfo {
  CityID: string;
  CountryCode: string;
  CountryName: string;
  StateCode: string;
  StateName: string;
  CityCode: string;
  CityName: string;
}

export interface SiigoIdType {
  code: string;
  name: string;
}

export interface SiigoFiscalResponsibility {
  code: string;
  name: string;
}

export interface SiigoExpense {
  id: number;
  name: string;
}

export interface SiigoMiscIncome {
  id: number;
  name: string;
}

// ─── Reports ───────────────────────────────────────────────────────────────

export interface SiigoTrialBalanceParams {
  account_start?: string;
  account_end?: string;
  year: number;
  month_start: number;
  month_end: number;
  includes_tax_difference: boolean;
}

export interface SiigoTrialBalanceByThirdParams extends SiigoTrialBalanceParams {
  customer?: {
    identification: string;
    branch_office?: number;
  };
}

export interface SiigoReportFile {
  file_id: string;
  file_url: string;
}

export interface SiigoAccountsPayableParams extends SiigoPaginationParams {
  provider_identification?: string;
  provider_branch_office?: number;
  due_date_start?: string;
  due_date_end?: string;
  date_end?: string;
}

export interface SiigoAccountsPayableItem {
  due: {
    prefix: string;
    consecutive: number | string;
    quote: number | string;
    date: string;
    balance: number;
  };
  provider: {
    id?: string;
    identification: string | number;
    branch_office?: number;
    name: string;
  };
  cost_center?: {
    code: string | number;
    name: string;
  };
  currency?: {
    money_code: string;
    balance: number | string;
  };
}

export interface SiigoAccountsPayableResponse {
  value: SiigoListResponse<SiigoAccountsPayableItem>;
  _links?: Record<string, { href: string }>;
  __links?: Record<string, { href: string }>;
}

// ─── Invoice PDF/XML/Stamp Errors ──────────────────────────────────────────

export interface SiigoPdfResponse {
  id: string;
  base64: string;
  cufe?: string;
  cude?: string;
}

export interface SiigoXmlResponse {
  id: string;
  base64: string;
  cufe?: string;
}

export interface SiigoStampError {
  message: string;
}

export interface SiigoStampErrorsResponse {
  id: string;
  errors: SiigoStampError[];
}
