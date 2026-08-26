# Siigo MCP Server

A Model Context Protocol (MCP) server that provides full integration with the Siigo API, enabling access to Colombian accounting software features including products, customers, invoices, quotations, purchases, credit notes, vouchers, payment receipts, journals, webhooks, and more.

**v4.0.0** — 71 verified tools, strict current Siigo contracts, Resolution 948 healthcare support, full sales and accounting resources, safe retries/idempotency, MCP cancellation, and public TypeScript/Zod interfaces.

## Features

This MCP server covers the current documented Siigo Colombia API surface listed in [the coverage matrix](docs/API_COVERAGE.md). Source conflicts are resolved using the published [source-of-truth policy](docs/SOURCE_OF_TRUTH.md).

It is intentionally broader than [Siigo's official MCP](https://developers.siigo.com/docs/siigoapi/MCP/1-documentation/), whose current documentation lists read operations for products, create/read/update for customers, and create/read for sales invoices. This server covers 15 Siigo resource families through 71 tools, including accounting, purchasing, catalogs, reports, webhooks, and the extended invoice lifecycle.

### Core Resources
- **Products**: Full CRUD for products, services, consumer goods, and **Combo** products with components
- **Customers**: Manage customers, suppliers, and third parties
- **Invoices**: Sales invoices with electronic invoicing, **healthcare sector**, **batch creation**, annulment, PDF, XML, and DIAN error queries
- **Quotations**: Full CRUD for quotations (cotizaciones)
- **Purchase Support Documents**: Full CRUD for documentos soporte (`/purchase-support-documents`)
- **Purchases**: Purchase invoices and expenses
- **Credit Notes**: Create and query credit notes with PDF support and healthcare sector fields
- **Vouchers**: Cash receipts (recibos de caja), including debt payments, advance payments, and miscellaneous income
- **Payment Receipts**: Payment receipts / disbursements (recibos de pago / comprobantes de egreso) - full CRUD
- **Journals**: Accounting journal entries (comprobantes contables)
- **Webhooks**: Subscribe to and manage webhook events

### Inventory Management
- **Account Groups**: Create and edit inventory categories

### Catalogs
- Document types (FV, RC, NC, FC, CC, RP, C, DS)
- Taxes, payment types, cost centers
- Users/sellers, warehouses, price lists
- Account groups, **fixed assets**, expenses, miscellaneous income concepts

### Reports
- Trial balance reports (general and by third party)
- Accounts payable reports

## Installation

### Option 1: NPX (Recommended - No Installation Required)
```bash
npx @jdlar/siigo-mcp
```

### Option 2: Global Installation
```bash
npm install -g @jdlar/siigo-mcp
siigo-mcp
```

### Option 3: Local Development / Building from Source
```bash
git clone https://github.com/jdlar1/siigo-mcp.git
cd siigo-mcp
pnpm install
pnpm build
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
| `SIIGO_REQUESTS_PER_MINUTE` | `100` | Client-side requests per rolling minute (1-100); set `10` for Siigo test companies |
| `MCP_TRANSPORT` | `stdio` | MCP transport: `stdio` or stateless Streamable HTTP (`http`) |
| `MCP_HOST` | `127.0.0.1` | HTTP bind address |
| `MCP_PORT` | `PORT` or `3000` | HTTP listening port |
| `MCP_AUTH_TOKEN` | — | Bearer token for HTTP requests; required when binding outside loopback |
| `MCP_ALLOWED_HOSTS` | — | Optional comma-separated HTTP Host allowlist |

Siigo documents a limit of 100 requests per minute in production and 10 requests per minute for test companies. The client defaults to 100; set `SIIGO_REQUESTS_PER_MINUTE=10` when using a test company. Values outside 1-100 are rejected at startup.

### Getting Siigo API Credentials

1. Sign up for a Siigo account at [siigo.com](https://siigo.com)
2. Access the API section in your Siigo dashboard
3. Generate your API credentials (username and access key)
4. For testing, use the sandbox environment

## MCP Client Configuration

### Stateless Streamable HTTP

The default transport remains stdio. To run a stateless HTTP endpoint locally:

```bash
MCP_TRANSPORT=http pnpm start
```

The endpoint is available at `http://127.0.0.1:3000/mcp`. Each POST uses a fresh MCP server and transport, does not issue an MCP session ID, and returns a JSON response instead of retaining an SSE session.

For a network-accessible deployment, set an explicit bearer token:

```bash
MCP_TRANSPORT=http \
MCP_HOST=0.0.0.0 \
MCP_PORT=3000 \
MCP_AUTH_TOKEN=replace_with_a_long_random_token \
pnpm start
```

Clients must send `Authorization: Bearer <token>`. Terminate TLS at a trusted reverse proxy or hosting platform; do not expose the endpoint over plaintext HTTP.

### Claude Desktop

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "siigo": {
      "command": "npx",
      "args": ["@jdlar/siigo-mcp"],
      "env": {
        "SIIGO_USERNAME": "your_username",
        "SIIGO_ACCESS_KEY": "your_access_key",
        "SIIGO_PARTNER_ID": "yourappname"
      }
    }
  }
}
```

## TypeScript library API

v4 exposes a side-effect-free library entrypoint as well as the executable:

```ts
import { SiigoClient, type SiigoInvoiceInput } from '@jdlar/siigo-mcp';
import { invoiceSchemas } from '@jdlar/siigo-mcp/schemas';

const client = new SiigoClient({
  username: process.env.SIIGO_USERNAME!,
  accessKey: process.env.SIIGO_ACCESS_KEY!,
  partnerId: process.env.SIIGO_PARTNER_ID!,
  baseUrl: 'https://api.siigo.com',
});
declare const input: unknown;
const invoice: SiigoInvoiceInput = invoiceSchemas.invoiceInputSchema.parse(input);
const created = await client.createInvoice(invoice, { idempotencyKey: 'Invoice2026082601' });
```

Supported subpath exports are `client`, `contracts`, `server`, `http`, `results`, `schemas`, `types`, and `version`.

## Available Tools (71 total)

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
| `siigo_create_voucher` | Create cash receipt (DebtPayment, AdvancePayment, MiscIncome) | |

### Purchase Support Documents (4 tools)
| Tool | Description | Annotations |
|---|---|---|
| `siigo_get_purchase_support_document` | Get a purchase support document by ID | read-only |
| `siigo_create_purchase_support_document` | Create purchase support document (document type DS) | |
| `siigo_update_purchase_support_document` | Update a purchase support document | |
| `siigo_delete_purchase_support_document` | Delete a purchase support document | destructive |

### Purchases (5 tools)
| Tool | Description | Annotations |
|---|---|---|
| `siigo_get_purchases` | List purchase invoices | read-only |
| `siigo_get_purchase` | Get a purchase by ID | read-only |
| `siigo_create_purchase` | Create a purchase invoice | |
| `siigo_update_purchase` | Update a purchase | |
| `siigo_delete_purchase` | Delete a purchase | destructive |

### Payment Receipts / Disbursements (5 tools)
| Tool | Description | Annotations |
|---|---|---|
| `siigo_get_payment_receipts` | List payment receipts (recibos de pago / comprobantes de egreso) | read-only |
| `siigo_get_payment_receipt` | Get a payment receipt by ID | read-only |
| `siigo_create_payment_receipt` | Create payment receipt (DebtPayment, AdvancePayment, Detailed) | |
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

### Catalogs (10 tools + account groups above)
| Tool | Description |
|---|---|
| `siigo_get_document_types` | Document types (FV, RC, NC, FC, CC, RP, C, DS) |
| `siigo_get_taxes` | Taxes (IVA, Retefuente, ReteIVA, ReteICA, etc.) |
| `siigo_get_payment_types` | Payment methods |
| `siigo_get_cost_centers` | Cost centers |
| `siigo_get_users` | Users/sellers |
| `siigo_get_warehouses` | Warehouses |
| `siigo_get_price_lists` | Price lists (up to 12) |
| `siigo_get_expenses` | Expenses for cash receipt adjustments |
| `siigo_get_misc_income` | Miscellaneous income concepts for cash receipts |
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
| `DS` | Documento Soporte | Purchase Support Document | Full CRUD |

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
        "period_end": "2026-01-31",
        "payment_method": "04",
        "service_plan": "16",
        "contract_number": "CONTRACT-2026-001",
        "copayment": 150000
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
│   ├── cli.ts            # stdio / HTTP executable entrypoint
│   ├── index.ts          # side-effect-free public library exports
│   ├── mcp-server.ts     # MCP server factory and tool registration
│   ├── http-server.ts    # Stateless Streamable HTTP application
│   ├── siigo-client.ts   # HTTP client for all Siigo API endpoints
│   ├── contracts.ts      # exact inferred request contract types
│   ├── schemas/          # strict Zod API contracts
│   ├── tools/            # resource-specific MCP registrations
│   └── types.ts          # Siigo response and shared interfaces
├── docs/                 # source policy and API coverage matrix
├── test/                 # compiled-output Jest contract tests
├── dist/                 # Compiled output (ESM)
├── package.json
├── tsconfig.json
├── CHANGELOG.md
└── README.md
```

### Building

```bash
pnpm build
```

### Running for Development

```bash
pnpm dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `pnpm lint && pnpm test` to verify
5. Submit a pull request

## License

MIT License

## Support

- **Siigo API**: Contact soporteapi@siigo.com
- **This MCP server**: [Create an issue](https://github.com/jdlar1/siigo-mcp/issues)

## Links

- [Current Siigo API Documentation](https://developers.siigo.com/docs/siigoapi/)
- [Siigo Apiary Blueprint](https://siigoapi.docs.apiary.io/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [Siigo Official Website](https://siigo.com/)
