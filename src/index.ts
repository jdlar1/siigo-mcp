#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { SiigoClient } from './siigo-client.js';
import { SiigoConfig } from './types.js';
import * as dotenv from 'dotenv';

dotenv.config();

class SiigoMCPServer {
  private server: Server;
  private siigoClient: SiigoClient;

  constructor() {
    this.server = new Server(
      {
        name: 'siigo-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    const config: SiigoConfig = {
      username: process.env.SIIGO_USERNAME || '',
      accessKey: process.env.SIIGO_ACCESS_KEY || '',
      baseUrl: process.env.SIIGO_BASE_URL || 'https://api.siigo.com',
      partnerId: process.env.SIIGO_PARTNER_ID || '',
    };

    if (!config.username || !config.accessKey || !config.partnerId) {
      throw new Error('SIIGO_USERNAME, SIIGO_ACCESS_KEY, and SIIGO_PARTNER_ID environment variables are required');
    }

    this.siigoClient = new SiigoClient(config);
    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getTools(),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // Products
          case 'siigo_get_products':
            return await this.handleGetProducts(args);
          case 'siigo_get_product':
            return await this.handleGetProduct(args);
          case 'siigo_create_product':
            return await this.handleCreateProduct(args);
          case 'siigo_update_product':
            return await this.handleUpdateProduct(args);
          case 'siigo_delete_product':
            return await this.handleDeleteProduct(args);
          case 'siigo_search_products':
            return await this.handleSearchProducts(args);

          // Customers
          case 'siigo_get_customers':
            return await this.handleGetCustomers(args);
          case 'siigo_get_customer':
            return await this.handleGetCustomer(args);
          case 'siigo_create_customer':
            return await this.handleCreateCustomer(args);
          case 'siigo_update_customer':
            return await this.handleUpdateCustomer(args);
          case 'siigo_search_customers':
            return await this.handleSearchCustomers(args);

          // Invoices
          case 'siigo_get_invoices':
            return await this.handleGetInvoices(args);
          case 'siigo_get_invoice':
            return await this.handleGetInvoice(args);
          case 'siigo_create_invoice':
            return await this.handleCreateInvoice(args);
          case 'siigo_update_invoice':
            return await this.handleUpdateInvoice(args);
          case 'siigo_delete_invoice':
            return await this.handleDeleteInvoice(args);
          case 'siigo_get_invoice_pdf':
            return await this.handleGetInvoicePdf(args);
          case 'siigo_send_invoice_email':
            return await this.handleSendInvoiceEmail(args);

          // Credit Notes
          case 'siigo_get_credit_notes':
            return await this.handleGetCreditNotes(args);
          case 'siigo_get_credit_note':
            return await this.handleGetCreditNote(args);
          case 'siigo_create_credit_note':
            return await this.handleCreateCreditNote(args);

          // Vouchers
          case 'siigo_get_vouchers':
            return await this.handleGetVouchers(args);
          case 'siigo_get_voucher':
            return await this.handleGetVoucher(args);
          case 'siigo_create_voucher':
            return await this.handleCreateVoucher(args);

          // Purchases
          case 'siigo_get_purchases':
            return await this.handleGetPurchases(args);
          case 'siigo_get_purchase':
            return await this.handleGetPurchase(args);
          case 'siigo_create_purchase':
            return await this.handleCreatePurchase(args);
          case 'siigo_update_purchase':
            return await this.handleUpdatePurchase(args);
          case 'siigo_delete_purchase':
            return await this.handleDeletePurchase(args);

          // Payment Receipts
          case 'siigo_get_payment_receipts':
            return await this.handleGetPaymentReceipts(args);
          case 'siigo_get_payment_receipt':
            return await this.handleGetPaymentReceipt(args);
          case 'siigo_create_payment_receipt':
            return await this.handleCreatePaymentReceipt(args);
          case 'siigo_update_payment_receipt':
            return await this.handleUpdatePaymentReceipt(args);
          case 'siigo_delete_payment_receipt':
            return await this.handleDeletePaymentReceipt(args);

          // Journals
          case 'siigo_get_journals':
            return await this.handleGetJournals(args);
          case 'siigo_get_journal':
            return await this.handleGetJournal(args);
          case 'siigo_create_journal':
            return await this.handleCreateJournal(args);

          // Catalogs
          case 'siigo_get_document_types':
            return await this.handleGetDocumentTypes(args);
          case 'siigo_get_taxes':
            return await this.handleGetTaxes(args);
          case 'siigo_get_payment_types':
            return await this.handleGetPaymentTypes(args);
          case 'siigo_get_cost_centers':
            return await this.handleGetCostCenters(args);
          case 'siigo_get_users':
            return await this.handleGetUsers(args);
          case 'siigo_get_warehouses':
            return await this.handleGetWarehouses(args);
          case 'siigo_get_price_lists':
            return await this.handleGetPriceLists(args);
          case 'siigo_get_account_groups':
            return await this.handleGetAccountGroups(args);
          case 'siigo_get_cities':
            return await this.handleGetCities(args);
          case 'siigo_get_id_types':
            return await this.handleGetIdTypes(args);
          case 'siigo_get_fiscal_responsibilities':
            return await this.handleGetFiscalResponsibilities(args);

          // Reports
          case 'siigo_get_trial_balance':
            return await this.handleGetTrialBalance(args);
          case 'siigo_get_trial_balance_by_third':
            return await this.handleGetTrialBalanceByThird(args);
          case 'siigo_get_accounts_payable':
            return await this.handleGetAccountsPayable(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private getTools(): Tool[] {
    return [
      // Products
      {
        name: 'siigo_get_products',
        description: 'Get list of products from Siigo',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            page_size: { type: 'number', description: 'Number of items per page' },
          },
        },
      },
      {
        name: 'siigo_get_product',
        description: 'Get a specific product by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Product ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'siigo_create_product',
        description: 'Create a new product',
        inputSchema: {
          type: 'object',
          properties: {
            product: {
              type: 'object',
              description: 'Product data',
              properties: {
                code: { type: 'string', description: 'Product code' },
                name: { type: 'string', description: 'Product name' },
                account_group: { type: 'number', description: 'Account group ID' },
                type: { type: 'string', enum: ['Product', 'Service', 'ConsumerGood'] },
                stock_control: { type: 'boolean' },
                active: { type: 'boolean' },
                tax_classification: { type: 'string', enum: ['Taxed', 'Exempt', 'Excluded'] },
                tax_included: { type: 'boolean' },
                unit: { type: 'string' },
                unit_label: { type: 'string' },
                reference: { type: 'string' },
                description: { type: 'string' },
              },
              required: ['code', 'name', 'account_group'],
            },
          },
          required: ['product'],
        },
      },
      {
        name: 'siigo_update_product',
        description: 'Update an existing product',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Product ID' },
            product: { type: 'object', description: 'Product data to update' },
          },
          required: ['id', 'product'],
        },
      },
      {
        name: 'siigo_delete_product',
        description: 'Delete a product',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Product ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'siigo_search_products',
        description: 'Search for products by code, name, or reference with filtering capabilities',
        inputSchema: {
          type: 'object',
          properties: {
            code: { 
              type: 'string', 
              description: 'Search by product code (partial match)' 
            },
            name: { 
              type: 'string', 
              description: 'Search by product name (partial match)' 
            },
            reference: { 
              type: 'string', 
              description: 'Search by product reference (partial match)' 
            },
            page: { 
              type: 'number', 
              description: 'Page number for pagination' 
            },
            page_size: { 
              type: 'number', 
              description: 'Number of items per page (max 100)' 
            },
          },
        },
      },

      // Customers
      {
        name: 'siigo_get_customers',
        description: 'Get list of customers from Siigo',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            page_size: { type: 'number', description: 'Number of items per page' },
            type: { type: 'string', description: 'Customer type filter' },
          },
        },
      },
      {
        name: 'siigo_get_customer',
        description: 'Get a specific customer by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Customer ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'siigo_create_customer',
        description: 'Create a new customer',
        inputSchema: {
          type: 'object',
          properties: {
            customer: {
              type: 'object',
              description: 'Customer data',
              properties: {
                person_type: { type: 'string', enum: ['Person', 'Company'] },
                id_type: { type: 'string', description: 'ID type code' },
                identification: { type: 'string', description: 'Customer identification' },
                name: { type: 'array', items: { type: 'string' }, description: 'Customer names' },
                address: {
                  type: 'object',
                  properties: {
                    address: { type: 'string' },
                    city: {
                      type: 'object',
                      properties: {
                        country_code: { type: 'string' },
                        state_code: { type: 'string' },
                        city_code: { type: 'string' },
                      },
                      required: ['country_code', 'state_code', 'city_code'],
                    },
                  },
                  required: ['address', 'city'],
                },
                phones: { type: 'array', items: { type: 'object' } },
                contacts: { type: 'array', items: { type: 'object' } },
              },
              required: ['person_type', 'id_type', 'identification', 'name', 'address', 'phones', 'contacts'],
            },
          },
          required: ['customer'],
        },
      },
      {
        name: 'siigo_update_customer',
        description: 'Update an existing customer',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Customer ID' },
            customer: { type: 'object', description: 'Customer data to update' },
          },
          required: ['id', 'customer'],
        },
      },
      {
        name: 'siigo_search_customers',
        description: 'Search for customers by identification, name, or type with filtering capabilities',
        inputSchema: {
          type: 'object',
          properties: {
            identification: { 
              type: 'string', 
              description: 'Search by customer identification number (partial or exact match)' 
            },
            name: { 
              type: 'string', 
              description: 'Search by customer name (partial match across all name fields)' 
            },
            type: { 
              type: 'string', 
              enum: ['Customer', 'Supplier', 'Other'],
              description: 'Filter by customer type' 
            },
            page: { 
              type: 'number', 
              description: 'Page number for pagination' 
            },
            page_size: { 
              type: 'number', 
              description: 'Number of items per page (max 100)' 
            },
          },
        },
      },

      // Invoices
      {
        name: 'siigo_get_invoices',
        description: 'Get list of invoices from Siigo',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            page_size: { type: 'number', description: 'Number of items per page' },
            created_start: { type: 'string', description: 'Start date filter (YYYY-MM-DD)' },
            created_end: { type: 'string', description: 'End date filter (YYYY-MM-DD)' },
          },
        },
      },
      {
        name: 'siigo_get_invoice',
        description: 'Get a specific invoice by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Invoice ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'siigo_create_invoice',
        description: 'Create a new invoice',
        inputSchema: {
          type: 'object',
          properties: {
            invoice: {
              type: 'object',
              description: 'Invoice data',
              properties: {
                document: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] },
                date: { type: 'string', description: 'Invoice date (YYYY-MM-DD)' },
                customer: { type: 'object', description: 'Customer information' },
                seller: { type: 'number', description: 'Seller ID' },
                items: { type: 'array', items: { type: 'object' }, description: 'Invoice items' },
                payments: { type: 'array', items: { type: 'object' }, description: 'Payment methods' },
              },
              required: ['document', 'date', 'customer', 'seller', 'items', 'payments'],
            },
          },
          required: ['invoice'],
        },
      },
      {
        name: 'siigo_update_invoice',
        description: 'Update an existing invoice',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Invoice ID' },
            invoice: { type: 'object', description: 'Invoice data to update' },
          },
          required: ['id', 'invoice'],
        },
      },
      {
        name: 'siigo_delete_invoice',
        description: 'Delete an invoice',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Invoice ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'siigo_get_invoice_pdf',
        description: 'Get invoice PDF',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Invoice ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'siigo_send_invoice_email',
        description: 'Send invoice by email',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Invoice ID' },
            mail_to: { type: 'string', description: 'Recipient email' },
            copy_to: { type: 'string', description: 'CC emails (semicolon separated)' },
          },
          required: ['id', 'mail_to'],
        },
      },

      // Credit Notes
      {
        name: 'siigo_get_credit_notes',
        description: 'Get list of credit notes from Siigo',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            page_size: { type: 'number', description: 'Number of items per page' },
          },
        },
      },
      {
        name: 'siigo_get_credit_note',
        description: 'Get a specific credit note by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Credit note ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'siigo_create_credit_note',
        description: 'Create a new credit note',
        inputSchema: {
          type: 'object',
          properties: {
            creditNote: { type: 'object', description: 'Credit note data' },
          },
          required: ['creditNote'],
        },
      },

      // Vouchers
      {
        name: 'siigo_get_vouchers',
        description: 'Get list of vouchers (cash receipts) from Siigo',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            page_size: { type: 'number', description: 'Number of items per page' },
          },
        },
      },
      {
        name: 'siigo_get_voucher',
        description: 'Get a specific voucher by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Voucher ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'siigo_create_voucher',
        description: 'Create a new voucher',
        inputSchema: {
          type: 'object',
          properties: {
            voucher: { type: 'object', description: 'Voucher data' },
          },
          required: ['voucher'],
        },
      },

      // Purchases
      {
        name: 'siigo_get_purchases',
        description: 'Get list of purchases from Siigo',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            page_size: { type: 'number', description: 'Number of items per page' },
          },
        },
      },
      {
        name: 'siigo_get_purchase',
        description: 'Get a specific purchase by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Purchase ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'siigo_create_purchase',
        description: 'Create a new purchase',
        inputSchema: {
          type: 'object',
          properties: {
            purchase: { type: 'object', description: 'Purchase data' },
          },
          required: ['purchase'],
        },
      },
      {
        name: 'siigo_update_purchase',
        description: 'Update an existing purchase',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Purchase ID' },
            purchase: { type: 'object', description: 'Purchase data to update' },
          },
          required: ['id', 'purchase'],
        },
      },
      {
        name: 'siigo_delete_purchase',
        description: 'Delete a purchase',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Purchase ID' },
          },
          required: ['id'],
        },
      },

      // Payment Receipts
      {
        name: 'siigo_get_payment_receipts',
        description: 'Get list of payment receipts from Siigo',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            page_size: { type: 'number', description: 'Number of items per page' },
          },
        },
      },
      {
        name: 'siigo_get_payment_receipt',
        description: 'Get a specific payment receipt by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Payment receipt ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'siigo_create_payment_receipt',
        description: 'Create a new payment receipt',
        inputSchema: {
          type: 'object',
          properties: {
            paymentReceipt: { type: 'object', description: 'Payment receipt data' },
          },
          required: ['paymentReceipt'],
        },
      },
      {
        name: 'siigo_update_payment_receipt',
        description: 'Update an existing payment receipt',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Payment receipt ID' },
            paymentReceipt: { type: 'object', description: 'Payment receipt data to update' },
          },
          required: ['id', 'paymentReceipt'],
        },
      },
      {
        name: 'siigo_delete_payment_receipt',
        description: 'Delete a payment receipt',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Payment receipt ID' },
          },
          required: ['id'],
        },
      },

      // Journals
      {
        name: 'siigo_get_journals',
        description: 'Get list of accounting journals from Siigo',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            page_size: { type: 'number', description: 'Number of items per page' },
          },
        },
      },
      {
        name: 'siigo_get_journal',
        description: 'Get a specific journal by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Journal ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'siigo_create_journal',
        description: 'Create a new accounting journal',
        inputSchema: {
          type: 'object',
          properties: {
            journal: { type: 'object', description: 'Journal data' },
          },
          required: ['journal'],
        },
      },

      // Catalogs
      {
        name: 'siigo_get_document_types',
        description: 'Get document types catalog',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Document type filter (FV, RC, NC, FC, CC)' },
          },
        },
      },
      {
        name: 'siigo_get_taxes',
        description: 'Get taxes catalog',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'siigo_get_payment_types',
        description: 'Get payment types catalog',
        inputSchema: {
          type: 'object',
          properties: {
            document_type: { type: 'string', description: 'Document type filter' },
          },
        },
      },
      {
        name: 'siigo_get_cost_centers',
        description: 'Get cost centers catalog',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'siigo_get_users',
        description: 'Get users catalog',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'siigo_get_warehouses',
        description: 'Get warehouses catalog',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'siigo_get_price_lists',
        description: 'Get price lists catalog',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'siigo_get_account_groups',
        description: 'Get account groups catalog',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'siigo_get_cities',
        description: 'Get cities catalog',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'siigo_get_id_types',
        description: 'Get ID types catalog',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'siigo_get_fiscal_responsibilities',
        description: 'Get fiscal responsibilities catalog',
        inputSchema: { type: 'object', properties: {} },
      },

      // Reports
      {
        name: 'siigo_get_trial_balance',
        description: 'Get trial balance report',
        inputSchema: {
          type: 'object',
          properties: {
            account_start: { type: 'string', description: 'Starting account code' },
            account_end: { type: 'string', description: 'Ending account code' },
            year: { type: 'number', description: 'Year' },
            month_start: { type: 'number', description: 'Starting month (1-13)' },
            month_end: { type: 'number', description: 'Ending month (1-13)' },
            includes_tax_difference: { type: 'boolean', description: 'Include tax differences' },
          },
          required: ['year', 'month_start', 'month_end', 'includes_tax_difference'],
        },
      },
      {
        name: 'siigo_get_trial_balance_by_third',
        description: 'Get trial balance by third party report',
        inputSchema: {
          type: 'object',
          properties: {
            account_start: { type: 'string', description: 'Starting account code' },
            account_end: { type: 'string', description: 'Ending account code' },
            year: { type: 'number', description: 'Year' },
            month_start: { type: 'number', description: 'Starting month (1-13)' },
            month_end: { type: 'number', description: 'Ending month (1-13)' },
            includes_tax_difference: { type: 'boolean', description: 'Include tax differences' },
            customer: { type: 'object', description: 'Customer filter' },
          },
          required: ['year', 'month_start', 'month_end', 'includes_tax_difference'],
        },
      },
      {
        name: 'siigo_get_accounts_payable',
        description: 'Get accounts payable report',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            page_size: { type: 'number', description: 'Number of items per page' },
          },
        },
      },
    ];
  }

  // Handler methods
  private async handleGetProducts(args: any) {
    const result = await this.siigoClient.getProducts(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetProduct(args: any) {
    const result = await this.siigoClient.getProduct(args.id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleCreateProduct(args: any) {
    const result = await this.siigoClient.createProduct(args.product);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleUpdateProduct(args: any) {
    const result = await this.siigoClient.updateProduct(args.id, args.product);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleDeleteProduct(args: any) {
    const result = await this.siigoClient.deleteProduct(args.id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleSearchProducts(args: any) {
    const result = await this.siigoClient.searchProducts(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetCustomers(args: any) {
    const result = await this.siigoClient.getCustomers(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetCustomer(args: any) {
    const result = await this.siigoClient.getCustomer(args.id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleCreateCustomer(args: any) {
    const result = await this.siigoClient.createCustomer(args.customer);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleUpdateCustomer(args: any) {
    const result = await this.siigoClient.updateCustomer(args.id, args.customer);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleSearchCustomers(args: any) {
    const result = await this.siigoClient.searchCustomers(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetInvoices(args: any) {
    const result = await this.siigoClient.getInvoices(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetInvoice(args: any) {
    const result = await this.siigoClient.getInvoice(args.id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleCreateInvoice(args: any) {
    const result = await this.siigoClient.createInvoice(args.invoice);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleUpdateInvoice(args: any) {
    const result = await this.siigoClient.updateInvoice(args.id, args.invoice);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleDeleteInvoice(args: any) {
    const result = await this.siigoClient.deleteInvoice(args.id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetInvoicePdf(args: any) {
    const result = await this.siigoClient.getInvoicePdf(args.id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleSendInvoiceEmail(args: any) {
    const { id, mail_to, copy_to } = args;
    const result = await this.siigoClient.sendInvoiceByEmail(id, { mail_to, copy_to });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  // Add similar handlers for all other endpoints...
  private async handleGetCreditNotes(args: any) {
    const result = await this.siigoClient.getCreditNotes(args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleGetCreditNote(args: any) {
    const result = await this.siigoClient.getCreditNote(args.id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleCreateCreditNote(args: any) {
    const result = await this.siigoClient.createCreditNote(args.creditNote);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleGetVouchers(args: any) {
    const result = await this.siigoClient.getVouchers(args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleGetVoucher(args: any) {
    const result = await this.siigoClient.getVoucher(args.id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleCreateVoucher(args: any) {
    const result = await this.siigoClient.createVoucher(args.voucher);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleGetPurchases(args: any) {
    const result = await this.siigoClient.getPurchases(args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleGetPurchase(args: any) {
    const result = await this.siigoClient.getPurchase(args.id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleCreatePurchase(args: any) {
    const result = await this.siigoClient.createPurchase(args.purchase);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleUpdatePurchase(args: any) {
    const result = await this.siigoClient.updatePurchase(args.id, args.purchase);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleDeletePurchase(args: any) {
    const result = await this.siigoClient.deletePurchase(args.id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleGetPaymentReceipts(args: any) {
    const result = await this.siigoClient.getPaymentReceipts(args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleGetPaymentReceipt(args: any) {
    const result = await this.siigoClient.getPaymentReceipt(args.id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleCreatePaymentReceipt(args: any) {
    const result = await this.siigoClient.createPaymentReceipt(args.paymentReceipt);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleUpdatePaymentReceipt(args: any) {
    const result = await this.siigoClient.updatePaymentReceipt(args.id, args.paymentReceipt);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleDeletePaymentReceipt(args: any) {
    const result = await this.siigoClient.deletePaymentReceipt(args.id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleGetJournals(args: any) {
    const result = await this.siigoClient.getJournals(args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleGetJournal(args: any) {
    const result = await this.siigoClient.getJournal(args.id);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleCreateJournal(args: any) {
    const result = await this.siigoClient.createJournal(args.journal);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleGetDocumentTypes(args: any) {
    const result = await this.siigoClient.getDocumentTypes(args.type);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleGetTaxes(args: any) {
    const result = await this.siigoClient.getTaxes();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleGetPaymentTypes(args: any) {
    const result = await this.siigoClient.getPaymentTypes(args.document_type);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleGetCostCenters(args: any) {
    const result = await this.siigoClient.getCostCenters();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleGetUsers(args: any) {
    const result = await this.siigoClient.getUsers();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleGetWarehouses(args: any) {
    const result = await this.siigoClient.getWarehouses();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleGetPriceLists(args: any) {
    const result = await this.siigoClient.getPriceLists();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleGetAccountGroups(args: any) {
    const result = await this.siigoClient.getAccountGroups();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleGetCities(args: any) {
    const result = await this.siigoClient.getCities();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleGetIdTypes(args: any) {
    const result = await this.siigoClient.getIdTypes();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleGetFiscalResponsibilities(args: any) {
    const result = await this.siigoClient.getFiscalResponsibilities();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleGetTrialBalance(args: any) {
    const result = await this.siigoClient.getTrialBalance(args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleGetTrialBalanceByThird(args: any) {
    const result = await this.siigoClient.getTrialBalanceByThird(args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleGetAccountsPayable(args: any) {
    const result = await this.siigoClient.getAccountsPayable(args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new SiigoMCPServer();
server.run().catch(console.error);