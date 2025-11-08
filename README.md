# Siigo MCP Server

A Model Context Protocol (MCP) server that provides integration with the Siigo API, enabling access to Colombian accounting software features including products, customers, invoices, purchases, credit notes, vouchers, payment receipts, and journals.

<a href="https://glama.ai/mcp/servers/@jdlar1/siigo-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@jdlar1/siigo-mcp/badge" alt="Siigo Server MCP server" />
</a>

## Features

This MCP server provides access to all major Siigo API endpoints:

### Core Resources
- **Products**: Create, read, update, and delete products/services
- **Customers**: Manage customer/supplier information
- **Invoices**: Handle sales invoices with electronic invoicing support
- **Purchases**: Manage purchase invoices and expenses
- **Credit Notes**: Create and manage credit notes
- **Vouchers**: Handle cash receipts (recibos de caja)
- **Payment Receipts**: Manage payment receipts/disbursements
- **Journals**: Handle accounting journal entries

### Catalogs
- Document types, taxes, payment types
- Cost centers, users, warehouses
- Price lists, account groups, cities
- ID types, fiscal responsibilities

### Reports
- Trial balance reports
- Trial balance by third party
- Accounts payable reports

## Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd siigo-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the TypeScript code:
```bash
npm run build
```

4. Set up environment variables by copying the example file:
```bash
cp .env.example .env
```

5. Edit `.env` with your Siigo credentials:
```bash
SIIGO_USERNAME=your_siigo_username
SIIGO_ACCESS_KEY=your_siigo_access_key
SIIGO_BASE_URL=https://api.siigo.com
SIIGO_PARTNER_ID=your_app_name
```

## Configuration

### Required Environment Variables

- `SIIGO_USERNAME`: Your Siigo API username
- `SIIGO_ACCESS_KEY`: Your Siigo API access key

### Optional Environment Variables

- `SIIGO_BASE_URL`: API base URL (defaults to `https://api.siigo.com`)
- `SIIGO_PARTNER_ID`: Partner ID for API identification (defaults to `siigo-mcp-server`)

### Getting Siigo API Credentials

1. Sign up for a Siigo account at [siigo.com](https://siigo.com)
2. Access the API section in your Siigo dashboard
3. Generate your API credentials (username and access key)
4. For testing, you can use the sandbox environment

## Usage

### Running the Server

Start the MCP server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

### Available Tools

The server provides 40+ tools for interacting with the Siigo API. Here are some examples:

#### Products
- `siigo_get_products` - List all products
- `siigo_get_product` - Get a specific product by ID
- `siigo_create_product` - Create a new product
- `siigo_update_product` - Update an existing product
- `siigo_delete_product` - Delete a product

#### Customers
- `siigo_get_customers` - List all customers
- `siigo_get_customer` - Get a specific customer by ID
- `siigo_create_customer` - Create a new customer
- `siigo_update_customer` - Update an existing customer

#### Invoices
- `siigo_get_invoices` - List all invoices
- `siigo_get_invoice` - Get a specific invoice by ID
- `siigo_create_invoice` - Create a new invoice
- `siigo_update_invoice` - Update an existing invoice
- `siigo_delete_invoice` - Delete an invoice
- `siigo_get_invoice_pdf` - Get invoice PDF
- `siigo_send_invoice_email` - Send invoice by email

#### Catalogs
- `siigo_get_document_types` - Get document types
- `siigo_get_taxes` - Get tax information
- `siigo_get_payment_types` - Get payment methods
- `siigo_get_cost_centers` - Get cost centers
- `siigo_get_users` - Get system users

#### Reports
- `siigo_get_trial_balance` - Generate trial balance report
- `siigo_get_accounts_payable` - Get accounts payable report

### Example Usage

#### Creating a Product
```json
{
  "name": "siigo_create_product",
  "arguments": {
    "product": {
      "code": "PROD001",
      "name": "Test Product",
      "account_group": 1253,
      "type": "Product",
      "active": true,
      "description": "A test product"
    }
  }
}
```

#### Creating a Customer
```json
{
  "name": "siigo_create_customer",
  "arguments": {
    "customer": {
      "person_type": "Person",
      "id_type": "13",
      "identification": "12345678",
      "name": ["John", "Doe"],
      "address": {
        "address": "123 Main St",
        "city": {
          "country_code": "Co",
          "state_code": "11",
          "city_code": "11001"
        }
      },
      "phones": [{"number": "1234567890"}],
      "contacts": [{
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com"
      }]
    }
  }
}
```

## API Rate Limits

Siigo API has the following rate limits:
- Production: 100 requests per minute per company
- Sandbox: 10 requests per minute

## Error Handling

The server handles various Siigo API errors and returns structured error responses. Common error scenarios include:

- Authentication failures
- Invalid parameters
- Rate limit exceeded
- Resource not found
- Validation errors

## Development

### Project Structure

```
siigo-mcp/
├── src/
│   ├── index.ts          # Main MCP server implementation
│   ├── siigo-client.ts   # Siigo API client
│   └── types.ts          # TypeScript type definitions
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License

## Support

For issues related to:
- Siigo API: Contact Siigo support at soporteapi@siigo.com
- This MCP server: Create an issue in this repository

## Links

- [Siigo API Documentation](https://siigoapi.docs.apiary.io/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Siigo Official Website](https://siigo.com/)