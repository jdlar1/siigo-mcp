# Siigo MCP Server Usage

## Quick Start

### Option 1: NPX (Recommended - No Installation Required)
```bash
# Set environment variables and run directly
SIIGO_USERNAME=your_username SIIGO_ACCESS_KEY=your_key SIIGO_PARTNER_ID=yourapp npx @jdlar/siigo-mcp
```

### Option 2: Global Installation
```bash
# 1. Install globally
npm install -g @jdlar/siigo-mcp

# 2. Set environment variables and run
SIIGO_USERNAME=your_username SIIGO_ACCESS_KEY=your_key SIIGO_PARTNER_ID=yourapp siigo-mcp
```

### Option 3: Environment File
```bash
# Create .env file with your credentials
echo "SIIGO_USERNAME=your_username" > .env
echo "SIIGO_ACCESS_KEY=your_key" >> .env
echo "SIIGO_PARTNER_ID=yourapp" >> .env
# For a Siigo test company, also set SIIGO_REQUESTS_PER_MINUTE=10.

# Run with npx
npx @jdlar/siigo-mcp

# Or run with global installation
siigo-mcp
```

The client defaults to Siigo's documented production limit of 100 requests per rolling minute. Set `SIIGO_REQUESTS_PER_MINUTE=10` for test companies; values outside 1-100 are rejected.

## MCP Client Configuration

### Stateless Streamable HTTP

Build the project, then start the HTTP transport:

```bash
pnpm build
MCP_TRANSPORT=http MCP_AUTH_TOKEN=replace_with_a_long_random_token pnpm start
```

Connect the MCP client to `http://127.0.0.1:3000/mcp` and send the configured token as a bearer token. Set `MCP_HOST=0.0.0.0` for container deployments; a non-loopback bind requires `MCP_AUTH_TOKEN`. `MCP_ALLOWED_HOSTS` may contain a comma-separated Host-header allowlist.

### Claude Desktop Configuration
Add to your Claude Desktop config file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

#### Option A: Using NPX (Recommended)
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

#### Option B: Using Global Installation
```json
{
  "mcpServers": {
    "siigo": {
      "command": "siigo-mcp",
      "env": {
        "SIIGO_USERNAME": "your_username",
        "SIIGO_ACCESS_KEY": "your_access_key",
        "SIIGO_PARTNER_ID": "yourappname"
      }
    }
  }
}
```

### Other MCP Clients
For other MCP clients, use either:

**NPX (Recommended):**
- **Command**: `npx`
- **Args**: `["@jdlar/siigo-mcp"]`
- **Transport**: stdio
- **Environment**: Set `SIIGO_USERNAME`, `SIIGO_ACCESS_KEY`, and `SIIGO_PARTNER_ID`

**Global Installation:**
- **Command**: `siigo-mcp`
- **Transport**: stdio
- **Environment**: Set `SIIGO_USERNAME`, `SIIGO_ACCESS_KEY`, and `SIIGO_PARTNER_ID`

## Available Tools

The server provides 71 verified tools for Siigo API integration:

- **Products**: `siigo_get_products`, `siigo_create_product`, etc.
- **Customers**: `siigo_get_customers`, `siigo_create_customer`, etc.  
- **Invoices**: `siigo_get_invoices`, `siigo_create_invoice`, etc.
- **Sales**: quotations, credit notes, invoice batch/PDF/XML/mail/annulment
- **Accounting**: purchases, support documents, cash/payment receipts, journals, catalogs, reports, and webhooks

See [docs/API_COVERAGE.md](docs/API_COVERAGE.md) for the route-by-route matrix and [docs/SOURCE_OF_TRUTH.md](docs/SOURCE_OF_TRUTH.md) for contract precedence and known Siigo documentation conflicts.

## Example Commands

### Get All Products
```
Use the siigo_get_products tool to list all products
```

### Create a Customer
```
Use siigo_create_customer with customer data including name, identification, address, phones, and contacts
```

### Generate Invoice
```
Use siigo_create_invoice with document type, customer, items, and payment information
```

For detailed API documentation, see the main README.md file.
