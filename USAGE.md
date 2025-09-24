# Siigo MCP Server Usage

## Quick Start

### Option 1: NPX (Recommended - No Installation Required)
```bash
# Set environment variables and run directly
SIIGO_USERNAME=your_username SIIGO_ACCESS_KEY=your_key SIIGO_PARTNER_ID=your_app npx siigo-mcp-server
```

### Option 2: Global Installation
```bash
# 1. Install globally
npm install -g siigo-mcp-server

# 2. Set environment variables and run
SIIGO_USERNAME=your_username SIIGO_ACCESS_KEY=your_key SIIGO_PARTNER_ID=your_app siigo-mcp
```

### Option 3: Environment File
```bash
# Create .env file with your credentials
echo "SIIGO_USERNAME=your_username" > .env
echo "SIIGO_ACCESS_KEY=your_key" >> .env
echo "SIIGO_PARTNER_ID=your_app" >> .env

# Run with npx
npx siigo-mcp-server

# Or run with global installation
siigo-mcp
```

## MCP Client Configuration

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

#### Option B: Using Global Installation
```json
{
  "mcpServers": {
    "siigo": {
      "command": "siigo-mcp",
      "env": {
        "SIIGO_USERNAME": "your_username",
        "SIIGO_ACCESS_KEY": "your_access_key",
        "SIIGO_PARTNER_ID": "your_app_name"
      }
    }
  }
}
```

### Other MCP Clients
For other MCP clients, use either:

**NPX (Recommended):**
- **Command**: `npx`
- **Args**: `["siigo-mcp-server"]`
- **Transport**: stdio
- **Environment**: Set `SIIGO_USERNAME`, `SIIGO_ACCESS_KEY`, and `SIIGO_PARTNER_ID`

**Global Installation:**
- **Command**: `siigo-mcp`
- **Transport**: stdio
- **Environment**: Set `SIIGO_USERNAME`, `SIIGO_ACCESS_KEY`, and `SIIGO_PARTNER_ID`

## Available Tools

The server provides 40+ tools for Siigo API integration:

- **Products**: `siigo_get_products`, `siigo_create_product`, etc.
- **Customers**: `siigo_get_customers`, `siigo_create_customer`, etc.  
- **Invoices**: `siigo_get_invoices`, `siigo_create_invoice`, etc.
- **And many more...**

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