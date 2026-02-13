# Siigo MCP Server

A Model Context Protocol (MCP) server that provides full integration with the Siigo API, enabling access to Colombian accounting software features including products, customers, invoices, quotations, purchases, credit notes, vouchers, payment receipts, journals, webhooks, and more.

**v3.0.0** - Full Siigo API parity with 68 tools, MCP SDK v1.26, Zod schemas, and complete TypeScript type safety.

## Features

This MCP server provides access to all Siigo API endpoints:

### Core Resources
- **Products**: Full CRUD for products, services, consumer goods, and **Combo** products with components
- **Customers**: Manage customers, suppliers, and third parties
- **Invoices**: Sales invoices with electronic invoicing, **healthcare sector**, **batch creation**, annulment, PDF, XML, and DIAN error queries
- **Quotations**: Full CRUD for quotations (cotizaciones) -- **NEW in v3**
- **Purchases**: Purchase invoices and expenses (including Documentos de Soporte via `document_support` flag)
- **Credit Notes**: Create and query credit notes with PDF support and healthcare sector fields
- **Vouchers**: Cash receipts (recibos de caja) - create and query
- **Payment Receipts**: Payment receipts / disbursements (recibos de pago / comprobantes de egreso) - full CRUD
- **Journals**: Accounting journal entries (comprobantes contables)
- **Webhooks**: Subscribe to and manage webhook events -- **NEW in v3**

### Inventory Management
- **Account Groups**: Create and edit inventory categories -- **NEW in v3**

### Catalogs
- Document types (FV, RC, NC, FC, CC, RP, C)
- Taxes, payment types, cost centers
- Users/sellers, warehouses, price lists
- Account groups, cities, ID types
- Fiscal responsibilities, **fixed assets**

### Reports
- Trial balance reports (general and by third party)
- Accounts payable reports

## Installation

### Option 1: NPX (Recommended - No Installation Required)
```bash
npx siigo-mcp-server
```

### Option 2: Global Installation
```bash
npm install -g siigo-mcp-server
siigo-mcp
```

### Option 3: Local Development / Building from Source
```bash
git clone https://github.com/jdlar1/siigo-mcp.git
cd siigo-mcp
npm install
npm run build
cp .env.example .env
# Edit .env with your Siigo credentials
```

## Configuration

### Required Environment Variables

| Variable | Description |
|---|---|
| `SIIGO_USERNAME` | Your Siigo API username |
| `SIIGO_ACCESS_KEY` | Your Siigo API access key |
| `SIIGO_PARTNER_ID` | Partner ID for API identification (3-100 alphanumeric chars, no spaces) |

### Optional Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SIIGO_BASE_URL` | `https://api.siigo.com` | API base URL |

### Getting Siigo API Credentials

1. Sign up for a Siigo account at [siigo.com](https://siigo.com)
2. Access the API section in your Siigo dashboard
3. Generate your API credentials (username and access key)
4. For testing, use the sandbox environment

## MCP Client Configuration

### Claude Desktop

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "siigo": {
      "command": "npx",
      "args": ["siigo-mcp-server"],
      "env": {
        "SIIGO_USERNAME": "your_username",
        "SIIGO_ACCESS_KEY": "your_access_key",
        "SIIGO_PARTNER_ID": "your_app_name"
      }
    }
  }
}
```

## Available Tools (68 total)

### Products (6 tools)
| Tool | Description | Annotations |
|---|---|---|
| `siigo_get_products` | List products with pagination | read-only |
| `siigo_get_product` | Get a product by ID | read-only |
| `siigo_create_product` | Create product (supports **Combo** type with components) | |
| `siigo_update_product` | Update a product | |
| `siigo_delete_product` | Delete a product | destructive |
| `siigo_search_products` | Search by code, name, or reference (partial match) | read-only |

### Account Groups / Inventory Categories (3 tools)
| Tool | Description | Annotations |
|---|---|---|
| `siigo_get_account_groups` | List inventory categories | read-only |
| `siigo_create_account_group` | Create inventory category | |
| `siigo_update_account_group` | Update inventory category | |

### Customers (5 tools)
| Tool | Description | Annotations |
|---|---|---|
| `siigo_get_customers` | List customers | read-only |
| `siigo_get_customer` | Get a customer by ID | read-only |
| `siigo_create_customer` | Create a customer/third party | |
| `siigo_update_customer` | Update a customer | |
| `siigo_search_customers` | Search by identification, name, or type | read-only |

### Invoices (10 tools)
| Tool | Description | Annotations |
|---|---|---|
| `siigo_get_invoices` | List invoices with date filters | read-only |
| `siigo_get_invoice` | Get an invoice by ID | read-only |
| `siigo_create_invoice` | Create invoice (supports **healthcare** and **transport** sectors) | |
| `siigo_update_invoice` | Update an invoice | |
| `siigo_delete_invoice` | Delete an invoice | destructive |
| `siigo_annul_invoice` | Annul (void) an invoice | destructive |
| `siigo_get_invoice_pdf` | Get invoice PDF (base64) | read-only |
| `siigo_get_invoice_xml` | Get invoice electronic XML (base64) | read-only |
| `siigo_get_invoice_stamp_errors` | Get DIAN rejection errors | read-only |
| `siigo_send_invoice_email` | Send invoice by email (up to 5 addresses) | |

### Batch Invoices (1 tool)
| Tool | Description | Annotations |
|---|---|---|
| `siigo_create_invoice_batch` | Create invoices in batch (async with webhook notification) | |

### Quotations (5 tools)
| Tool | Description | Annotations |
|---|---|---|
| `siigo_get_quotations` | List quotations with date filters | read-only |
| `siigo_get_quotation` | Get a quotation by ID | read-only |
| `siigo_create_quotation` | Create a quotation (document type C) | |
| `siigo_update_quotation` | Update a quotation | |
| `siigo_delete_quotation` | Delete a quotation | destructive |

### Credit Notes (4 tools)
| Tool | Description | Annotations |
|---|---|---|
| `siigo_get_credit_notes` | List credit notes | read-only |
| `siigo_get_credit_note` | Get a credit note by ID | read-only |
| `siigo_create_credit_note` | Create credit note (supports **healthcare** sector, external invoice refs) | |
| `siigo_get_credit_note_pdf` | Get credit note PDF (base64) | read-only |

### Vouchers / Cash Receipts (3 tools)
| Tool | Description | Annotations |
|---|---|---|
| `siigo_get_vouchers` | List cash receipts (recibos de caja) | read-only |
| `siigo_get_voucher` | Get a cash receipt by ID | read-only |
| `siigo_create_voucher` | Create cash receipt (DebtPayment, AdvancePayment, Advanced) | |

### Purchases (5 tools)
| Tool | Description | Annotations |
|---|---|---|
| `siigo_get_purchases` | List purchase invoices | read-only |
| `siigo_get_purchase` | Get a purchase by ID | read-only |
| `siigo_create_purchase` | Create purchase (use FC type with `document_support` for Documento Soporte) | |
| `siigo_update_purchase` | Update a purchase | |
| `siigo_delete_purchase` | Delete a purchase | destructive |

### Payment Receipts / Disbursements (5 tools)
| Tool | Description | Annotations |
|---|---|---|
| `siigo_get_payment_receipts` | List payment receipts (recibos de pago / comprobantes de egreso) | read-only |
| `siigo_get_payment_receipt` | Get a payment receipt by ID | read-only |
| `siigo_create_payment_receipt` | Create payment receipt (DebtPayment, AdvancePayment, Advanced) | |
| `siigo_update_payment_receipt` | Update a payment receipt | |
| `siigo_delete_payment_receipt` | Delete a payment receipt | destructive |

### Journals / Accounting Entries (3 tools)
| Tool | Description | Annotations |
|---|---|---|
| `siigo_get_journals` | List accounting journals (comprobantes contables) | read-only |
| `siigo_get_journal` | Get a journal by ID | read-only |
| `siigo_create_journal` | Create journal entry (debits must equal credits) | |

### Webhooks (4 tools)
| Tool | Description | Annotations |
|---|---|---|
| `siigo_get_webhooks` | List webhook subscriptions | read-only |
| `siigo_create_webhook` | Subscribe to a webhook event | |
| `siigo_update_webhook` | Update a webhook subscription | |
| `siigo_delete_webhook` | Delete a webhook subscription | destructive |

### Catalogs (11 tools + account groups above)
| Tool | Description |
|---|---|
| `siigo_get_document_types` | Document types (FV, RC, NC, FC, CC, RP, C) |
| `siigo_get_taxes` | Taxes (IVA, Retefuente, ReteIVA, ReteICA, etc.) |
| `siigo_get_payment_types` | Payment methods |
| `siigo_get_cost_centers` | Cost centers |
| `siigo_get_users` | Users/sellers |
| `siigo_get_warehouses` | Warehouses |
| `siigo_get_price_lists` | Price lists (up to 12) |
| `siigo_get_cities` | Colombian cities |
| `siigo_get_id_types` | Identification types |
| `siigo_get_fiscal_responsibilities` | Fiscal responsibilities |
| `siigo_get_fixed_assets` | Fixed assets |

### Reports (3 tools)
| Tool | Description |
|---|---|
| `siigo_get_trial_balance` | Trial balance report (Excel) |
| `siigo_get_trial_balance_by_third` | Trial balance by third party (Excel) |
| `siigo_get_accounts_payable` | Accounts payable report |

## Document Types Reference

| Code | Spanish Name | English Name | MCP Support |
|---|---|---|---|
| `FV` | Factura de Venta | Sales Invoice | Full CRUD + PDF/XML/Email/Batch/Annul |
| `RC` | Recibo de Caja | Cash Receipt | Create + Query |
| `NC` | Nota Credito | Credit Note | Create + Query + PDF |
| `FC` | Factura de Compra | Purchase Invoice | Full CRUD |
| `CC` | Comprobante Contable | Accounting Journal | Create + Query |
| `RP` | Recibo de Pago/Egreso | Payment Receipt | Full CRUD |
| `C` | Cotizacion | Quotation | Full CRUD |

## Example Usage

### Create a Quotation
```json
{
  "name": "siigo_create_quotation",
  "arguments": {
    "quotation": {
      "document": { "id": 12345 },
      "date": "2026-02-13",
      "customer": { "identification": "13832081", "branch_office": 0 },
      "seller": 629,
      "items": [{
        "code": "PROD001",
        "quantity": 5,
        "price": 50000,
        "taxes": [{ "id": 13156 }]
      }]
    }
  }
}
```

### Create a Combo Product
```json
{
  "name": "siigo_create_product",
  "arguments": {
    "product": {
      "code": "COMBO-001",
      "name": "Kit de oficina",
      "account_group": 1253,
      "type": "Combo",
      "components": [
        { "code": "PROD-001", "quantity": 2 },
        { "code": "PROD-002", "quantity": 1 }
      ]
    }
  }
}
```

### Create a Healthcare Invoice
```json
{
  "name": "siigo_create_invoice",
  "arguments": {
    "invoice": {
      "document": { "id": 24446 },
      "date": "2026-02-13",
      "customer": { "identification": "13832081" },
      "seller": 629,
      "items": [{ "code": "SRV001", "quantity": 1, "price": 150000 }],
      "payments": [{ "id": 5636, "value": 150000 }],
      "healthcare_company": {
        "operation_type": "SS-CUFE",
        "period_start": "2026-01-01",
        "period_end": "2026-01-31"
      }
    }
  }
}
```

### Create Batch Invoices
```json
{
  "name": "siigo_create_invoice_batch",
  "arguments": {
    "notification_url": "https://myapp.com/webhooks/siigo-batch",
    "invoices": [
      {
        "idempotency_key": "INV202602001",
        "document": { "id": 24446 },
        "date": "2026-02-13",
        "customer": { "identification": "13832081" },
        "seller": 629,
        "items": [{ "code": "PROD001", "quantity": 1, "price": 50000 }],
        "payments": [{ "id": 5636, "value": 50000 }]
      }
    ]
  }
}
```

## API Rate Limits

- **Production**: 100 requests per minute per company
- **Sandbox**: 10 requests per minute

The server uses a 120-second HTTP timeout as recommended by Siigo for long-running operations.

## Error Handling

The server handles Siigo API errors and returns structured error responses with error codes, messages, and details. See the [Siigo API docs](https://siigoapi.docs.apiary.io/#introduction/codigos-de-error) for a full list of error codes.

## Development

### Project Structure

```
siigo-mcp/
├── src/
│   ├── index.ts          # MCP server - tool registration with Zod schemas
│   ├── siigo-client.ts   # HTTP client for all Siigo API endpoints
│   └── types.ts          # Full TypeScript interfaces for all document types
├── dist/                 # Compiled output (ESM)
├── package.json
├── tsconfig.json
├── CHANGELOG.md
└── README.md
```

### Building

```bash
npm run build
```

### Running for Development

```bash
npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run build` to verify
5. Submit a pull request

## License

MIT License

## Support

- **Siigo API**: Contact soporteapi@siigo.com
- **This MCP server**: [Create an issue](https://github.com/jdlar1/siigo-mcp/issues)

## Links

- [Siigo API Documentation](https://siigoapi.docs.apiary.io/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [Siigo Official Website](https://siigo.com/)
