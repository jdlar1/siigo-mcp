import type { SiigoClient } from '../siigo-client.js';
import type { DocumentTypeCode, SiigoListResponse } from '../types.js';

export interface UnresolvedReference {
  field: string;
  message: string;
  candidates?: Array<{ identification?: string; branch_office?: number; name?: string | string[]; id?: number }>;
}

// Never label a truncated scan as an unambiguous match.
async function collect<T>(fetchPage: (page: number) => Promise<SiigoListResponse<T>>, signal: AbortSignal): Promise<T[]> {
  const results: T[] = [];
  for (let page = 1; page <= 10; page++) {
    signal.throwIfAborted();
    const response = await fetchPage(page);
    results.push(...response.results);
    if (page * response.pagination.page_size >= response.pagination.total_results) return results;
  }
  throw new Error('Reference lookup exceeded 10 pages. Refine the reference before preparing the document.');
}

interface References {
  party: 'customer' | 'supplier';
  identification: string;
  branchOffice?: number;
  documentType: DocumentTypeCode;
  documentId?: number;
  number?: number;
  costCenter?: number;
  productCodes: string[];
  taxIds: number[];
  payments: Array<{ id: number; due_date?: string }>;
  itemSellers?: Array<number | undefined>;
}

export async function checkDocumentReferences(client: SiigoClient, input: References, signal: AbortSignal) {
  const options = { signal };
  const unresolved: UnresolvedReference[] = [];
  signal.throwIfAborted();
  const customers = (
    await collect(
      (page) =>
        client.getCustomers(
          {
            identification: input.identification,
            ...(input.branchOffice === undefined ? {} : { branch_office: input.branchOffice }),
            page,
            page_size: 100,
          },
          options,
        ),
      signal,
    )
  ).filter(
    (customer) =>
      customer.identification === input.identification &&
      customer.active !== false &&
      (input.branchOffice === undefined || (customer.branch_office ?? 0) === input.branchOffice),
  );
  if (customers.length !== 1)
    unresolved.push({
      field: input.party,
      message: `Select exactly one active ${input.party} branch.`,
      candidates: customers.map((c) => ({ identification: c.identification, branch_office: c.branch_office ?? 0, name: c.name })),
    });

  signal.throwIfAborted();
  const documents = (await client.getDocumentTypes(input.documentType, options)).filter(
    (doc) => doc.active && doc.type === input.documentType && (input.documentId === undefined || doc.id === input.documentId),
  );
  if (documents.length !== 1)
    unresolved.push({
      field: 'document',
      message: `Select exactly one active ${input.documentType} document type.`,
      candidates: documents.map(({ id, name }) => ({ id, name })),
    });
  const document = documents.length === 1 ? documents[0] : undefined;
  if (document?.automatic_number === false && input.number === undefined)
    unresolved.push({
      field: 'number',
      message: 'This document requires manual numbering. Supply number in a complete payload to siigo_create_document.',
    });
  if (document?.cost_center_mandatory && input.costCenter === undefined)
    unresolved.push({
      field: 'cost_center',
      message: 'This document requires a cost center. Supply cost_center in a complete payload to siigo_create_document.',
    });
  if (document?.healthcare_company)
    unresolved.push({
      field: 'healthcare_company',
      message: 'This document requires healthcare fields. Supply healthcare_company in a complete payload to siigo_create_document.',
    });
  if (document?.seller_by_item && input.itemSellers)
    input.itemSellers.forEach((seller, index) => {
      if (seller === undefined)
        unresolved.push({ field: `items.${index}.seller`, message: 'This document requires an explicit seller on every item.' });
    });

  for (const code of new Set(input.productCodes)) {
    const products = (await collect((page) => client.getProducts({ code, page, page_size: 100 }, options), signal)).filter(
      (product) => product.code === code && product.active !== false,
    );
    if (products.length !== 1)
      unresolved.push({ field: 'items', message: `Product code '${code}' must identify exactly one active product.` });
  }
  if (input.taxIds.length) {
    signal.throwIfAborted();
    const taxes = await client.getTaxes(options);
    for (const id of new Set(input.taxIds))
      if (!taxes.some((tax) => tax.id === id && tax.active))
        unresolved.push({ field: 'items.taxes', message: `Tax ${id} is not active or does not exist.` });
  }
  if (input.payments.length) {
    signal.throwIfAborted();
    const types = await client.getPaymentTypes(input.documentType, options);
    for (const payment of input.payments) {
      const type = types.find((entry) => entry.id === payment.id && entry.active);
      if (!type)
        unresolved.push({
          field: 'payments',
          message: `Payment type ${payment.id} is not active or does not exist for ${input.documentType}.`,
        });
      else if (type.due_date && !payment.due_date)
        unresolved.push({ field: 'payments', message: `Payment type ${payment.id} requires due_date.` });
    }
  }
  signal.throwIfAborted();
  return { unresolved, documentId: document?.id, branchOffice: customers.length === 1 ? (customers[0]?.branch_office ?? 0) : undefined };
}
