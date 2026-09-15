import type { PreparationKind } from '../document-tasks.js';
import { preparationSchemas } from '../schemas/prepare-document.js';
import { purchaseSchema } from '../schemas/purchases.js';
import { quotationInputSchema } from '../schemas/quotations.js';
import { voucherSchema } from '../schemas/vouchers.js';
import type { SiigoClient } from '../siigo-client.js';
import { checkDocumentReferences } from './document-references.js';
import { prepareInvoice } from './prepare-invoice.js';

const validation =
  'Local payload schema and selected party, document, product, tax and payment references checked. Prices, amounts, debt references and accounting choices are caller-supplied. Seller/cost-center IDs, accounting accounts, fixed assets, debt balances and totals are not checked; Siigo performs final accounting validation. Preparation does not reserve references or create records.';

export async function prepareDocument(client: SiigoClient, type: PreparationKind, raw: unknown, signal: AbortSignal) {
  signal.throwIfAborted();
  if (type === 'invoice') {
    const result = await prepareInvoice(client, preparationSchemas.invoice.parse(raw), signal);
    if (!result.ready) return result;
    return { ready: true, unresolved: [], creation: { type, payload: result.invoice }, validation: result.validation };
  }
  // A temporary document ID enables complete local contract validation before
  // lookups. It is never sent upstream or returned; readiness requires a resolved ID.
  if (type === 'quotation') {
    const { document_id, customer_identification, branch_office, ...fields } = preparationSchemas.quotation.parse(raw);
    const payload = quotationInputSchema.parse({
      ...fields,
      document: { id: document_id ?? 1 },
      customer: { identification: customer_identification, branch_office },
    });
    const refs = await checkDocumentReferences(
      client,
      {
        party: 'customer',
        identification: customer_identification,
        branchOffice: branch_office,
        documentType: 'C',
        documentId: document_id,
        number: fields.number,
        costCenter: fields.cost_center,
        productCodes: fields.items.map((item) => item.code),
        taxIds: fields.items.flatMap((item) => item.taxes?.map((tax) => tax.id) ?? []),
        payments: [],
        itemSellers: fields.items.map(() => undefined),
      },
      signal,
    );
    if (refs.unresolved.length) return { ready: false, unresolved: refs.unresolved };
    return {
      ready: true,
      unresolved: [],
      creation: {
        type,
        payload: quotationInputSchema.parse({
          ...payload,
          document: { id: refs.documentId },
          customer: { identification: customer_identification, branch_office: refs.branchOffice },
        }),
      },
      validation,
    };
  }
  if (type === 'purchase') {
    const { document_id, supplier_identification, branch_office, ...fields } = preparationSchemas.purchase.parse(raw);
    const payload = purchaseSchema.parse({
      ...fields,
      document: { id: document_id ?? 1 },
      supplier: { identification: supplier_identification, branch_office },
    });
    const refs = await checkDocumentReferences(
      client,
      {
        party: 'supplier',
        identification: supplier_identification,
        branchOffice: branch_office,
        documentType: 'FC',
        documentId: document_id,
        number: fields.number,
        costCenter: fields.cost_center,
        productCodes: fields.items.filter((item) => item.type === 'Product').map((item) => item.code),
        taxIds: [
          ...fields.items.flatMap((item) => item.taxes?.map((tax) => tax.id) ?? []),
          ...(fields.retentions?.map((tax) => tax.id) ?? []),
        ],
        payments: fields.payments,
      },
      signal,
    );
    if (refs.unresolved.length) return { ready: false, unresolved: refs.unresolved };
    return {
      ready: true,
      unresolved: [],
      creation: {
        type,
        payload: purchaseSchema.parse({
          ...payload,
          document: { id: refs.documentId },
          supplier: { identification: supplier_identification, branch_office: refs.branchOffice },
        }),
      },
      validation,
    };
  }
  const { document_id, customer_identification, branch_office, ...fields } = preparationSchemas.voucher.parse(raw);
  const payload = voucherSchema.parse({
    ...fields,
    document: { id: document_id ?? 1 },
    customer: { identification: customer_identification, branch_office },
  });
  const refs = await checkDocumentReferences(
    client,
    {
      party: 'customer',
      identification: customer_identification,
      branchOffice: branch_office,
      documentType: 'RC',
      documentId: document_id,
      number: fields.number,
      costCenter: fields.cost_center,
      productCodes: [],
      taxIds: fields.type === 'DebtPayment' ? fields.items.flatMap((item) => item.taxes?.map((tax) => tax.id) ?? []) : [],
      payments: [fields.payment],
    },
    signal,
  );
  if (refs.unresolved.length) return { ready: false, unresolved: refs.unresolved };
  return {
    ready: true,
    unresolved: [],
    creation: {
      type,
      payload: voucherSchema.parse({
        ...payload,
        document: { id: refs.documentId },
        customer: { identification: customer_identification, branch_office: refs.branchOffice },
      }),
    },
    validation,
  };
}
