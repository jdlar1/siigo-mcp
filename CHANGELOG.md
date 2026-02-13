# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-02-13

### BREAKING CHANGES
- **MCP SDK upgraded from v0.6 to v1.26** - Uses the new `McpServer` high-level API with `registerTool()` and Zod input schemas. The low-level `Server` class with `ListToolsRequestSchema`/`CallToolRequestSchema` handlers has been replaced.
- **Package is now ESM** - Added `"type": "module"` to package.json, switched tsconfig to `module: "Node16"`.
- **`zod` is now a required dependency** (peer dependency of the new MCP SDK).
- **Report endpoints fixed** - Trial balance reports now use `POST` method and correct API paths (`/v1/test-balance-report`, `/v1/test-balance-report-by-thirdparty`) as per the Siigo API spec. Previously used `GET` with incorrect paths.
- **Bin entry point changed** - `siigo-mcp` bin now points directly to `dist/index.js` instead of a wrapper script.

### Added - New Endpoints (17 new tools, total 68 tools)

#### Quotations (Cotizaciones) - 5 tools
- `siigo_get_quotations` - List quotations with date filters
- `siigo_get_quotation` - Get a specific quotation by ID
- `siigo_create_quotation` - Create a new quotation (document type C)
- `siigo_update_quotation` - Update an existing quotation
- `siigo_delete_quotation` - Delete a quotation

#### Inventory Categories (Categorias de Inventario) - 2 tools
- `siigo_create_account_group` - Create a new inventory category
- `siigo_update_account_group` - Update an existing inventory category

#### Invoice Enhancements - 4 tools
- `siigo_create_invoice_batch` - Create invoices in batch asynchronously with webhook notification
- `siigo_annul_invoice` - Annul (void) a sales invoice
- `siigo_get_invoice_xml` - Get invoice electronic XML as base64
- `siigo_get_invoice_stamp_errors` - Get DIAN rejection errors for failed electronic invoices

#### Credit Note Enhancements - 1 tool
- `siigo_get_credit_note_pdf` - Get credit note PDF as base64

#### Catalog Enhancements - 1 tool
- `siigo_get_fixed_assets` - Get fixed assets catalog

#### Webhooks - 4 tools
- `siigo_get_webhooks` - List webhook subscriptions
- `siigo_create_webhook` - Subscribe to a webhook event
- `siigo_update_webhook` - Update a webhook subscription
- `siigo_delete_webhook` - Delete a webhook subscription

### Enhanced - Existing Endpoints

#### Combo Products
- `siigo_create_product` and `siigo_update_product` now support `type: "Combo"` with a `components` array containing `code` and `quantity` for each component product.

#### Healthcare Sector (Sector Salud)
- `siigo_create_invoice` and `siigo_create_credit_note` now support `healthcare_company` object with fields: `operation_type` (SS-CUFE, SS-SinAporte, SS-Recaudo), `period_start`, `period_end`, `payment_method`, `service_plan`, `policy_number`, `contract_number`, `copayment`, `coinsurance`, `cost_sharing`, `recovery_charge`.

#### Document Type Filter
- `siigo_get_document_types` now supports `RP` (payment receipt) and `C` (quotation) type codes in addition to FV, RC, NC, FC, CC.

#### Credit Notes
- `siigo_create_credit_note` now supports `invoice_data` for referencing external invoices not in Siigo, and `reason` field.

### Changed - Architecture & Code Quality

#### MCP SDK Upgrade (0.6 -> 1.26)
- Migrated from low-level `Server` with manual request handlers to high-level `McpServer` with `registerTool()` pattern
- All tool input schemas now use Zod for runtime validation
- Added tool annotations (`readOnlyHint`, `destructiveHint`) for all 59 tools
- Server version now correctly reports `3.0.0`

#### Full TypeScript Type Safety
- Added proper interfaces for all document types: `SiigoQuotation`, `SiigoVoucher`, `SiigoPaymentReceipt`, `SiigoCreditNote`, `SiigoPurchase`, `SiigoJournal`, `SiigoWebhook`, `SiigoBatchInvoiceRequest`, `SiigoAccountGroupIn`, `SiigoFixedAsset`, and more
- Replaced all `any` types in `siigo-client.ts` with proper typed interfaces
- Added comprehensive types for catalogs, reports, and shared structures

#### Bug Fixes
- Fixed server version reporting `1.0.0` instead of actual version
- Fixed trial balance report endpoints using wrong HTTP method (`GET` -> `POST`)
- Fixed trial balance report endpoint paths to match Siigo API spec
- Added 120s timeout to HTTP client as recommended by Siigo API docs

### Migration Guide
If upgrading from v2.x.x:
1. Run `npm install` to get the new SDK and zod dependencies
2. If importing types, note that many `any` types have been replaced with proper interfaces
3. The bin entry point has changed - if you reference it directly, update paths accordingly
4. Report tools may behave differently as they now use the correct HTTP method (POST)

## [2.1.0] - 2024-09-17

### Added
- **NEW: Enhanced search functionality for customers and products**
  - `siigo_search_customers` - Search customers by identification, name, or type
  - `siigo_search_products` - Search products by code, name, or reference
  - Client-side filtering for partial matches and comprehensive search capabilities
  - Pagination support for search results
- Added usage examples for search functionality in README
- Improved documentation with search tool descriptions

### Enhanced
- Better customer and product discovery without manual list parsing
- Partial matching capabilities for all text-based searches
- Flexible search parameters (all optional for broad or narrow searches)

## [2.0.0] - 2024-09-17

### BREAKING CHANGES
- **SIIGO_PARTNER_ID environment variable is now required**
  - Previously optional with default value 'siigo-mcp-server'
  - Now mandatory to comply with Siigo API requirements
  - Must be 3-100 alphanumeric characters, no spaces or special characters

### Changed
- Updated validation to require SIIGO_PARTNER_ID environment variable
- Updated documentation to reflect required Partner-Id
- Updated .env.example to show SIIGO_PARTNER_ID as required
- Updated all usage examples to include SIIGO_PARTNER_ID

### Migration Guide
If upgrading from v1.x.x, you need to:
1. Set the SIIGO_PARTNER_ID environment variable
2. Update your MCP client configuration to include SIIGO_PARTNER_ID

## [1.0.0] - 2024-09-17

### Added
- Initial release of Siigo MCP Server
- Support for all major Siigo API endpoints:
  - Products management
  - Customer management  
  - Invoice management with electronic invoicing
  - Purchase invoices
  - Credit notes
  - Cash receipts (vouchers)
  - Payment receipts/disbursements
  - Accounting journal entries
  - Catalogs (document types, taxes, payment types, etc.)
  - Financial reports (trial balance, accounts payable)
- 40+ MCP tools for Siigo API integration
- NPX support for easy execution without installation
- Global installation support
- Comprehensive TypeScript implementation
- Environment variable configuration
- Automatic token management and refresh
- Error handling and validation