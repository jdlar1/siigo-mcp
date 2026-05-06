#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as dotenv from 'dotenv';
import { SiigoClient } from './siigo-client.js';
import { registerAccountGroupTools } from './tools/account-groups.js';
import { registerCatalogTools } from './tools/catalogs.js';
import { registerCreditNoteTools } from './tools/credit-notes.js';
import { registerCustomerTools } from './tools/customers.js';
import { registerInvoiceTools } from './tools/invoices.js';
import { registerJournalTools } from './tools/journals.js';
import { registerPaymentReceiptTools } from './tools/payment-receipts.js';
import { registerProductTools } from './tools/products.js';
import { registerPurchaseSupportDocumentTools } from './tools/purchase-support-documents.js';
import { registerPurchaseTools } from './tools/purchases.js';
import { registerQuotationTools } from './tools/quotations.js';
import { registerReportTools } from './tools/reports.js';
import { registerVoucherTools } from './tools/vouchers.js';
import { registerWebhookTools } from './tools/webhooks.js';
import type { SiigoConfig } from './types.js';

dotenv.config();

// ─── Config ────────────────────────────────────────────────────────────────

const config: SiigoConfig = {
  username: process.env.SIIGO_USERNAME || '',
  accessKey: process.env.SIIGO_ACCESS_KEY || '',
  baseUrl: process.env.SIIGO_BASE_URL || 'https://api.siigo.com',
  partnerId: process.env.SIIGO_PARTNER_ID || '',
};

if (!config.username || !config.accessKey || !config.partnerId) {
  console.error('SIIGO_USERNAME, SIIGO_ACCESS_KEY, and SIIGO_PARTNER_ID environment variables are required');
  process.exit(1);
}

const client = new SiigoClient(config);

// ─── Server ────────────────────────────────────────────────────────────────

const server = new McpServer(
  {
    name: '@jdlar/siigo-mcp',
    version: '3.2.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

registerProductTools({ server, client });
registerAccountGroupTools({ server, client });
registerCustomerTools({ server, client });
registerInvoiceTools({ server, client });
registerQuotationTools({ server, client });
registerCreditNoteTools({ server, client });
registerVoucherTools({ server, client });
registerPurchaseTools({ server, client });
registerPurchaseSupportDocumentTools({ server, client });
registerPaymentReceiptTools({ server, client });
registerJournalTools({ server, client });
registerWebhookTools({ server, client });
registerCatalogTools({ server, client });
registerReportTools({ server, client });

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
