# Compact tools and migration from v4

The default catalog is task-oriented. Endpoint contracts remain available through
`SiigoClient`, the exported schemas, and on-demand operations.

## Runtime and compatibility

Use Node 24 LTS (`nvm use` reads `.nvmrc`). SDK v2 replaces the monolithic SDK with
server, Node transport, and Express packages; the SDK client is a test dependency.

- CLI: `SIIGO_TOOL_PROFILE=compact` is the default. Select `legacy` to expose the
  previous tool names directly.
- Library: `createMcpServer(client)` creates the compact server. For the previous
  catalog, import `createLegacyMcpServer` from `@jdlar/siigo-mcp/legacy-server`.
  This separate entry avoids eager imports of all operation modules.
- HTTP: `createHttpApp({ client, toolProfile: 'legacy' })` selects the old catalog.
  Both profiles support modern MCP requests and legacy stateless JSON requests.
  Embedders should call `await app.locals.closeMcp()` during application shutdown.
- The client API, endpoint payloads, credentials, and existing idempotency behavior
  are preserved. Existing direct tool calls require the legacy profile or migration
  to the compact surface. This is a major-version change.

## Initial tools

| Tool | Task |
| --- | --- |
| `siigo_search` | List/filter customers, products, or invoices; partial customer/product matching |
| `siigo_get_document` | Read a document and optionally its supported PDF/XML files |
| `siigo_get_catalogs` | Fetch the selected reference catalogs together |
| `siigo_prepare_invoice` | Prepare a common invoice and report unresolved references without writing |
| `siigo_create_invoice` | Create an invoice using the full existing contract |
| `siigo_get_report` | Trial balances and accounts payable |
| `siigo_discover_operations` | Find secondary operations and retrieve their exact schemas |
| `siigo_execute_read` | Execute a discovered read operation |
| `siigo_execute_write` | Execute a discovered non-destructive write operation |
| `siigo_execute_destructive` | Execute a discovered destructive operation |

### Search

Arguments to `siigo_search`:

```json
{
  "query": {
    "entity": "products",
    "mode": "list",
    "filters": { "code": "ABC", "page": 1, "page_size": 20 }
  }
}
```

`customers`, `products`, and `invoices` use `mode: "list"` with their existing API
filters. `customer_matches` and `product_matches` use `mode: "partial"`; those
operations scan pages and can consume many API requests. Pagination and payloads
retain the underlying operation's semantics.

### Discover and execute

1. Call `siigo_discover_operations` with `{}` for domains, or a `query` to filter
   domain descriptions (English and Spanish keywords).
2. Choose a domain and retrieve relevant operation schemas:

   ```json
   { "domain": "webhooks", "query": "create", "limit": 5 }
   ```

3. Use the returned `executor`, operation name, and exact input schema. A read example:

   ```json
   {
     "domain": "catalogs",
     "operation": "siigo_get_taxes",
     "arguments": {}
   }
   ```

   Pass those arguments to `siigo_execute_read` after discovering the catalog operation.

Discovery returns at most `limit` schemas (default 5, maximum 20), plus the number
of matches. Narrow the query or increase the limit to retrieve other matches.
Discovery never invokes the Siigo API. Execution does not require session state:
all requests carry the domain, operation, and arguments. The executor checks the
operation category and validates input before invoking the existing handler; it
also validates successful structured output against that operation's schema.
The wrapper's broad result schema does not replace the exact operation contract.

The advertised tool list is stable. This does not rely on a host-specific defer
flag or on adding tools after a discovery call. Hosts with native tool discovery
may use the legacy profile and their own filtering, but that is a separate client
capability, not something enabled automatically by the SDK update.

### Prepare an invoice

Arguments to `siigo_prepare_invoice`:

```json
{
  "customer_identification": "123456789",
  "branch_office": 0,
  "document_id": 1,
  "date": "2026-09-14",
  "seller": 1,
  "items": [{ "code": "ABC", "quantity": 1, "price": 100 }],
  "payments": [{ "id": 2, "value": 100 }]
}
```

Use IDs, amounts, and codes from your company; example values are placeholders.
The task verifies exact customer/product matches and selected document, tax, and
payment references. Missing or ambiguous references return `ready: false` and
`unresolved`, without an executable invoice. Omitting `document_id` or
`branch_office` is allowed only when the corresponding active match is unique.
Reference lookups stop with an error after ten pages rather than treating a
truncated search as a unique match.

A successful response contains `ready: true` and a locally validated `invoice`.
Pass it to `siigo_create_invoice` with an optional `idempotency_key`. Preparation
never creates a customer, product, or invoice. It does not calculate prices,
payment totals, or tax amounts, nor validate the seller ID against the user catalog;
Siigo performs final accounting validation. Advanced invoice fields remain available
through the full creation schema. Preparation and creation are separate calls and
are not an atomic transaction.

## Loading and measurement

Only primary schemas and domain metadata are eager. Secondary handlers and their
schemas load by domain, once per registry. HTTP reuses a registry for its Siigo
client across requests; it does not share MCP connection state or credentials
between clients. Primary domains' schemas can already be loaded for their task tools.

The initial comparison measured 353,603 bytes of serialized definitions for the
old catalog and about 52 KB for the compact catalog, roughly 85% less. This measures
JSON definition size, not actual model tokens, startup time, or provider billing.
The test suite compares both catalogs and requires at least a 70% reduction,
checks complete operation coverage, and verifies loading through Node module hooks.

## Purchase validation and accounting accounts

In v5.0.1, purchase create/update operations reject an item-level `supplier` unless
`supplier_by_item` is explicitly `true`. Quantities allow at most 2 decimal places,
prices 6, and payment values 2. Correct invalid payloads before retrying; the MCP
does not round values automatically. Both tool profiles apply these checks.

The `account_groups` domain contains inventory classifications, not the company's
chart of accounts (PUC). The documented API does not provide a complete PUC catalog
or a purchase dry-run endpoint. Local payload validation cannot establish that an
account exists, is active, or is eligible for direct purchase posting; Siigo performs
the final validation when the intended purchase is submitted.
