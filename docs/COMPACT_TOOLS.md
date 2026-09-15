# Eight tools and migration to v6

The default compact catalog exposes eight stable tools. Endpoint contracts remain
available through `SiigoClient`, exported schemas, and 71 discoverable operations.

## Public tools

| Tool | Task |
| --- | --- |
| `siigo_search` | Find customers/suppliers, products, and supported accounting documents; return candidates and pagination |
| `siigo_get_record` | Inspect a selected customer, product, or document UUID, optionally with supported files and invoice DIAN errors |
| `siigo_prepare_document` | Resolve references and prepare an invoice, quotation, purchase, or customer cash receipt without writing |
| `siigo_create_document` | Create one document from preparation or a complete validated payload |
| `siigo_discover_operations` | Retrieve advanced operation schemas, document workflow schemas, and executor names |
| `siigo_execute_read` | Execute discovered reads, including catalogs and reports |
| `siigo_execute_write` | Execute advanced writes, including updates, sending, and non-document creation |
| `siigo_execute_destructive` | Execute explicitly selected deletions and annulments |

Prefer preparation and creation for common document workflows. Use discovery for
advanced contracts and tasks. The executors retain full API coverage; their input
and successful output are validated against the exact operation schemas. The
advertised generic payload objects do not bypass endpoint validation.

## Migration from v5

This is a breaking change to the default compact tool catalog.

| v5 call | v6 replacement |
| --- | --- |
| `siigo_get_document` | `siigo_get_record` with the same `type`, `id`, and `files` arguments |
| `siigo_prepare_invoice(input)` | `siigo_prepare_document({ type: "invoice", input })` |
| `siigo_create_invoice({ invoice, idempotency_key })` | `siigo_create_document({ type: "invoice", payload: invoice, idempotency_key })` |
| `siigo_get_catalogs` | Discover individual catalog operations, then use `siigo_execute_read` for each requested catalog |
| `siigo_get_report` | Discover the report operation, then use `siigo_execute_read` with its filters as `arguments` |

- Successful preparation now returns `creation: { type, payload }` instead of
  `invoice`. Pass `creation` directly as the arguments to `siigo_create_document`.
- With files or stamp errors requested, retrieval returns `record` instead of
  `document`, alongside `files` and optional `stamp_errors`. Without extras, it
  returns the record directly, as before.
- Existing search arguments and executor contracts continue to work. Search adds
  quotations, purchases, vouchers, credit notes, journals, and payment receipts.
- `SIIGO_TOOL_PROFILE=legacy` and the `legacy-server` library entry retain the
  previous 71 direct endpoint tools. **Legacy mode does not restore the v5 compact
  helpers.** Pin `@jdlar/siigo-mcp@5.3.0` if those exact helper contracts are needed
  while migrating.
- The TypeScript client, endpoint schemas, credentials, transport configuration,
  and supported idempotency behavior remain compatible.

## Search and retrieval

```json
{
  "name": "siigo_search",
  "arguments": {
    "query": {
      "entity": "invoices",
      "mode": "list",
      "filters": { "name": "FV-1-42", "page": 1, "page_size": 20 }
    }
  }
}
```

Use `entity: "customers"` with `filters.type: "Supplier"` for suppliers. List mode
advertises shared filter fields once. Each field describes where it applies; the
selected endpoint still validates its exact supported filters and formats before
any read. Unsupported filters are rejected rather than ignored. Partial matching uses
`entity: "customer_matches"` or `"product_matches"`, `mode: "partial"`, and their
displayed filters. Partial searches scan pages and may consume many API requests.
Search returns candidates; the caller selects a match explicitly.

Pass a selected UUID to `siigo_get_record`. Supported types are `customer`,
`product`, and the eight document kinds listed below. Purchase support documents
support retrieval by UUID but have no documented collection search.

Optional `files: ["pdf", "xml"]` is supported for invoices; credit notes support
PDF only. `include_stamp_errors: true` adds invoice DIAN rejection details.
Unsupported extras are rejected before any upstream call. If a requested read
fails, its error is returned rather than silently omitting the failed result.

## Discover and execute

1. Call `siigo_discover_operations` with `{}` for domains, or `query` to filter
   domain descriptions, including English and Spanish keywords.
2. Select a domain and retrieve matching schemas:

   ```json
   { "domain": "invoices", "query": "siigo_create_invoice", "limit": 5 }
   ```

3. Each result includes the original `inputSchema`, `outputSchema`, annotations,
   and executor. Document creation operations additionally include:
   - `creation`: preferred tool, document `type`, exact `payloadSchema`, and
     `supports_idempotency_key`.
   - `preparation`, when supported: tool, document `type`, and exact `inputSchema`
     for the preparation tool's `input` field.

Discovery never calls Siigo. It returns at most `limit` schemas (default 5,
maximum 20), plus the total match count. Narrow the query when necessary.
Execution is stateless: every call contains its domain, operation, and arguments.
No prior discovery call or stored draft is required by the server.

A catalog read:

```json
{
  "name": "siigo_execute_read",
  "arguments": {
    "domain": "catalogs",
    "operation": "siigo_get_payment_types",
    "arguments": { "document_type": "FV" }
  }
}
```

For reports use domain `reports`, with `siigo_get_trial_balance`,
`siigo_get_trial_balance_by_third`, or `siigo_get_accounts_payable`. Retrieve the
schema first; existing period validation and upstream report formats are retained.

## Prepare, inspect, and create

```json
{
  "name": "siigo_prepare_document",
  "arguments": {
    "type": "invoice",
    "input": {
      "customer_identification": "123456789",
      "branch_office": 0,
      "document_id": 1,
      "date": "2026-09-15",
      "seller": 1,
      "items": [{ "code": "ABC", "quantity": 1, "price": 100 }],
      "payments": [{ "id": 2, "value": 100 }]
    }
  }
}
```

Example IDs, amounts, and codes are placeholders; use your company's values.

| Preparation type | Input and reference checks |
| --- | --- |
| `invoice` | Existing invoice preparation fields; exact customer/product matching, FV document, taxes, payments, and item-seller requirements |
| `quotation` | Customer identification, date, seller, items, and optional quotation fields; C document, customer, products, and taxes; no payment lookup |
| `purchase` | Supplier identification, provider invoice, typed items, payments, and optional purchase fields; FC document, supplier branch, Product items, taxes/retentions, and payments |
| `voucher` | Customer identification, date, `type: "AdvancePayment"` or `"DebtPayment"`, payment, and debt items when required; RC document, customer branch, tax IDs, and payment method |

Each workflow accepts optional `document_id` and `branch_office`. Omission is
allowed only if exactly one active matching document type or party branch exists.
The helper scans up to ten pages for exact party/product matches and errors if the
scan is incomplete. It never treats a truncated result as unique.

When a reference is missing or ambiguous, preparation returns `ready: false` and
`unresolved` fields with candidate choices where applicable. There is no `creation`
object. When ready, it returns `ready: true`, `creation`, and a `validation` summary.
Inspect the payload, then pass `creation` to `siigo_create_document`. An optional
`idempotency_key` may be added for supported kinds.

### Validation boundaries

- Preparation never creates parties, products, or documents and does not reserve
  references. Preparation and creation are separate calls, not an atomic transaction.
- Prices, payment amounts, debt prefixes/numbers/installments, discounts, and
  accounting choices must be supplied by the caller. The helper does not calculate
  totals or verify outstanding debt balances, discount IDs, accounting accounts,
  fixed assets, warehouse IDs, item supplier IDs, seller IDs, or cost-center IDs.
- A mandatory cost center or manual number must be supplied explicitly where the
  preparation schema supports it. No consecutive number or default cost center is
  chosen automatically. For invoice manual numbering, mandatory cost centers,
  healthcare, and other advanced fields, discover the complete creation payload.
- Invoice item sellers must be supplied individually when configured. Preparation
  reports unsupported configured requirements rather than inventing values.
- Purchase payloads retain cross-field and decimal-precision validation before any
  reference lookup. `supplier_by_item` must be true when item suppliers are present.
  Account and FixedAsset purchase items are not looked up as products.
- Siigo performs final accounting validation at creation. A locally ready document
  can still be rejected upstream. Upstream error context and cancellation are retained.

### Complete document creation

`siigo_create_document` supports `invoice`, `quotation`, `purchase`, `voucher`,
`credit_note`, `payment_receipt`, `purchase_support_document`, and `journal`.
Discover the corresponding create operation for its `creation.payloadSchema`.
This also supports advanced payloads, including MiscIncome vouchers, through the
existing handlers. Batch invoice creation remains an advanced write operation.

Only invoice, credit-note, journal, and voucher creation accept `idempotency_key`.
Other document kinds reject the key before making an API call. The wrapper adds
no retry behavior; the existing client's documented retry policy remains in force.

## Loading, measurement, and verification

The tool list stays stable across discovery and execution. Secondary handlers load
by domain, once per registry. Workflow schemas load on demand when preparation or
applicable document discovery is used. HTTP reuses the registry for its Siigo client
without sharing MCP connection state or credentials between clients.

The v6 catalog measures 18,100 serialized JSON bytes, compared with 351,473 for
the legacy catalog (about 95% smaller).

The mocked test suite verifies eight advertised tools, discovery coverage of all
71 legacy operations, at least a 90% reduction in serialized tool definitions
compared with legacy mode, document routing, reference ambiguity, validation,
errors, cancellation, and modern stdio/HTTP compatibility. Serialized JSON bytes
measure definition size, not actual model tokens or task-selection accuracy.
Eight is a design choice; an agent evaluation has not established it as universally
optimal. No live accounting documents are created for verification.

For endpoint coverage and accounting account limitations, see
[API coverage](API_COVERAGE.md) and [source policy](SOURCE_OF_TRUTH.md).
