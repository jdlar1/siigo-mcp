import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SiigoClient } from './siigo-client.js';
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
import { PACKAGE_NAME, PACKAGE_VERSION } from './version.js';

export function createMcpServer(client: SiigoClient): McpServer {
  const server = new McpServer(
    {
      name: PACKAGE_NAME,
      version: PACKAGE_VERSION,
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

  return server;
}
