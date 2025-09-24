# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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