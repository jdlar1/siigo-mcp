import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { SiigoConfig, SiigoToken, SiigoCustomer, SiigoProduct, SiigoInvoice, SiigoApiResponse } from './types.js';

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

  private async makeRequest<T>(method: string, endpoint: string, data?: any, params?: any): Promise<SiigoApiResponse<T>> {
    await this.authenticate();

    try {
      const response: AxiosResponse<SiigoApiResponse<T>> = await this.httpClient.request({
        method,
        url: endpoint,
        data,
        params,
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw new Error(`API request failed: ${error.message}`);
    }
  }

  // Products endpoints
  async getProducts(params?: { page?: number; page_size?: number }): Promise<SiigoApiResponse<SiigoProduct>> {
    return this.makeRequest<SiigoProduct>('GET', '/v1/products', undefined, params);
  }

  async getProduct(id: string): Promise<SiigoApiResponse<SiigoProduct>> {
    return this.makeRequest<SiigoProduct>('GET', `/v1/products/${id}`);
  }

  async createProduct(product: SiigoProduct): Promise<SiigoApiResponse<SiigoProduct>> {
    return this.makeRequest<SiigoProduct>('POST', '/v1/products', product);
  }

  async updateProduct(id: string, product: Partial<SiigoProduct>): Promise<SiigoApiResponse<SiigoProduct>> {
    return this.makeRequest<SiigoProduct>('PUT', `/v1/products/${id}`, product);
  }

  async deleteProduct(id: string): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('DELETE', `/v1/products/${id}`);
  }

  // Enhanced product search functionality
  async searchProducts(searchParams: {
    code?: string;
    name?: string;
    reference?: string;
    page?: number;
    page_size?: number;
  }): Promise<SiigoApiResponse<SiigoProduct>> {
    // Build query parameters for search
    const params: any = {};
    
    if (searchParams.page) params.page = searchParams.page;
    if (searchParams.page_size) params.page_size = searchParams.page_size;
    
    // Fetch products and filter client-side
    const response = await this.makeRequest<SiigoProduct>('GET', '/v1/products', undefined, params);
    
    // If no text-based filters, return the API response as-is
    if (!searchParams.code && !searchParams.name && !searchParams.reference) {
      return response;
    }
    
    // Filter results based on search criteria
    if (response.results) {
      let filteredResults = response.results;
      
      // Filter by code (partial match)
      if (searchParams.code) {
        const searchCode = searchParams.code.toLowerCase();
        filteredResults = filteredResults.filter(product => 
          product.code?.toLowerCase().includes(searchCode)
        );
      }
      
      // Filter by name (partial match)
      if (searchParams.name) {
        const searchName = searchParams.name.toLowerCase();
        filteredResults = filteredResults.filter(product => 
          product.name?.toLowerCase().includes(searchName)
        );
      }
      
      // Filter by reference (partial match)
      if (searchParams.reference) {
        const searchRef = searchParams.reference.toLowerCase();
        filteredResults = filteredResults.filter(product => 
          product.reference?.toLowerCase().includes(searchRef)
        );
      }
      
      // Return filtered response
      return {
        ...response,
        results: filteredResults,
        pagination: response.pagination ? {
          ...response.pagination,
          total_results: filteredResults.length
        } : undefined
      };
    }
    
    return response;
  }

  // Customers endpoints
  async getCustomers(params?: { page?: number; page_size?: number; type?: string }): Promise<SiigoApiResponse<SiigoCustomer>> {
    return this.makeRequest<SiigoCustomer>('GET', '/v1/customers', undefined, params);
  }

  async getCustomer(id: string): Promise<SiigoApiResponse<SiigoCustomer>> {
    return this.makeRequest<SiigoCustomer>('GET', `/v1/customers/${id}`);
  }

  async createCustomer(customer: SiigoCustomer): Promise<SiigoApiResponse<SiigoCustomer>> {
    return this.makeRequest<SiigoCustomer>('POST', '/v1/customers', customer);
  }

  async updateCustomer(id: string, customer: Partial<SiigoCustomer>): Promise<SiigoApiResponse<SiigoCustomer>> {
    return this.makeRequest<SiigoCustomer>('PUT', `/v1/customers/${id}`, customer);
  }

  // Enhanced customer search functionality
  async searchCustomers(searchParams: {
    identification?: string;
    name?: string;
    type?: 'Customer' | 'Supplier' | 'Other';
    page?: number;
    page_size?: number;
  }): Promise<SiigoApiResponse<SiigoCustomer>> {
    // Build query parameters for search
    const params: any = {};
    
    if (searchParams.page) params.page = searchParams.page;
    if (searchParams.page_size) params.page_size = searchParams.page_size;
    if (searchParams.type) params.type = searchParams.type;
    
    // For name and identification, we'll need to fetch and filter
    // since Siigo API doesn't support direct text search parameters
    const response = await this.makeRequest<SiigoCustomer>('GET', '/v1/customers', undefined, params);
    
    // If no text-based filters, return the API response as-is
    if (!searchParams.identification && !searchParams.name) {
      return response;
    }
    
    // Filter results based on search criteria
    if (response.results) {
      let filteredResults = response.results;
      
      // Filter by identification (exact or partial match)
      if (searchParams.identification) {
        const searchId = searchParams.identification.toLowerCase();
        filteredResults = filteredResults.filter(customer => 
          customer.identification?.toLowerCase().includes(searchId)
        );
      }
      
      // Filter by name (partial match in any name field)
      if (searchParams.name) {
        const searchName = searchParams.name.toLowerCase();
        filteredResults = filteredResults.filter(customer => {
          if (customer.name) {
            // Check if any name element contains the search term
            return customer.name.some(nameElement => 
              nameElement.toLowerCase().includes(searchName)
            );
          }
          // Also check commercial name if available
          if (customer.commercial_name) {
            return customer.commercial_name.toLowerCase().includes(searchName);
          }
          return false;
        });
      }
      
      // Return filtered response
      return {
        ...response,
        results: filteredResults,
        pagination: response.pagination ? {
          ...response.pagination,
          total_results: filteredResults.length
        } : undefined
      };
    }
    
    return response;
  }

  // Invoices endpoints
  async getInvoices(params?: { page?: number; page_size?: number; created_start?: string; created_end?: string }): Promise<SiigoApiResponse<SiigoInvoice>> {
    return this.makeRequest<SiigoInvoice>('GET', '/v1/invoices', undefined, params);
  }

  async getInvoice(id: string): Promise<SiigoApiResponse<SiigoInvoice>> {
    return this.makeRequest<SiigoInvoice>('GET', `/v1/invoices/${id}`);
  }

  async createInvoice(invoice: SiigoInvoice): Promise<SiigoApiResponse<SiigoInvoice>> {
    return this.makeRequest<SiigoInvoice>('POST', '/v1/invoices', invoice);
  }

  async updateInvoice(id: string, invoice: Partial<SiigoInvoice>): Promise<SiigoApiResponse<SiigoInvoice>> {
    return this.makeRequest<SiigoInvoice>('PUT', `/v1/invoices/${id}`, invoice);
  }

  async deleteInvoice(id: string): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('DELETE', `/v1/invoices/${id}`);
  }

  async getInvoicePdf(id: string): Promise<SiigoApiResponse<{ base64: string }>> {
    return this.makeRequest<{ base64: string }>('GET', `/v1/invoices/${id}/pdf`);
  }

  async sendInvoiceByEmail(id: string, emailData: { mail_to: string; copy_to?: string }): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('POST', `/v1/invoices/${id}/mail`, emailData);
  }

  // Credit Notes endpoints
  async getCreditNotes(params?: { page?: number; page_size?: number }): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('GET', '/v1/credit-notes', undefined, params);
  }

  async getCreditNote(id: string): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('GET', `/v1/credit-notes/${id}`);
  }

  async createCreditNote(creditNote: any): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('POST', '/v1/credit-notes', creditNote);
  }

  // Vouchers (Recibos de caja) endpoints
  async getVouchers(params?: { page?: number; page_size?: number }): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('GET', '/v1/vouchers', undefined, params);
  }

  async getVoucher(id: string): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('GET', `/v1/vouchers/${id}`);
  }

  async createVoucher(voucher: any): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('POST', '/v1/vouchers', voucher);
  }

  // Purchases endpoints
  async getPurchases(params?: { page?: number; page_size?: number }): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('GET', '/v1/purchases', undefined, params);
  }

  async getPurchase(id: string): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('GET', `/v1/purchases/${id}`);
  }

  async createPurchase(purchase: any): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('POST', '/v1/purchases', purchase);
  }

  async updatePurchase(id: string, purchase: any): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('PUT', `/v1/purchases/${id}`, purchase);
  }

  async deletePurchase(id: string): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('DELETE', `/v1/purchases/${id}`);
  }

  // Payment Receipts endpoints
  async getPaymentReceipts(params?: { page?: number; page_size?: number }): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('GET', '/v1/payment-receipts', undefined, params);
  }

  async getPaymentReceipt(id: string): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('GET', `/v1/payment-receipts/${id}`);
  }

  async createPaymentReceipt(paymentReceipt: any): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('POST', '/v1/payment-receipts', paymentReceipt);
  }

  async updatePaymentReceipt(id: string, paymentReceipt: any): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('PUT', `/v1/payment-receipts/${id}`, paymentReceipt);
  }

  async deletePaymentReceipt(id: string): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('DELETE', `/v1/payment-receipts/${id}`);
  }

  // Journals endpoints
  async getJournals(params?: { page?: number; page_size?: number }): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('GET', '/v1/journals', undefined, params);
  }

  async getJournal(id: string): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('GET', `/v1/journals/${id}`);
  }

  async createJournal(journal: any): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('POST', '/v1/journals', journal);
  }

  // Catalogs endpoints
  async getDocumentTypes(type?: string): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('GET', '/v1/document-types', undefined, type ? { type } : undefined);
  }

  async getTaxes(): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('GET', '/v1/taxes');
  }

  async getPaymentTypes(documentType?: string): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('GET', '/v1/payment-types', undefined, documentType ? { document_type: documentType } : undefined);
  }

  async getCostCenters(): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('GET', '/v1/cost-centers');
  }

  async getUsers(): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('GET', '/v1/users');
  }

  async getWarehouses(): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('GET', '/v1/warehouses');
  }

  async getPriceLists(): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('GET', '/v1/price-lists');
  }

  async getAccountGroups(): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('GET', '/v1/account-groups');
  }

  async getCities(): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('GET', '/v1/cities');
  }

  async getIdTypes(): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('GET', '/v1/id-types');
  }

  async getFiscalResponsibilities(): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('GET', '/v1/fiscal-responsibilities');
  }

  // Reports endpoints
  async getTrialBalance(params: {
    account_start?: string;
    account_end?: string;
    year: number;
    month_start: number;
    month_end: number;
    includes_tax_difference: boolean;
  }): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('GET', '/v1/trial-balance', undefined, params);
  }

  async getTrialBalanceByThird(params: {
    account_start?: string;
    account_end?: string;
    year: number;
    month_start: number;
    month_end: number;
    includes_tax_difference: boolean;
    customer?: {
      identification: string;
      branch_office?: number;
    };
  }): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('GET', '/v1/trial-balance-by-third', undefined, params);
  }

  async getAccountsPayable(params?: { page?: number; page_size?: number }): Promise<SiigoApiResponse<any>> {
    return this.makeRequest<any>('GET', '/v1/accounts-payable', undefined, params);
  }
}