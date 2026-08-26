# Siigo contract source of truth

Last reconciled: 2026-08-26 (UTC)

This project deliberately does not treat every Siigo document as equally authoritative. The sources overlap, and the downloadable API Blueprint contains fields and routes that conflict with Siigo's current reference.

## Precedence

1. **Current endpoint reference at `developers.siigo.com`** is canonical for public paths, HTTP methods, request field names, response shapes, constraints, and examples.
2. **Authenticated behavior at `https://api.siigo.com`** is operational truth when the current reference and the deployed gateway disagree. A conflict must be recorded and covered by a contract test; it must not be silently normalized.
3. **The downloadable Apiary blueprint** is used for endpoint discovery, release notices, and historical context. The repository keeps a dated snapshot in `siigoapi.apib`, but the snapshot is not accepted blindly when it contradicts source 1 or 2.
4. **Existing MCP code, old tests, README examples, and inferred symmetry** are never authoritative. They may reveal compatibility requirements, but they cannot establish a Siigo endpoint or field by themselves.

For scheduled changes, the MCP adopts the new contract only after its effective date and confirmation in the current endpoint reference or deployed API. Before that point it may expose an explicitly marked preview, but not silently change the stable contract.

## Reconciliation rules

- Preserve Siigo wire names exactly, including `snake_case`.
- Accept a legacy spelling only when it is safe and unambiguous; serialize the canonical spelling upstream.
- Do not register a tool for a route found only by analogy or in stale local code.
- Use strict input schemas and cross-field validation where Siigo documents conditional requirements.
- Model list, entity, array, and report responses separately rather than wrapping all responses in one broad union.
- Record unresolved documentation/runtime conflicts here and verify them against an authenticated sandbox before changing a stable route.

## Conflicts resolved for v4.0.0

| Area | Conflicting evidence | v4 decision |
| --- | --- | --- |
| Healthcare invoice reason | Apiary uses `nonContractInvoiceReason` and labels it numeric; the current endpoint reference uses `non_contract_invoice_reason` with string codes `01`–`07`. | Use `non_contract_invoice_reason` and validate the seven current string codes. |
| Healthcare payment and plan | Older material includes payment method `05` and service plan `01`; the current reference lists payment `01`–`04` and service plans `02`–`17`. | Use the current lists and the documented field relationships. |
| Healthcare contract | Older material limits `contract_number` to 50 characters. | Use the current 64-character limit and enforce its exclusions with policy and non-contract reason. |
| CUCON | Apiary describes `additional_fields.CUCON`; the current customer examples expose extensible `custom_fields`. | Represent CUCON through customer `custom_fields` without inventing a second wire shape. |
| Credit-note reason | The current page makes reason conditional (required for electronic credit notes), while its narrative table lists `1,2,3,4,6,7` and its generated schema lists `1,2,3,4,5,6`. | Keep reason optional at the MCP boundary so non-electronic payloads permitted by the endpoint are not rejected, and accept the safe numeric union `1`-`7`. The API remains authoritative for requiring a reason on electronic documents. |
| Healthcare collection amounts | The invoice reference requires at least one collection amount for `SS-CUFE` sales invoices; the credit-note reference documents the same healthcare object without that invoice-only validation. | Apply the `SS-CUFE` collection-amount requirement only to invoice schemas. Credit-note healthcare payloads use the shared Resolution 948 fields without requiring `copayment`, `coinsurance`, `cost_sharing`, or `recovery_charge`. |
| Product type | Current product prose lists `Product`, `Service`, and `Combo`, while the generated schema also exposes `ConsumerGood`. | Accept all four generated wire values. This preserves a value already accepted by the contract without inventing a translation. |
| Payment-receipt payment field | Current payment-receipt examples use singular `payment`; generated field tables also expose plural `payments` for some receipt variants. | Accept the documented singular field and the generated plural field where that variant permits it; preserve the caller's selected wire shape. |
| Accounts-payable end date | Current narrative text refers to `due_date_end`, while generated query metadata exposes `date_end`. | Accept both aliases, enforce the same date ordering, and forward the caller's spelling unchanged until authenticated behavior selects one. |
| Voucher discount catalog | The Apiary snapshot says `GET /v1/expense`; current change notes and the deployed gateway identify `/v1/expenses`. | Use `/v1/expenses`. |
| Miscellaneous income catalog | Legacy MCP code used `/v1/misc-income`; the current reference documents `/v1/misc-incomes`. | Use `/v1/misc-incomes`. |
| Invoice annul response | The Apiary snapshot returns `{ id, Annul: true }`; the current annul endpoint returns `{ id, deleted: true }`. | Model the current lowercase `deleted` response, consistent with Siigo's other successful destructive operations. |
| Cities, ID types, fiscal responsibilities | Legacy MCP code registered `/v1/cities`, `/v1/id-types`, and `/v1/fiscal-responsibilities`; they are absent from the current API resource reference and live gateway probes returned not-found rather than an authentication challenge. | Remove the three misleading tools from the public MCP surface. Values needed by customer operations remain validated in the customer contract. |
| Purchase support-document collection | The current support-document reference documents `GET /v1/purchase-support-documents/{id}` and the blueprint contains create, update, single-read, and delete operations, but neither source establishes a collection `GET`; no authenticated proof is available. | Remove the unverified collection-list tool and client method. Retain the documented get-by-ID, create, update, and delete operations until an authenticated sandbox confirms a collection route. |
| Webhook update | The current reference documents collection-level `PUT /v1/webhooks`, while older implementations and unauthenticated gateway probes indicate `PUT /v1/webhooks/{id}`. | Try the current documented collection route first. If it returns 404/405 and a legacy ID was supplied, retry `/{id}`. Remove the fallback after an authenticated sandbox confirms a single route. |

## Primary references

- Current API introduction and resource index: <https://developers.siigo.com/docs/siigoapi/>
- Current API changes: <https://developers.siigo.com/docs/siigoapi/novedades>
- Siigo's official MCP scope: <https://developers.siigo.com/docs/siigoapi/MCP/1-documentation/>
- Current customer create and response contracts: <https://developers.siigo.com/docs/siigoapi/customer/1-create-customer/> and <https://developers.siigo.com/docs/siigoapi/customer/3-get-customer>
- Current invoice contract: <https://developers.siigo.com/docs/siigoapi/invoice/1-create-invoice/>
- Current invoice annul and email contracts: <https://developers.siigo.com/docs/siigoapi/invoice/5-annul-invoice> and <https://developers.siigo.com/docs/siigoapi/invoice/send-invoice-by-email/>
- Current quotation contract: <https://developers.siigo.com/docs/siigoapi/cotizaciones/1-create-quotation>
- Current credit-note contract: <https://developers.siigo.com/docs/siigoapi/credit-note/1-create-credit-note/>
- Current product contract: <https://developers.siigo.com/docs/siigoapi/productos/crear-producto/>
- Current purchase, support-document, and delete contracts: <https://developers.siigo.com/docs/siigoapi/purchase/4-get-purchase>, <https://developers.siigo.com/docs/siigoapi/purcsupporting-document/3-get-support-documents/>, and <https://developers.siigo.com/docs/siigoapi/purchase/5-delete-purchase/>
- Current voucher and miscellaneous-income contracts: <https://developers.siigo.com/docs/siigoapi/voucher/4-get-voucher> and <https://developers.siigo.com/docs/siigoapi/voucher/2-create-voucher-miscincome>
- Current payment-receipt contract: <https://developers.siigo.com/docs/siigoapi/payment-receipts/1-create-payment-receipts>
- Current payment-method and accounts-payable contracts: <https://developers.siigo.com/docs/siigoapi/catalog/7-get-payment-methods> and <https://developers.siigo.com/docs/siigoapi/reports/3-get-accounts-payable>
- Current webhook update contract: <https://developers.siigo.com/docs/siigoapi/webhooks/2-edit-webhook>
- Current webhook delete contract: <https://developers.siigo.com/docs/siigoapi/webhooks/4-delete-webhooks>
- Current idempotency contract: <https://developers.siigo.com/docs/siigoapi/idempotencia>
- Current error and rate-limit behavior: <https://developers.siigo.com/docs/siigoapi/manejo-de-errores/>
- Current misc-income catalog contract: <https://developers.siigo.com/docs/siigoapi/catalog/11-get-misc-incomes>
- Downloadable Apiary blueprint: <https://siigoapi.docs.apiary.io/api-description-document>

The v4 reconciliation downloaded the Apiary document on 2026-08-26. The raw download's SHA-256 was `c8f7ca47596f026cb63ece3ab5b11a85be7b21cdcb80f2216680888db1183d3d`. The checked-in copy only normalizes trailing whitespace; its SHA-256 is `e9aa433dcc5841dfc4d0c2bdf108c92d14d1e8d7e3b02620f7ae06919832fbb3`.

## Maintenance procedure

For each release that claims contract coverage:

1. Download and hash the current Apiary blueprint.
2. Review Siigo's change log and every affected current endpoint page.
3. Diff the endpoint inventory and schema fields against `src/tools/` and `src/schemas/`.
4. Resolve conflicts using the precedence above and update this file.
5. Run unit, schema, MCP protocol, and authenticated sandbox contract tests where credentials are available.
6. Publish only after the packed npm artifact has been inspected.
