import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  SiigoConfig,
  SiigoToken,
  SiigoCustomer,
  SiigoProduct,
  SiigoInvoice,
  SiigoApiResponse,
  SiigoQuotation,
  SiigoCreditNote,
  SiigoVoucher,
  SiigoPaymentReceipt,
  SiigoPurchase,
  SiigoJournal,
  SiigoAccountGroupIn,
  SiigoAccountGroup,
  SiigoBatchInvoiceRequest,
  SiigoBatchInvoiceResponse,
  SiigoWebhook,
  SiigoTrialBalanceParams,
  SiigoTrialBalanceByThirdParams,
  SiigoPdfResponse,
  SiigoXmlResponse,
  SiigoStampErrorsResponse,
  SiigoFixedAsset,
} from './types.js';

export class SiigoClient {
  private config: SiigoConfig;
  private httpClient: AxiosInstance;
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: SiigoConfig) {
    this.config = config;
    this.httpClient = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Partner-Id': config.partnerId,
      },
      timeout: 120000, // 120s as recommended by Siigo API docs
    });
  }

  private async authenticate(): Promise<void> {
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return;
    }

    try {
      const response: AxiosResponse<SiigoToken> = await this.httpClient.post('/auth', {
        username: this.config.username,
        access_key: this.config.accessKey,
      });

      this.token = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));

      this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
    } catch (error) {
      throw new Error(`Authentication failed: ${error}`);
    }
  }

  private async makeRequest<T>(
    method: string,
    endpoint: string,
    data?: unknown,
    params?: Record<string, unknown>,
    headers?: Record<string, string>,
  ): Promise<SiigoApiResponse<T>> {
    await this.authenticate();

    try {
      const response: AxiosResponse<SiigoApiResponse<T>> = await this.httpClient.request({
        method,
        url: endpoint,
        data,
        params,
        headers,
      });

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.data) {
        return error.response.data;
      }
      throw new Error(`API request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ─── Products ──────────────────────────────────────────────────────────

  async getProducts(params?: { page?: number; page_size?: number }): Promise<SiigoApiResponse<SiigoProduct>> {
    return this.makeRequest<SiigoProduct>('GET', '/v1/products', undefined, params as Record<string, unknown>);
  }

  async getProduct(id: string): Promise<SiigoApiResponse<SiigoProduct>> {
    return this.makeRequest<SiigoProduct>('GET', `/v1/products/${id}`);
  }

  async createProduct(product: Partial<SiigoProduct>): Promise<SiigoApiResponse<SiigoProduct>> {
    return this.makeRequest<SiigoProduct>('POST', '/v1/products', product);
  }

  async updateProduct(id: string, product: Partial<SiigoProduct>): Promise<SiigoApiResponse<SiigoProduct>> {
    return this.makeRequest<SiigoProduct>('PUT', `/v1/products/${id}`, product);
  }

  async deleteProduct(id: string): Promise<SiigoApiResponse<unknown>> {
    return this.makeRequest<unknown>('DELETE', `/v1/products/${id}`);
  }

  async searchProducts(searchParams: {
    code?: string;
    name?: string;
    reference?: string;
    page?: number;
    page_size?: number;
  }): Promise<SiigoApiResponse<SiigoProduct>> {
    const params: Record<string, unknown> = {};

    if (searchParams.page) params.page = searchParams.page;
    if (searchParams.page_size) params.page_size = searchParams.page_size;

    const response = await this.makeRequest<SiigoProduct>('GET', '/v1/products', undefined, params);

    if (!searchParams.code && !searchParams.name && !searchParams.reference) {
      return response;
    }

    if (response.results) {
      let filteredResults = response.results;

      if (searchParams.code) {
        const searchCode = searchParams.code.toLowerCase();
        filteredResults = filteredResults.filter(product =>
          product.code?.toLowerCase().includes(searchCode),
        );
      }

      if (searchParams.name) {
        const searchName = searchParams.name.toLowerCase();
        filteredResults = filteredResults.filter(product =>
          product.name?.toLowerCase().includes(searchName),
        );
      }

      if (searchParams.reference) {
        const searchRef = searchParams.reference.toLowerCase();
        filteredResults = filteredResults.filter(product =>
          product.reference?.toLowerCase().includes(searchRef),
        );
      }

      return {
        ...response,
        results: filteredResults,
        pagination: response.pagination
          ? { ...response.pagination, total_results: filteredResults.length }
          : undefined,
      };
    }

    return response;
  }

  // ─── Account Groups (Inventory Categories) ─────────────────────────────

  async getAccountGroups(): Promise<SiigoApiResponse<SiigoAccountGroup>> {
    return this.makeRequest<SiigoAccountGroup>('GET', '/v1/account-groups');
  }

  async createAccountGroup(data: SiigoAccountGroupIn): Promise<SiigoApiResponse<SiigoAccountGroup>> {
    return this.makeRequest<SiigoAccountGroup>('POST', '/v1/account-groups', data);
  }

  async updateAccountGroup(id: number, data: SiigoAccountGroupIn): Promise<SiigoApiResponse<SiigoAccountGroup>> {
    return this.makeRequest<SiigoAccountGroup>('PUT', `/v1/account-groups/${id}`, data);
  }

  // ─── Customers ─────────────────────────────────────────────────────────

  async getCustomers(params?: { page?: number; page_size?: number; type?: string }): Promise<SiigoApiResponse<SiigoCustomer>> {
    return this.makeRequest<SiigoCustomer>('GET', '/v1/customers', undefined, params as Record<string, unknown>);
  }

  async getCustomer(id: string): Promise<SiigoApiResponse<SiigoCustomer>> {
    return this.makeRequest<SiigoCustomer>('GET', `/v1/customers/${id}`);
  }

  async createCustomer(customer: Partial<SiigoCustomer>): Promise<SiigoApiResponse<SiigoCustomer>> {
    return this.makeRequest<SiigoCustomer>('POST', '/v1/customers', customer);
  }

  async updateCustomer(id: string, customer: Partial<SiigoCustomer>): Promise<SiigoApiResponse<SiigoCustomer>> {
    return this.makeRequest<SiigoCustomer>('PUT', `/v1/customers/${id}`, customer);
  }

  async searchCustomers(searchParams: {
    identification?: string;
    name?: string;
    type?: 'Customer' | 'Supplier' | 'Other';
    page?: number;
    page_size?: number;
  }): Promise<SiigoApiResponse<SiigoCustomer>> {
    const params: Record<string, unknown> = {};

    if (searchParams.page) params.page = searchParams.page;
    if (searchParams.page_size) params.page_size = searchParams.page_size;
    if (searchParams.type) params.type = searchParams.type;

    const response = await this.makeRequest<SiigoCustomer>('GET', '/v1/customers', undefined, params);

    if (!searchParams.identification && !searchParams.name) {
      return response;
    }

    if (response.results) {
      let filteredResults = response.results;

      if (searchParams.identification) {
        const searchId = searchParams.identification.toLowerCase();
        filteredResults = filteredResults.filter(customer =>
          customer.identification?.toLowerCase().includes(searchId),
        );
      }

      if (searchParams.name) {
        const searchName = searchParams.name.toLowerCase();
        filteredResults = filteredResults.filter(customer => {
          if (customer.name) {
            return customer.name.some(nameElement =>
              nameElement.toLowerCase().includes(searchName),
            );
          }
          if (customer.commercial_name) {
            return customer.commercial_name.toLowerCase().includes(searchName);
          }
          return false;
        });
      }

      return {
        ...response,
        results: filteredResults,
        pagination: response.pagination
          ? { ...response.pagination, total_results: filteredResults.length }
          : undefined,
      };
    }

    return response;
  }

  // ─── Invoices ──────────────────────────────────────────────────────────

  async getInvoices(params?: {
    page?: number;
    page_size?: number;
    created_start?: string;
    created_end?: string;
  }): Promise<SiigoApiResponse<SiigoInvoice>> {
    return this.makeRequest<SiigoInvoice>('GET', '/v1/invoices', undefined, params as Record<string, unknown>);
  }

  async getInvoice(id: string): Promise<SiigoApiResponse<SiigoInvoice>> {
    return this.makeRequest<SiigoInvoice>('GET', `/v1/invoices/${id}`);
  }

  async createInvoice(invoice: Partial<SiigoInvoice>): Promise<SiigoApiResponse<SiigoInvoice>> {
    return this.makeRequest<SiigoInvoice>('POST', '/v1/invoices', invoice);
  }

  async updateInvoice(id: string, invoice: Partial<SiigoInvoice>): Promise<SiigoApiResponse<SiigoInvoice>> {
    return this.makeRequest<SiigoInvoice>('PUT', `/v1/invoices/${id}`, invoice);
  }

  async deleteInvoice(id: string): Promise<SiigoApiResponse<unknown>> {
    return this.makeRequest<unknown>('DELETE', `/v1/invoices/${id}`);
  }

  async annulInvoice(id: string): Promise<SiigoApiResponse<unknown>> {
    return this.makeRequest<unknown>('POST', `/v1/invoices/${id}/annul`);
  }

  async getInvoicePdf(id: string): Promise<SiigoApiResponse<SiigoPdfResponse>> {
    return this.makeRequest<SiigoPdfResponse>('GET', `/v1/invoices/${id}/pdf`);
  }

  async getInvoiceXml(id: string): Promise<SiigoApiResponse<SiigoXmlResponse>> {
    return this.makeRequest<SiigoXmlResponse>('GET', `/v1/invoices/${id}/xml`);
  }

  async getInvoiceStampErrors(id: string): Promise<SiigoApiResponse<SiigoStampErrorsResponse>> {
    return this.makeRequest<SiigoStampErrorsResponse>('GET', `/v1/invoices/${id}/stamp/errors`);
  }

  async sendInvoiceByEmail(id: string, emailData: { mail_to: string; copy_to?: string }): Promise<SiigoApiResponse<unknown>> {
    return this.makeRequest<unknown>('POST', `/v1/invoices/${id}/mail`, emailData);
  }

  async createInvoiceBatch(batch: SiigoBatchInvoiceRequest): Promise<SiigoApiResponse<SiigoBatchInvoiceResponse>> {
    return this.makeRequest<SiigoBatchInvoiceResponse>('POST', '/v1/invoices/batch', batch);
  }

  // ─── Quotations ────────────────────────────────────────────────────────

  async getQuotations(params?: {
    page?: number;
    page_size?: number;
    created_start?: string;
    created_end?: string;
  }): Promise<SiigoApiResponse<SiigoQuotation>> {
    return this.makeRequest<SiigoQuotation>('GET', '/v1/quotations', undefined, params as Record<string, unknown>);
  }

  async getQuotation(id: string): Promise<SiigoApiResponse<SiigoQuotation>> {
    return this.makeRequest<SiigoQuotation>('GET', `/v1/quotations/${id}`);
  }

  async createQuotation(quotation: Partial<SiigoQuotation>): Promise<SiigoApiResponse<SiigoQuotation>> {
    return this.makeRequest<SiigoQuotation>('POST', '/v1/quotations', quotation);
  }

  async updateQuotation(id: string, quotation: Partial<SiigoQuotation>): Promise<SiigoApiResponse<SiigoQuotation>> {
    return this.makeRequest<SiigoQuotation>('PUT', `/v1/quotations/${id}`, quotation);
  }

  async deleteQuotation(id: string): Promise<SiigoApiResponse<unknown>> {
    return this.makeRequest<unknown>('DELETE', `/v1/quotations/${id}`);
  }

  // ─── Credit Notes ──────────────────────────────────────────────────────

  async getCreditNotes(params?: { page?: number; page_size?: number }): Promise<SiigoApiResponse<SiigoCreditNote>> {
    return this.makeRequest<SiigoCreditNote>('GET', '/v1/credit-notes', undefined, params as Record<string, unknown>);
  }

  async getCreditNote(id: string): Promise<SiigoApiResponse<SiigoCreditNote>> {
    return this.makeRequest<SiigoCreditNote>('GET', `/v1/credit-notes/${id}`);
  }

  async createCreditNote(creditNote: Partial<SiigoCreditNote>): Promise<SiigoApiResponse<SiigoCreditNote>> {
    return this.makeRequest<SiigoCreditNote>('POST', '/v1/credit-notes', creditNote);
  }

  async getCreditNotePdf(id: string): Promise<SiigoApiResponse<SiigoPdfResponse>> {
    return this.makeRequest<SiigoPdfResponse>('GET', `/v1/credit-notes/${id}/pdf`);
  }

  // ─── Vouchers (Recibos de Caja) ────────────────────────────────────────

  async getVouchers(params?: { page?: number; page_size?: number }): Promise<SiigoApiResponse<SiigoVoucher>> {
    return this.makeRequest<SiigoVoucher>('GET', '/v1/vouchers', undefined, params as Record<string, unknown>);
  }

  async getVoucher(id: string): Promise<SiigoApiResponse<SiigoVoucher>> {
    return this.makeRequest<SiigoVoucher>('GET', `/v1/vouchers/${id}`);
  }

  async createVoucher(voucher: Partial<SiigoVoucher>): Promise<SiigoApiResponse<SiigoVoucher>> {
    return this.makeRequest<SiigoVoucher>('POST', '/v1/vouchers', voucher);
  }

  // ─── Purchases (Facturas de Compra) ────────────────────────────────────

  async getPurchases(params?: { page?: number; page_size?: number }): Promise<SiigoApiResponse<SiigoPurchase>> {
    return this.makeRequest<SiigoPurchase>('GET', '/v1/purchases', undefined, params as Record<string, unknown>);
  }

  async getPurchase(id: string): Promise<SiigoApiResponse<SiigoPurchase>> {
    return this.makeRequest<SiigoPurchase>('GET', `/v1/purchases/${id}`);
  }

  async createPurchase(purchase: Partial<SiigoPurchase>): Promise<SiigoApiResponse<SiigoPurchase>> {
    return this.makeRequest<SiigoPurchase>('POST', '/v1/purchases', purchase);
  }

  async updatePurchase(id: string, purchase: Partial<SiigoPurchase>): Promise<SiigoApiResponse<SiigoPurchase>> {
    return this.makeRequest<SiigoPurchase>('PUT', `/v1/purchases/${id}`, purchase);
  }

  async deletePurchase(id: string): Promise<SiigoApiResponse<unknown>> {
    return this.makeRequest<unknown>('DELETE', `/v1/purchases/${id}`);
  }

  // ─── Payment Receipts (Recibos de Pago / Egreso) ──────────────────────

  async getPaymentReceipts(params?: { page?: number; page_size?: number }): Promise<SiigoApiResponse<SiigoPaymentReceipt>> {
    return this.makeRequest<SiigoPaymentReceipt>('GET', '/v1/payment-receipts', undefined, params as Record<string, unknown>);
  }

  async getPaymentReceipt(id: string): Promise<SiigoApiResponse<SiigoPaymentReceipt>> {
    return this.makeRequest<SiigoPaymentReceipt>('GET', `/v1/payment-receipts/${id}`);
  }

  async createPaymentReceipt(paymentReceipt: Partial<SiigoPaymentReceipt>): Promise<SiigoApiResponse<SiigoPaymentReceipt>> {
    return this.makeRequest<SiigoPaymentReceipt>('POST', '/v1/payment-receipts', paymentReceipt);
  }

  async updatePaymentReceipt(id: string, paymentReceipt: Partial<SiigoPaymentReceipt>): Promise<SiigoApiResponse<SiigoPaymentReceipt>> {
    return this.makeRequest<SiigoPaymentReceipt>('PUT', `/v1/payment-receipts/${id}`, paymentReceipt);
  }

  async deletePaymentReceipt(id: string): Promise<SiigoApiResponse<unknown>> {
    return this.makeRequest<unknown>('DELETE', `/v1/payment-receipts/${id}`);
  }

  // ─── Journals (Comprobantes Contables) ─────────────────────────────────

  async getJournals(params?: { page?: number; page_size?: number }): Promise<SiigoApiResponse<SiigoJournal>> {
    return this.makeRequest<SiigoJournal>('GET', '/v1/journals', undefined, params as Record<string, unknown>);
  }

  async getJournal(id: string): Promise<SiigoApiResponse<SiigoJournal>> {
    return this.makeRequest<SiigoJournal>('GET', `/v1/journals/${id}`);
  }

  async createJournal(journal: Partial<SiigoJournal>): Promise<SiigoApiResponse<SiigoJournal>> {
    return this.makeRequest<SiigoJournal>('POST', '/v1/journals', journal);
  }

  // ─── Webhooks ──────────────────────────────────────────────────────────

  async getWebhooks(): Promise<SiigoApiResponse<SiigoWebhook>> {
    return this.makeRequest<SiigoWebhook>('GET', '/v1/webhooks');
  }

  async createWebhook(webhook: Partial<SiigoWebhook>): Promise<SiigoApiResponse<SiigoWebhook>> {
    return this.makeRequest<SiigoWebhook>('POST', '/v1/webhooks', webhook);
  }

  async updateWebhook(webhook: Partial<SiigoWebhook>): Promise<SiigoApiResponse<SiigoWebhook>> {
    return this.makeRequest<SiigoWebhook>('PUT', '/v1/webhooks', webhook);
  }

  async deleteWebhook(id: string): Promise<SiigoApiResponse<unknown>> {
    return this.makeRequest<unknown>('DELETE', `/v1/webhooks/${id}`);
  }

  // ─── Catalogs ──────────────────────────────────────────────────────────

  async getDocumentTypes(type?: string): Promise<SiigoApiResponse<unknown>> {
    return this.makeRequest<unknown>('GET', '/v1/document-types', undefined, type ? { type } : undefined);
  }

  async getTaxes(): Promise<SiigoApiResponse<unknown>> {
    return this.makeRequest<unknown>('GET', '/v1/taxes');
  }

  async getPaymentTypes(documentType?: string): Promise<SiigoApiResponse<unknown>> {
    return this.makeRequest<unknown>('GET', '/v1/payment-types', undefined, documentType ? { document_type: documentType } : undefined);
  }

  async getCostCenters(): Promise<SiigoApiResponse<unknown>> {
    return this.makeRequest<unknown>('GET', '/v1/cost-centers');
  }

  async getUsers(): Promise<SiigoApiResponse<unknown>> {
    return this.makeRequest<unknown>('GET', '/v1/users');
  }

  async getWarehouses(): Promise<SiigoApiResponse<unknown>> {
    return this.makeRequest<unknown>('GET', '/v1/warehouses');
  }

  async getPriceLists(): Promise<SiigoApiResponse<unknown>> {
    return this.makeRequest<unknown>('GET', '/v1/price-lists');
  }

  async getCities(): Promise<SiigoApiResponse<unknown>> {
    return this.makeRequest<unknown>('GET', '/v1/cities');
  }

  async getIdTypes(): Promise<SiigoApiResponse<unknown>> {
    return this.makeRequest<unknown>('GET', '/v1/id-types');
  }

  async getFiscalResponsibilities(): Promise<SiigoApiResponse<unknown>> {
    return this.makeRequest<unknown>('GET', '/v1/fiscal-responsibilities');
  }

  async getFixedAssets(): Promise<SiigoApiResponse<SiigoFixedAsset>> {
    return this.makeRequest<SiigoFixedAsset>('GET', '/v1/fixed-assets');
  }

  // ─── Reports ───────────────────────────────────────────────────────────

  async getTrialBalance(params: SiigoTrialBalanceParams): Promise<SiigoApiResponse<unknown>> {
    return this.makeRequest<unknown>('POST', '/v1/test-balance-report', params);
  }

  async getTrialBalanceByThird(params: SiigoTrialBalanceByThirdParams): Promise<SiigoApiResponse<unknown>> {
    return this.makeRequest<unknown>('POST', '/v1/test-balance-report-by-thirdparty', params);
  }

  async getAccountsPayable(params?: { page?: number; page_size?: number }): Promise<SiigoApiResponse<unknown>> {
    return this.makeRequest<unknown>('GET', '/v1/accounts-payable', undefined, params as Record<string, unknown>);
  }
}
