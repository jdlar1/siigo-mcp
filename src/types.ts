// ─── Configuration & Authentication ────────────────────────────────────────

export interface SiigoConfig {
  username: string;
  accessKey: string;
  baseUrl: string;
  partnerId: string;
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

export interface SiigoApiResponse<T> {
  data?: T;
  pagination?: SiigoPagination;
  results?: T[];
  _links?: Record<string, { href: string }>;
  errors?: Array<{
    Code: string;
    Message: string;
    Params?: string[];
    Detail?: string;
  }>;
  Status?: number;
}

export interface SiigoMetadata {
  created: string;
  last_updated: string | null;
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
  number: string;
  extension?: string;
}

export interface SiigoContact {
  first_name: string;
  last_name: string;
  email: string;
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
  percentage?: number;
  value?: number;
}

export interface SiigoTaxRef {
  id: number;
}

export interface SiigoTaxOut {
  id: number;
  name?: string;
  type?: 'IVA' | 'Retefuente' | 'ReteIVA' | 'ReteICA' | 'Impoconsumo' | 'AdValorem' | 'Autorretencion';
  percentage?: number;
  value?: number;
}

export interface SiigoDocumentRef {
  id: number;
}

export interface SiigoGlobalDiscount {
  id: number;
  percentage?: number;
  value?: number;
}

export interface SiigoPayment {
  id: number;
  value: number;
  due_date?: string;
}

export interface SiigoStamp {
  send: boolean;
}

export interface SiigoMail {
  send: boolean;
}

// ─── Products ──────────────────────────────────────────────────────────────

export type ProductType = 'Product' | 'Service' | 'ConsumerGood' | 'Combo';
export type TaxClassification = 'Taxed' | 'Exempt' | 'Excluded';

export interface SiigoProductComponent {
  code: string;
  quantity: number;
}

export interface SiigoProductTax {
  id: number;
  milliliters?: number;
  rate?: number;
}

export interface SiigoProductPrice {
  currency_code: string;
  price_list: Array<{
    position: number;
    value: number;
  }>;
}

export interface SiigoProduct {
  id?: string;
  code: string;
  name: string;
  account_group: number;
  type?: ProductType;
  stock_control?: boolean;
  active?: boolean;
  tax_classification?: TaxClassification;
  tax_included?: boolean;
  tax_consumption_value?: number;
  taxes?: SiigoProductTax[];
  prices?: SiigoProductPrice[];
  unit?: string;
  unit_label?: string;
  reference?: string;
  description?: string;
  additional_fields?: {
    barcode?: string;
    brand?: string;
    tariff?: string;
    model?: string;
  };
  components?: SiigoProductComponent[];
  available_quantity?: number;
  warehouses?: Array<{
    id: number;
    name?: string;
    quantity?: number;
  }>;
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
  id_type: string;
  identification: string;
  check_digit?: string;
  name: string[];
  commercial_name?: string;
  branch_office?: number;
  active?: boolean;
  vat_responsible?: boolean;
  fiscal_responsibilities?: Array<{ code: string }>;
  address: SiigoAddress;
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
  payment_method?: number;
  service_plan?: number;
  policy_number?: string;
  contract_number?: string;
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
  discount?: number;
  taxes?: SiigoTaxRef[];
  warehouse?: number;
  seller?: number;
}

export interface SiigoInvoiceCustomer {
  person_type?: string;
  id_type?: string;
  identification: string;
  branch_office?: number;
  name?: string[];
  address?: SiigoAddress;
  phones?: SiigoPhone[];
  contacts?: SiigoContact[];
}

export interface SiigoInvoice {
  id?: string;
  document: SiigoDocumentRef & { number?: number };
  number?: number;
  name?: string;
  date: string;
  customer: SiigoInvoiceCustomer;
  cost_center?: number;
  currency?: SiigoCurrency;
  seller: number;
  observations?: string;
  items: SiigoInvoiceItem[];
  payments: SiigoPayment[];
  stamp?: SiigoStamp;
  mail?: SiigoMail;
  retentions?: SiigoTaxRef[];
  global_discounts?: SiigoGlobalDiscount[];
  additional_fields?: Record<string, unknown>;
  healthcare_company?: SiigoHealthcareCompany;
  cargo_transportation?: SiigoCargoTransportation;
  total?: number;
  balance?: number;
  metadata?: SiigoMetadata;
}

// ─── Batch Invoice ─────────────────────────────────────────────────────────

export interface SiigoBatchInvoiceItem {
  idempotency_key: string;
  document: SiigoDocumentRef;
  date: string;
  customer: {
    identification: string;
    branch_office?: number;
  };
  cost_center?: number;
  seller: number;
  items: SiigoInvoiceItem[];
  stamp?: SiigoStamp;
  mail?: SiigoMail;
  observations?: string;
  payments: SiigoPayment[];
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

// ─── Quotations ────────────────────────────────────────────────────────────

export interface SiigoQuotationItem {
  code: string;
  description?: string;
  quantity: number;
  price: number;
  discount?: number;
  taxes?: SiigoTaxRef[];
}

export interface SiigoQuotation {
  id?: string;
  document: SiigoDocumentRef;
  number?: number;
  name?: string;
  date: string;
  customer: SiigoInvoiceCustomer;
  cost_center?: number;
  currency?: SiigoCurrency;
  seller: number;
  observations?: string;
  items: SiigoQuotationItem[];
  total?: number;
  public_url?: string;
  metadata?: SiigoMetadata;
}

// ─── Credit Notes ──────────────────────────────────────────────────────────

export interface SiigoCreditNote {
  id?: string;
  document: SiigoDocumentRef;
  number?: number;
  name?: string;
  date: string;
  customer: SiigoInvoiceCustomer;
  cost_center?: number;
  currency?: SiigoCurrency;
  seller?: number;
  items: SiigoInvoiceItem[];
  payments?: SiigoPayment[];
  retentions?: SiigoTaxRef[];
  stamp?: SiigoStamp;
  mail?: SiigoMail;
  observations?: string;
  invoice?: string;
  invoice_data?: {
    prefix?: string;
    number?: number;
    date?: string;
    cufe?: string;
  };
  healthcare_company?: SiigoHealthcareCompany;
  reason?: string;
  total?: number;
  metadata?: SiigoMetadata;
}

// ─── Vouchers (Recibos de Caja / Cash Receipts) ───────────────────────────

export interface SiigoVoucherItem {
  document?: SiigoDocumentRef;
  customer?: {
    identification: string;
    branch_office?: number;
  };
  payment?: {
    id: number;
    value: number;
    due_date?: string;
  };
  account?: {
    code: string;
    movement: 'Debit' | 'Credit';
  };
  description?: string;
  value?: number;
  cost_center?: number;
}

export interface SiigoVoucher {
  id?: string;
  document: SiigoDocumentRef;
  number?: number;
  name?: string;
  date: string;
  type: 'DebtPayment' | 'AdvancePayment' | 'Advanced';
  customer: {
    identification: string;
    branch_office?: number;
  };
  cost_center?: number;
  currency?: SiigoCurrency;
  items: SiigoVoucherItem[];
  payments?: SiigoPayment[];
  observations?: string;
  total?: number;
  metadata?: SiigoMetadata;
}

// ─── Payment Receipts (Recibos de Pago / Comprobantes de Egreso) ───────────

export interface SiigoPaymentReceiptItem {
  document?: SiigoDocumentRef;
  customer?: {
    identification: string;
    branch_office?: number;
  };
  payment?: {
    id: number;
    value: number;
    due_date?: string;
  };
  account?: {
    code: string;
    movement: 'Debit' | 'Credit';
  };
  description?: string;
  value?: number;
  cost_center?: number;
}

export interface SiigoPaymentReceipt {
  id?: string;
  document: SiigoDocumentRef;
  number?: number;
  name?: string;
  date: string;
  type: 'DebtPayment' | 'AdvancePayment' | 'Advanced';
  customer: {
    identification: string;
    branch_office?: number;
  };
  cost_center?: number;
  currency?: SiigoCurrency;
  items: SiigoPaymentReceiptItem[];
  payments?: SiigoPayment[];
  observations?: string;
  total?: number;
  metadata?: SiigoMetadata;
}

// ─── Purchases (Facturas de Compra) ────────────────────────────────────────

export interface SiigoPurchaseItem {
  code?: string;
  description?: string;
  quantity?: number;
  price?: number;
  discount?: number;
  taxes?: SiigoTaxRef[];
  account?: {
    code: string;
    movement: 'Debit' | 'Credit';
  };
  warehouse?: number;
}

export interface SiigoPurchase {
  id?: string;
  document: SiigoDocumentRef;
  number?: number;
  name?: string;
  date: string;
  customer: SiigoInvoiceCustomer;
  cost_center?: number;
  currency?: SiigoCurrency;
  seller?: number;
  items: SiigoPurchaseItem[];
  payments?: SiigoPayment[];
  retentions?: SiigoTaxRef[];
  stamp?: SiigoStamp;
  mail?: SiigoMail;
  observations?: string;
  total?: number;
  metadata?: SiigoMetadata;
}

// ─── Journals (Comprobantes Contables) ─────────────────────────────────────

export interface SiigoJournalItem {
  account: {
    code: string;
    movement: 'Debit' | 'Credit';
  };
  customer?: {
    identification: string;
    branch_office?: number;
  };
  description?: string;
  value: number;
  cost_center?: number;
}

export interface SiigoJournal {
  id?: string;
  document: SiigoDocumentRef;
  number?: number;
  name?: string;
  date: string;
  items: SiigoJournalItem[];
  observations?: string;
  total?: number;
  metadata?: SiigoMetadata;
}

// ─── Webhooks ──────────────────────────────────────────────────────────────

export interface SiigoWebhook {
  id?: string;
  event?: string;
  url: string;
  secret?: string;
  active?: boolean;
  created?: string;
}

// ─── Fixed Assets ──────────────────────────────────────────────────────────

export interface SiigoFixedAsset {
  id: number;
  name: string;
  group: string;
  active: boolean;
}

// ─── Catalog Types ─────────────────────────────────────────────────────────

export type DocumentTypeCode = 'FV' | 'RC' | 'NC' | 'FC' | 'CC' | 'RP' | 'C';

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
  electronic_type?: 'NoElectronic' | 'Electronicvoice' | 'ContingencyInvoice' | 'ExportInvoice';
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

// ─── Invoice PDF/XML/Stamp Errors ──────────────────────────────────────────

export interface SiigoPdfResponse {
  id: string;
  base64: string;
}

export interface SiigoXmlResponse {
  id: string;
  base64: string;
}

export interface SiigoStampError {
  message: string;
}

export interface SiigoStampErrorsResponse {
  id: string;
  errors: SiigoStampError[];
}
