import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type Method } from 'axios';
import type {
  SiigoAccountsPayableQuery,
  SiigoCreditNoteInput,
  SiigoCreditNoteListQuery,
  SiigoCustomerInput,
  SiigoCustomerListQuery,
  SiigoCustomerSearch,
  SiigoInvoiceBatchInput,
  SiigoInvoiceInput,
  SiigoInvoiceListQuery,
  SiigoInvoiceMailInput,
  SiigoJournalInput,
  SiigoJournalListQuery,
  SiigoMiscIncomeVoucherInput,
  SiigoPaymentReceiptInput,
  SiigoPaymentReceiptListQuery,
  SiigoPaymentReceiptUpdateInput,
  SiigoProductInput,
  SiigoProductListQuery,
  SiigoProductSearch,
  SiigoPurchaseInput,
  SiigoPurchaseListQuery,
  SiigoPurchaseUpdateInput,
  SiigoQuotationInput,
  SiigoQuotationListQuery,
  SiigoSupportDocumentInput,
  SiigoSupportDocumentUpdateInput,
  SiigoTrialBalanceByThirdInput,
  SiigoTrialBalanceInput,
  SiigoVoucherInput,
  SiigoVoucherListQuery,
  SiigoWebhookInput,
  SiigoWebhookListQuery,
  SiigoWebhookUpdateInput,
} from './contracts.js';
import type {
  SiigoAccountGroup,
  SiigoAccountGroupIn,
  SiigoAccountsPayableResponse,
  SiigoBatchInvoiceResponse,
  SiigoConfig,
  SiigoCostCenter,
  SiigoCreditNote,
  SiigoCustomer,
  SiigoDeleteResponse,
  SiigoDocumentType,
  SiigoExpense,
  SiigoFixedAsset,
  SiigoInvoice,
  SiigoInvoiceMailResponse,
  SiigoJournal,
  SiigoListResponse,
  SiigoMiscIncome,
  SiigoPaymentReceipt,
  SiigoPaymentType,
  SiigoPdfResponse,
  SiigoPriceList,
  SiigoProduct,
  SiigoPurchase,
  SiigoPurchaseSupportDocument,
  SiigoQuotation,
  SiigoReportFile,
  SiigoRequestOptions,
  SiigoStampErrorsResponse,
  SiigoTax,
  SiigoToken,
  SiigoUser,
  SiigoVoucher,
  SiigoWarehouse,
  SiigoWebhook,
  SiigoXmlResponse,
} from './types.js';

export class SiigoApiError<T = unknown> extends Error {
  constructor(
    message: string,
    public readonly response?: T,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'SiigoApiError';
  }
}

/** Siigo's documented production request budget per rolling minute. */
export const DEFAULT_REQUESTS_PER_MINUTE = 100;
/** Do not allow a local setting to exceed Siigo's documented production budget. */
export const MAX_REQUESTS_PER_MINUTE = 100;

export function validateRequestsPerMinute(value: number | undefined): number {
  if (value === undefined) {
    return DEFAULT_REQUESTS_PER_MINUTE;
  }

  if (!Number.isInteger(value) || value < 1 || value > MAX_REQUESTS_PER_MINUTE) {
    throw new Error(`requestsPerMinute must be an integer between 1 and ${MAX_REQUESTS_PER_MINUTE}`);
  }

  return value;
}

export class SiigoClient {
  private readonly config: SiigoConfig;
  private readonly httpClient: AxiosInstance;
  private readonly requestsPerMinute: number;
  private token: string | null = null;
  private tokenExpiry: Date | null = null;
  private authenticationPromise: Promise<void> | null = null;
  private authenticationAbortController: AbortController | null = null;
  private authenticationWaiters = 0;
  private readonly requestTimestamps: number[] = [];
  private rateLimitTail: Promise<void> = Promise.resolve();

  constructor(config: SiigoConfig) {
    this.config = config;
    this.requestsPerMinute = validateRequestsPerMinute(config.requestsPerMinute);
    this.httpClient = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Partner-Id': config.partnerId,
      },
      timeout: 120000, // 120s as recommended by Siigo API docs
    });
  }

  private async authenticate(force = false, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      throw this.abortError();
    }

    const refreshBefore = Date.now() + 60_000;

    if (!force && this.token && this.tokenExpiry && this.tokenExpiry.getTime() > refreshBefore) {
      return;
    }

    if (!this.authenticationPromise) {
      const controller = new AbortController();
      const authenticationPromise = this.performAuthentication(controller.signal).finally(() => {
        if (this.authenticationPromise === authenticationPromise) {
          this.authenticationPromise = null;
          this.authenticationAbortController = null;
        }
      });

      this.authenticationAbortController = controller;
      this.authenticationPromise = authenticationPromise;
    }

    const authenticationPromise = this.authenticationPromise;
    this.authenticationWaiters += 1;

    try {
      await this.awaitWithAbort(authenticationPromise, signal);
    } finally {
      this.authenticationWaiters -= 1;

      if (signal?.aborted && this.authenticationWaiters === 0 && this.authenticationPromise === authenticationPromise) {
        const controller = this.authenticationAbortController;
        this.authenticationPromise = null;
        this.authenticationAbortController = null;
        controller?.abort();
      }
    }
  }

  private async performAuthentication(signal: AbortSignal): Promise<void> {
    try {
      const response: AxiosResponse<SiigoToken> = await this.httpClient.post(
        '/auth',
        {
          username: this.config.username,
          access_key: this.config.accessKey,
        },
        { signal },
      );

      this.token = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);

      this.httpClient.defaults.headers.common.Authorization = `Bearer ${this.token}`;
    } catch (error: unknown) {
      if (signal.aborted) {
        throw this.abortError();
      }

      if (axios.isAxiosError(error)) {
        throw new SiigoApiError(
          `Authentication failed: ${this.getErrorMessage(error.response?.data, error.message)}`,
          error.response?.data,
          error.response?.status,
        );
      }

      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private getErrorMessage(responseData: unknown, fallback = 'Unknown API error'): string {
    if (!responseData || typeof responseData !== 'object') {
      return fallback;
    }

    const candidate = responseData as {
      Errors?: Array<{ Message?: string; message?: string }>;
      errors?: Array<{ Message?: string; message?: string }>;
    };
    const firstError = candidate.Errors?.[0] ?? candidate.errors?.[0];

    if (firstError?.Message ?? firstError?.message) {
      return firstError.Message ?? firstError.message ?? fallback;
    }

    return fallback;
  }

  private async waitForRateLimit(signal?: AbortSignal): Promise<void> {
    let releaseTurn: () => void = () => undefined;
    const previousTurn = this.rateLimitTail;
    this.rateLimitTail = new Promise<void>((resolve) => {
      releaseTurn = resolve;
    });

    try {
      await this.awaitWithAbort(previousTurn, signal);
    } catch (error: unknown) {
      // Keep later callers ordered behind the active slot even though this
      // canceled caller can return immediately.
      void previousTurn.then(releaseTurn);
      throw error;
    }

    try {
      if (signal?.aborted) {
        throw this.abortError();
      }

      const oneMinuteAgo = Date.now() - 60_000;
      while (this.requestTimestamps.length > 0 && (this.requestTimestamps[0] ?? 0) <= oneMinuteAgo) {
        this.requestTimestamps.shift();
      }

      if (this.requestTimestamps.length >= this.requestsPerMinute) {
        const oldestRequest = this.requestTimestamps[0] ?? Date.now();
        await this.delay(Math.max(0, oldestRequest + 60_000 - Date.now()), signal);
        this.requestTimestamps.shift();
      }

      this.requestTimestamps.push(Date.now());
    } finally {
      releaseTurn();
    }
  }

  private abortError(): Error {
    const error = new Error('Request aborted');
    error.name = 'AbortError';
    return error;
  }

  private async awaitWithAbort(promise: Promise<void>, signal?: AbortSignal): Promise<void> {
    if (!signal) {
      await promise;
      return;
    }

    if (signal.aborted) {
      throw this.abortError();
    }

    await new Promise<void>((resolve, reject) => {
      const onAbort = () => reject(this.abortError());
      signal.addEventListener('abort', onAbort, { once: true });

      promise.then(
        () => {
          signal.removeEventListener('abort', onAbort);
          resolve();
        },
        (error: unknown) => {
          signal.removeEventListener('abort', onAbort);
          reject(error);
        },
      );
    });
  }

  private async delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      throw this.abortError();
    }

    if (milliseconds <= 0) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        clearTimeout(timeout);
        reject(this.abortError());
      };
      const timeout = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      }, milliseconds);

      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  private retryDelay(error: unknown, retryNumber: number): number {
    if (axios.isAxiosError(error)) {
      const retryAfter = error.response?.headers?.['retry-after'];

      if (typeof retryAfter === 'string') {
        const seconds = Number(retryAfter);
        if (Number.isFinite(seconds)) {
          return Math.max(0, seconds * 1000);
        }

        const retryDate = Date.parse(retryAfter);
        if (!Number.isNaN(retryDate)) {
          return Math.max(0, retryDate - Date.now());
        }
      }
    }

    return 500 * 2 ** retryNumber;
  }

  private async fetchAllPages<T>(
    endpoint: string,
    params?: Record<string, unknown>,
    options?: SiigoRequestOptions,
  ): Promise<SiigoListResponse<T>> {
    const firstPage = await this.makeRequest<SiigoListResponse<T>>('GET', endpoint, undefined, params, options);

    if (!firstPage.results.length) {
      return firstPage;
    }

    const currentPage = firstPage.pagination.page || 1;
    const pageSize = firstPage.pagination.page_size || firstPage.results.length;
    const totalResults = firstPage.pagination.total_results || firstPage.results.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));

    if (currentPage >= totalPages) {
      return firstPage;
    }

    const allResults = [...firstPage.results];

    for (let page = currentPage + 1; page <= totalPages; page += 1) {
      const nextPage = await this.makeRequest<SiigoListResponse<T>>(
        'GET',
        endpoint,
        undefined,
        {
          ...params,
          page,
          page_size: pageSize,
        },
        options,
      );

      if (!nextPage.results?.length) {
        break;
      }

      allResults.push(...nextPage.results);
    }

    return {
      ...firstPage,
      results: allResults,
      pagination: {
        page: 1,
        page_size: allResults.length,
        total_results: allResults.length,
      },
    };
  }

  private async makeRequest<T>(
    method: Method,
    endpoint: string,
    data?: unknown,
    params?: Record<string, unknown>,
    options?: SiigoRequestOptions,
  ): Promise<T> {
    if (options?.signal?.aborted) {
      throw this.abortError();
    }

    await this.authenticate(false, options?.signal);

    let authenticationRetried = false;
    let transientRetries = 0;

    while (true) {
      await this.waitForRateLimit(options?.signal);

      const requestConfig: AxiosRequestConfig<unknown> = {
        method,
        url: endpoint,
      };

      if (data !== undefined) {
        requestConfig.data = data;
      }
      if (params !== undefined) {
        requestConfig.params = params;
      }
      if (options?.signal !== undefined) {
        requestConfig.signal = options.signal;
      }
      if (options?.idempotencyKey !== undefined) {
        requestConfig.headers = { 'Idempotency-Key': options.idempotencyKey };
      }

      try {
        const response: AxiosResponse<T> = await this.httpClient.request(requestConfig);

        return response.data;
      } catch (error: unknown) {
        if (options?.signal?.aborted) {
          throw this.abortError();
        }

        if (axios.isAxiosError(error) && error.response?.status === 401 && !authenticationRetried) {
          authenticationRetried = true;
          this.token = null;
          this.tokenExpiry = null;
          await this.authenticate(true, options?.signal);
          continue;
        }

        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        const normalizedMethod = method.toUpperCase();
        const retryableMethod = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'].includes(normalizedMethod) || Boolean(options?.idempotencyKey);

        if (retryableMethod && status !== undefined && [429, 503, 504].includes(status) && transientRetries < 2) {
          await this.delay(this.retryDelay(error, transientRetries), options?.signal);
          transientRetries += 1;
          continue;
        }

        if (axios.isAxiosError(error) && error.response?.data) {
          throw new SiigoApiError(this.getErrorMessage(error.response.data, error.message), error.response.data, error.response.status);
        }
        throw new Error(`API request failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private encodeId(id: string): string {
    if (!id) {
      throw new Error('Resource id is required');
    }

    return encodeURIComponent(id);
  }

  private queryParams(params: object | undefined): Record<string, unknown> | undefined {
    return params ? { ...params } : undefined;
  }

  // ─── Products ──────────────────────────────────────────────────────────

  async getProducts(params?: SiigoProductListQuery, options?: SiigoRequestOptions): Promise<SiigoListResponse<SiigoProduct>> {
    return this.makeRequest<SiigoListResponse<SiigoProduct>>('GET', '/v1/products', undefined, this.queryParams(params), options);
  }

  async getProduct(id: string, options?: SiigoRequestOptions): Promise<SiigoProduct> {
    return this.makeRequest<SiigoProduct>('GET', `/v1/products/${this.encodeId(id)}`, undefined, undefined, options);
  }

  async createProduct(product: SiigoProductInput, options?: SiigoRequestOptions): Promise<SiigoProduct> {
    return this.makeRequest<SiigoProduct>('POST', '/v1/products', product, undefined, options);
  }

  async updateProduct(id: string, product: SiigoProductInput, options?: SiigoRequestOptions): Promise<SiigoProduct> {
    return this.makeRequest<SiigoProduct>('PUT', `/v1/products/${this.encodeId(id)}`, product, undefined, options);
  }

  async deleteProduct(id: string, options?: SiigoRequestOptions): Promise<SiigoDeleteResponse> {
    return this.makeRequest<SiigoDeleteResponse>('DELETE', `/v1/products/${this.encodeId(id)}`, undefined, undefined, options);
  }

  async searchProducts(searchParams: SiigoProductSearch, options?: SiigoRequestOptions): Promise<SiigoListResponse<SiigoProduct>> {
    const params: Record<string, unknown> = {
      page: searchParams.page ?? 1,
      page_size: searchParams.page_size ?? 100,
    };

    const response = await this.fetchAllPages<SiigoProduct>('/v1/products', params, options);

    if (!searchParams.code && !searchParams.name && !searchParams.reference) {
      return response;
    }

    let filteredResults = response.results;

    if (searchParams.code) {
      const searchCode = searchParams.code.toLowerCase();
      filteredResults = filteredResults.filter((product) => product.code?.toLowerCase().includes(searchCode));
    }

    if (searchParams.name) {
      const searchName = searchParams.name.toLowerCase();
      filteredResults = filteredResults.filter((product) => product.name?.toLowerCase().includes(searchName));
    }

    if (searchParams.reference) {
      const searchRef = searchParams.reference.toLowerCase();
      filteredResults = filteredResults.filter((product) => product.reference?.toLowerCase().includes(searchRef));
    }

    return {
      ...response,
      results: filteredResults,
      pagination: {
        ...response.pagination,
        page_size: Math.max(1, filteredResults.length),
        total_results: filteredResults.length,
      },
    };
  }

  // ─── Account Groups (Inventory Categories) ─────────────────────────────

  async getAccountGroups(options?: SiigoRequestOptions): Promise<SiigoAccountGroup[]> {
    return this.makeRequest<SiigoAccountGroup[]>('GET', '/v1/account-groups', undefined, undefined, options);
  }

  async createAccountGroup(data: SiigoAccountGroupIn, options?: SiigoRequestOptions): Promise<SiigoAccountGroup> {
    return this.makeRequest<SiigoAccountGroup>('POST', '/v1/account-groups', data, undefined, options);
  }

  async updateAccountGroup(id: number, data: SiigoAccountGroupIn, options?: SiigoRequestOptions): Promise<SiigoAccountGroup> {
    return this.makeRequest<SiigoAccountGroup>('PUT', `/v1/account-groups/${id}`, data, undefined, options);
  }

  // ─── Customers ─────────────────────────────────────────────────────────

  async getCustomers(params?: SiigoCustomerListQuery, options?: SiigoRequestOptions): Promise<SiigoListResponse<SiigoCustomer>> {
    return this.makeRequest<SiigoListResponse<SiigoCustomer>>('GET', '/v1/customers', undefined, this.queryParams(params), options);
  }

  async getCustomer(id: string, options?: SiigoRequestOptions): Promise<SiigoCustomer> {
    return this.makeRequest<SiigoCustomer>('GET', `/v1/customers/${this.encodeId(id)}`, undefined, undefined, options);
  }

  async createCustomer(customer: SiigoCustomerInput, options?: SiigoRequestOptions): Promise<SiigoCustomer> {
    return this.makeRequest<SiigoCustomer>('POST', '/v1/customers', customer, undefined, options);
  }

  async updateCustomer(id: string, customer: SiigoCustomerInput, options?: SiigoRequestOptions): Promise<SiigoCustomer> {
    return this.makeRequest<SiigoCustomer>('PUT', `/v1/customers/${this.encodeId(id)}`, customer, undefined, options);
  }

  async searchCustomers(searchParams: SiigoCustomerSearch, options?: SiigoRequestOptions): Promise<SiigoListResponse<SiigoCustomer>> {
    const params: Record<string, unknown> = {
      page: searchParams.page ?? 1,
      page_size: searchParams.page_size ?? 100,
    };
    if (searchParams.type) params.type = searchParams.type;

    const response = await this.fetchAllPages<SiigoCustomer>('/v1/customers', params, options);

    if (!searchParams.identification && !searchParams.name) {
      return response;
    }

    let filteredResults = response.results;

    if (searchParams.identification) {
      const searchId = searchParams.identification.toLowerCase();
      filteredResults = filteredResults.filter((customer) => customer.identification?.toLowerCase().includes(searchId));
    }

    if (searchParams.name) {
      const searchName = searchParams.name.toLowerCase();
      filteredResults = filteredResults.filter((customer) => {
        if (customer.name) {
          return customer.name.some((nameElement) => nameElement.toLowerCase().includes(searchName));
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
      pagination: {
        ...response.pagination,
        page_size: Math.max(1, filteredResults.length),
        total_results: filteredResults.length,
      },
    };
  }

  // ─── Invoices ──────────────────────────────────────────────────────────

  async getInvoices(params?: SiigoInvoiceListQuery, options?: SiigoRequestOptions): Promise<SiigoListResponse<SiigoInvoice>> {
    return this.makeRequest<SiigoListResponse<SiigoInvoice>>('GET', '/v1/invoices', undefined, this.queryParams(params), options);
  }

  async getInvoice(id: string, options?: SiigoRequestOptions): Promise<SiigoInvoice> {
    return this.makeRequest<SiigoInvoice>('GET', `/v1/invoices/${this.encodeId(id)}`, undefined, undefined, options);
  }

  async createInvoice(invoice: SiigoInvoiceInput, options?: SiigoRequestOptions): Promise<SiigoInvoice> {
    return this.makeRequest<SiigoInvoice>('POST', '/v1/invoices', invoice, undefined, options);
  }

  async updateInvoice(id: string, invoice: SiigoInvoiceInput, options?: SiigoRequestOptions): Promise<SiigoInvoice> {
    return this.makeRequest<SiigoInvoice>('PUT', `/v1/invoices/${this.encodeId(id)}`, invoice, undefined, options);
  }

  async deleteInvoice(id: string, options?: SiigoRequestOptions): Promise<SiigoDeleteResponse> {
    return this.makeRequest<SiigoDeleteResponse>('DELETE', `/v1/invoices/${this.encodeId(id)}`, undefined, undefined, options);
  }

  async annulInvoice(id: string, options?: SiigoRequestOptions): Promise<SiigoDeleteResponse> {
    return this.makeRequest<SiigoDeleteResponse>('POST', `/v1/invoices/${this.encodeId(id)}/annul`, undefined, undefined, options);
  }

  async getInvoicePdf(id: string, options?: SiigoRequestOptions): Promise<SiigoPdfResponse> {
    return this.makeRequest<SiigoPdfResponse>('GET', `/v1/invoices/${this.encodeId(id)}/pdf`, undefined, undefined, options);
  }

  async getInvoiceXml(id: string, options?: SiigoRequestOptions): Promise<SiigoXmlResponse> {
    return this.makeRequest<SiigoXmlResponse>('GET', `/v1/invoices/${this.encodeId(id)}/xml`, undefined, undefined, options);
  }

  async getInvoiceStampErrors(id: string, options?: SiigoRequestOptions): Promise<SiigoStampErrorsResponse> {
    return this.makeRequest<SiigoStampErrorsResponse>(
      'GET',
      `/v1/invoices/${this.encodeId(id)}/stamp/errors`,
      undefined,
      undefined,
      options,
    );
  }

  async sendInvoiceByEmail(
    id: string,
    emailData: Omit<SiigoInvoiceMailInput, 'id'>,
    options?: SiigoRequestOptions,
  ): Promise<SiigoInvoiceMailResponse> {
    return this.makeRequest<SiigoInvoiceMailResponse>('POST', `/v1/invoices/${this.encodeId(id)}/mail`, emailData, undefined, options);
  }

  async createInvoiceBatch(batch: SiigoInvoiceBatchInput, options?: SiigoRequestOptions): Promise<SiigoBatchInvoiceResponse> {
    return this.makeRequest<SiigoBatchInvoiceResponse>('POST', '/v1/invoices/batch', batch, undefined, options);
  }

  // ─── Quotations ────────────────────────────────────────────────────────

  async getQuotations(params?: SiigoQuotationListQuery, options?: SiigoRequestOptions): Promise<SiigoListResponse<SiigoQuotation>> {
    return this.makeRequest<SiigoListResponse<SiigoQuotation>>('GET', '/v1/quotations', undefined, this.queryParams(params), options);
  }

  async getQuotation(id: string, options?: SiigoRequestOptions): Promise<SiigoQuotation> {
    return this.makeRequest<SiigoQuotation>('GET', `/v1/quotations/${this.encodeId(id)}`, undefined, undefined, options);
  }

  async createQuotation(quotation: SiigoQuotationInput, options?: SiigoRequestOptions): Promise<SiigoQuotation> {
    return this.makeRequest<SiigoQuotation>('POST', '/v1/quotations', quotation, undefined, options);
  }

  async updateQuotation(id: string, quotation: SiigoQuotationInput, options?: SiigoRequestOptions): Promise<SiigoQuotation> {
    return this.makeRequest<SiigoQuotation>('PUT', `/v1/quotations/${this.encodeId(id)}`, quotation, undefined, options);
  }

  async deleteQuotation(id: string, options?: SiigoRequestOptions): Promise<SiigoDeleteResponse> {
    return this.makeRequest<SiigoDeleteResponse>('DELETE', `/v1/quotations/${this.encodeId(id)}`, undefined, undefined, options);
  }

  // ─── Credit Notes ──────────────────────────────────────────────────────

  async getCreditNotes(params?: SiigoCreditNoteListQuery, options?: SiigoRequestOptions): Promise<SiigoListResponse<SiigoCreditNote>> {
    return this.makeRequest<SiigoListResponse<SiigoCreditNote>>('GET', '/v1/credit-notes', undefined, this.queryParams(params), options);
  }

  async getCreditNote(id: string, options?: SiigoRequestOptions): Promise<SiigoCreditNote> {
    return this.makeRequest<SiigoCreditNote>('GET', `/v1/credit-notes/${this.encodeId(id)}`, undefined, undefined, options);
  }

  async createCreditNote(creditNote: SiigoCreditNoteInput, options?: SiigoRequestOptions): Promise<SiigoCreditNote> {
    return this.makeRequest<SiigoCreditNote>('POST', '/v1/credit-notes', creditNote, undefined, options);
  }

  async getCreditNotePdf(id: string, options?: SiigoRequestOptions): Promise<SiigoPdfResponse> {
    return this.makeRequest<SiigoPdfResponse>('GET', `/v1/credit-notes/${this.encodeId(id)}/pdf`, undefined, undefined, options);
  }

  // ─── Vouchers (Recibos de Caja) ────────────────────────────────────────

  async getVouchers(params?: SiigoVoucherListQuery, options?: SiigoRequestOptions): Promise<SiigoListResponse<SiigoVoucher>> {
    return this.makeRequest<SiigoListResponse<SiigoVoucher>>('GET', '/v1/vouchers', undefined, this.queryParams(params), options);
  }

  async getVoucher(id: string, options?: SiigoRequestOptions): Promise<SiigoVoucher> {
    return this.makeRequest<SiigoVoucher>('GET', `/v1/vouchers/${this.encodeId(id)}`, undefined, undefined, options);
  }

  async createVoucher(voucher: SiigoVoucherInput, options?: SiigoRequestOptions): Promise<SiigoVoucher> {
    return this.makeRequest<SiigoVoucher>('POST', '/v1/vouchers', voucher, undefined, options);
  }

  async createMiscIncomeVoucher(voucher: SiigoMiscIncomeVoucherInput, options?: SiigoRequestOptions): Promise<SiigoVoucher> {
    return this.makeRequest<SiigoVoucher>('POST', '/v1/vouchers', voucher, { type: 'MiscIncome' }, options);
  }

  // ─── Purchases (Facturas de Compra) ────────────────────────────────────

  async getPurchases(params?: SiigoPurchaseListQuery, options?: SiigoRequestOptions): Promise<SiigoListResponse<SiigoPurchase>> {
    return this.makeRequest<SiigoListResponse<SiigoPurchase>>('GET', '/v1/purchases', undefined, this.queryParams(params), options);
  }

  async getPurchase(id: string, options?: SiigoRequestOptions): Promise<SiigoPurchase> {
    return this.makeRequest<SiigoPurchase>('GET', `/v1/purchases/${this.encodeId(id)}`, undefined, undefined, options);
  }

  async createPurchase(purchase: SiigoPurchaseInput, options?: SiigoRequestOptions): Promise<SiigoPurchase> {
    return this.makeRequest<SiigoPurchase>('POST', '/v1/purchases', purchase, undefined, options);
  }

  async updatePurchase(id: string, purchase: SiigoPurchaseUpdateInput, options?: SiigoRequestOptions): Promise<SiigoPurchase> {
    return this.makeRequest<SiigoPurchase>('PUT', `/v1/purchases/${this.encodeId(id)}`, purchase, undefined, options);
  }

  async deletePurchase(id: string, options?: SiigoRequestOptions): Promise<SiigoDeleteResponse> {
    return this.makeRequest<SiigoDeleteResponse>('DELETE', `/v1/purchases/${this.encodeId(id)}`, undefined, undefined, options);
  }

  // ─── Purchase Support Documents (Documento Soporte) ─────────────────────

  async getPurchaseSupportDocument(id: string, options?: SiigoRequestOptions): Promise<SiigoPurchaseSupportDocument> {
    return this.makeRequest<SiigoPurchaseSupportDocument>(
      'GET',
      `/v1/purchase-support-documents/${this.encodeId(id)}`,
      undefined,
      undefined,
      options,
    );
  }

  async createPurchaseSupportDocument(
    purchaseSupportDocument: SiigoSupportDocumentInput,
    options?: SiigoRequestOptions,
  ): Promise<SiigoPurchaseSupportDocument> {
    return this.makeRequest<SiigoPurchaseSupportDocument>(
      'POST',
      '/v1/purchase-support-documents',
      purchaseSupportDocument,
      undefined,
      options,
    );
  }

  async updatePurchaseSupportDocument(
    id: string,
    purchaseSupportDocument: SiigoSupportDocumentUpdateInput,
    options?: SiigoRequestOptions,
  ): Promise<SiigoPurchaseSupportDocument> {
    return this.makeRequest<SiigoPurchaseSupportDocument>(
      'PUT',
      `/v1/purchase-support-documents/${this.encodeId(id)}`,
      purchaseSupportDocument,
      undefined,
      options,
    );
  }

  async deletePurchaseSupportDocument(id: string, options?: SiigoRequestOptions): Promise<SiigoDeleteResponse> {
    return this.makeRequest<SiigoDeleteResponse>(
      'DELETE',
      `/v1/purchase-support-documents/${this.encodeId(id)}`,
      undefined,
      undefined,
      options,
    );
  }

  // ─── Payment Receipts (Recibos de Pago / Egreso) ──────────────────────

  async getPaymentReceipts(
    params?: SiigoPaymentReceiptListQuery,
    options?: SiigoRequestOptions,
  ): Promise<SiigoListResponse<SiigoPaymentReceipt>> {
    return this.makeRequest<SiigoListResponse<SiigoPaymentReceipt>>(
      'GET',
      '/v1/payment-receipts',
      undefined,
      this.queryParams(params),
      options,
    );
  }

  async getPaymentReceipt(id: string, options?: SiigoRequestOptions): Promise<SiigoPaymentReceipt> {
    return this.makeRequest<SiigoPaymentReceipt>('GET', `/v1/payment-receipts/${this.encodeId(id)}`, undefined, undefined, options);
  }

  async createPaymentReceipt(paymentReceipt: SiigoPaymentReceiptInput, options?: SiigoRequestOptions): Promise<SiigoPaymentReceipt> {
    return this.makeRequest<SiigoPaymentReceipt>('POST', '/v1/payment-receipts', paymentReceipt, undefined, options);
  }

  async updatePaymentReceipt(
    id: string,
    paymentReceipt: SiigoPaymentReceiptUpdateInput,
    options?: SiigoRequestOptions,
  ): Promise<SiigoPaymentReceipt> {
    return this.makeRequest<SiigoPaymentReceipt>('PUT', `/v1/payment-receipts/${this.encodeId(id)}`, paymentReceipt, undefined, options);
  }

  async deletePaymentReceipt(id: string, options?: SiigoRequestOptions): Promise<SiigoDeleteResponse> {
    return this.makeRequest<SiigoDeleteResponse>('DELETE', `/v1/payment-receipts/${this.encodeId(id)}`, undefined, undefined, options);
  }

  // ─── Journals (Comprobantes Contables) ─────────────────────────────────

  async getJournals(params?: SiigoJournalListQuery, options?: SiigoRequestOptions): Promise<SiigoListResponse<SiigoJournal>> {
    return this.makeRequest<SiigoListResponse<SiigoJournal>>('GET', '/v1/journals', undefined, this.queryParams(params), options);
  }

  async getJournal(id: string, options?: SiigoRequestOptions): Promise<SiigoJournal> {
    return this.makeRequest<SiigoJournal>('GET', `/v1/journals/${this.encodeId(id)}`, undefined, undefined, options);
  }

  async createJournal(journal: SiigoJournalInput, options?: SiigoRequestOptions): Promise<SiigoJournal> {
    return this.makeRequest<SiigoJournal>('POST', '/v1/journals', journal, undefined, options);
  }

  // ─── Webhooks ──────────────────────────────────────────────────────────

  async getWebhooks(params?: SiigoWebhookListQuery, options?: SiigoRequestOptions): Promise<SiigoListResponse<SiigoWebhook>> {
    return this.makeRequest<SiigoListResponse<SiigoWebhook>>('GET', '/v1/webhooks', undefined, this.queryParams(params), options);
  }

  async createWebhook(webhook: SiigoWebhookInput, options?: SiigoRequestOptions): Promise<SiigoWebhook> {
    return this.makeRequest<SiigoWebhook>('POST', '/v1/webhooks', webhook, undefined, options);
  }

  async updateWebhook(id: string | undefined, webhook: SiigoWebhookUpdateInput, options?: SiigoRequestOptions): Promise<SiigoWebhook> {
    try {
      return await this.makeRequest<SiigoWebhook>('PUT', '/v1/webhooks', webhook, undefined, options);
    } catch (error: unknown) {
      const canUseLegacyRoute =
        id !== undefined && error instanceof SiigoApiError && error.status !== undefined && [404, 405].includes(error.status);

      if (!canUseLegacyRoute) {
        throw error;
      }

      return this.makeRequest<SiigoWebhook>('PUT', `/v1/webhooks/${this.encodeId(id)}`, webhook, undefined, options);
    }
  }

  async deleteWebhook(id: string, options?: SiigoRequestOptions): Promise<SiigoDeleteResponse> {
    return this.makeRequest<SiigoDeleteResponse>('DELETE', `/v1/webhooks/${this.encodeId(id)}`, undefined, undefined, options);
  }

  // ─── Catalogs ──────────────────────────────────────────────────────────

  async getDocumentTypes(type?: string, options?: SiigoRequestOptions): Promise<SiigoDocumentType[]> {
    return this.makeRequest<SiigoDocumentType[]>('GET', '/v1/document-types', undefined, type ? { type } : undefined, options);
  }

  async getTaxes(options?: SiigoRequestOptions): Promise<SiigoTax[]> {
    return this.makeRequest<SiigoTax[]>('GET', '/v1/taxes', undefined, undefined, options);
  }

  async getPaymentTypes(documentType: string, options?: SiigoRequestOptions): Promise<SiigoPaymentType[]> {
    return this.makeRequest<SiigoPaymentType[]>('GET', '/v1/payment-types', undefined, { document_type: documentType }, options);
  }

  async getCostCenters(options?: SiigoRequestOptions): Promise<SiigoCostCenter[]> {
    return this.makeRequest<SiigoCostCenter[]>('GET', '/v1/cost-centers', undefined, undefined, options);
  }

  async getUsers(params?: { page?: number; page_size?: number }, options?: SiigoRequestOptions): Promise<SiigoListResponse<SiigoUser>> {
    return this.makeRequest<SiigoListResponse<SiigoUser>>('GET', '/v1/users', undefined, this.queryParams(params), options);
  }

  async getWarehouses(options?: SiigoRequestOptions): Promise<SiigoWarehouse[]> {
    return this.makeRequest<SiigoWarehouse[]>('GET', '/v1/warehouses', undefined, undefined, options);
  }

  async getPriceLists(options?: SiigoRequestOptions): Promise<SiigoPriceList[]> {
    return this.makeRequest<SiigoPriceList[]>('GET', '/v1/price-lists', undefined, undefined, options);
  }

  async getFixedAssets(options?: SiigoRequestOptions): Promise<SiigoFixedAsset[]> {
    return this.makeRequest<SiigoFixedAsset[]>('GET', '/v1/fixed-assets', undefined, undefined, options);
  }

  async getExpenses(options?: SiigoRequestOptions): Promise<SiigoExpense[]> {
    return this.makeRequest<SiigoExpense[]>('GET', '/v1/expenses', undefined, undefined, options);
  }

  async getMiscIncome(options?: SiigoRequestOptions): Promise<SiigoMiscIncome[]> {
    return this.makeRequest<SiigoMiscIncome[]>('GET', '/v1/misc-incomes', undefined, undefined, options);
  }

  // ─── Reports ───────────────────────────────────────────────────────────

  async getTrialBalance(params: SiigoTrialBalanceInput, options?: SiigoRequestOptions): Promise<SiigoReportFile> {
    return this.makeRequest<SiigoReportFile>('POST', '/v1/test-balance-report', params, undefined, options);
  }

  async getTrialBalanceByThird(params: SiigoTrialBalanceByThirdInput, options?: SiigoRequestOptions): Promise<SiigoReportFile> {
    return this.makeRequest<SiigoReportFile>('POST', '/v1/test-balance-report-by-thirdparty', params, undefined, options);
  }

  async getAccountsPayable(params?: SiigoAccountsPayableQuery, options?: SiigoRequestOptions): Promise<SiigoAccountsPayableResponse> {
    return this.makeRequest<SiigoAccountsPayableResponse>('GET', '/v1/accounts-payable', undefined, this.queryParams(params), options);
  }
}
