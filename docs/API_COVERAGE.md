# Siigo Colombia API coverage

Release: 4.0.0
Reconciled: 2026-08-26 (UTC)
Public MCP tools: 71

This matrix covers the current public Siigo Colombia API resources. Authentication is handled internally by the client and is not exposed as a tool. `siigo_search_products` and `siigo_search_customers` are MCP conveniences built on the corresponding paginated list endpoints.

| Resource | Siigo route(s) | MCP operations | Tools |
| --- | --- | --- | ---: |
| Products | `/v1/products`, `/v1/products/{id}` | list, get, create, replace, delete, paginated partial search | 6 |
| Account groups | `/v1/account-groups`, `/v1/account-groups/{id}` | list, create, update | 3 |
| Customers / third parties | `/v1/customers`, `/v1/customers/{id}` | list, get, create, replace, paginated partial search | 5 |
| Sales invoices | `/v1/invoices`, `/{id}`, `/{id}/annul`, `/{id}/pdf`, `/{id}/xml`, `/{id}/stamp/errors`, `/{id}/mail` | list, get, create, replace, delete, annul, PDF, XML, stamp errors, email | 10 |
| Batch invoices | `/v1/invoices/batch` | asynchronous batch create | 1 |
| Quotations | `/v1/quotations`, `/v1/quotations/{id}` | list, get, create, replace, delete | 5 |
| Credit notes | `/v1/credit-notes`, `/{id}`, `/{id}/pdf` | list, get, create, PDF | 4 |
| Cash receipts | `/v1/vouchers`, `/v1/vouchers/{id}`, `/v1/vouchers?type=MiscIncome` | list, get, create DebtPayment / AdvancePayment / MiscIncome | 3 |
| Purchases | `/v1/purchases`, `/v1/purchases/{id}` | list, get, create, update, delete | 5 |
| Purchase support documents | `/v1/purchase-support-documents`, `/v1/purchase-support-documents/{id}` | get by ID, create, update, delete | 4 |
| Payment receipts / disbursements | `/v1/payment-receipts`, `/{id}` | list, get, create, update, delete | 5 |
| Journals | `/v1/journals`, `/v1/journals/{id}` | list, get, create | 3 |
| Webhooks | `/v1/webhooks`, `/v1/webhooks/{id}` | list, create, update, delete | 4 |
| Catalogs | `/v1/document-types`, `/v1/taxes`, `/v1/payment-types`, `/v1/cost-centers`, `/v1/users`, `/v1/warehouses`, `/v1/price-lists`, `/v1/fixed-assets`, `/v1/expenses`, `/v1/misc-incomes` | read | 10 |
| Reports | `/v1/test-balance-report`, `/v1/test-balance-report-by-thirdparty`, `/v1/accounts-payable` | trial balance, trial balance by third party, accounts payable | 3 |
| **Total** |  |  | **71** |

## Contract features included

- Current Resolution 948 healthcare fields and conditional validation for invoices and credit notes.
- CUCON customer custom fields, full replacement semantics, and documented list filters.
- Full invoice, quotation, product, purchase, support-document, voucher, payment-receipt, and journal item shapes.
- Document-specific idempotency keys for invoice, credit-note, voucher, and journal POST requests.
- Pagination and documented creation/update/date filters where Siigo exposes them.
- Strict unknown-field rejection at the MCP boundary, accurate destructive/read-only/idempotent annotations, and abort propagation.
- Concrete, discoverable MCP result schemas for entity, list, catalog, report, binary document, batch, and action responses.

## Deliberate exclusions

The removed `/v1/cities`, `/v1/id-types`, and `/v1/fiscal-responsibilities` guesses are not part of this coverage claim. Their values appear in customer contracts, but the current Siigo resource reference does not publish those standalone routes and deployed-gateway probes did not resolve them.

The source hierarchy, known conflicts, and maintenance procedure are recorded in [SOURCE_OF_TRUTH.md](./SOURCE_OF_TRUTH.md).
