import type { z } from 'zod';
import { invoiceInputSchema } from '../schemas/invoices.js';
import type { prepareInvoiceSchema } from '../schemas/prepare-invoice.js';
import type { SiigoClient } from '../siigo-client.js';
import type { SiigoListResponse } from '../types.js';

interface UnresolvedReference {
  field: string;
  message: string;
  candidates?: unknown[];
}

// A bounded exact lookup must never label a truncated scan as an unambiguous match.
async function collect<T>(fetchPage: (page: number) => Promise<SiigoListResponse<T>>, signal: AbortSignal): Promise<T[]> {
  const results: T[] = [];
  for (let page = 1; page <= 10; page++) {
    signal.throwIfAborted();
    const response = await fetchPage(page);
    results.push(...response.results);
    if (page * response.pagination.page_size >= response.pagination.total_results) return results;
  }
  throw new Error('Reference lookup exceeded 10 pages. Refine the reference before preparing the invoice.');
}

export async function prepareInvoice(client: SiigoClient, input: z.infer<typeof prepareInvoiceSchema>, signal: AbortSignal) {
  const options = { signal };
  const unresolved: UnresolvedReference[] = [];
  const customers = (
    await collect(
      (page) =>
        client.getCustomers(
          {
            identification: input.customer_identification,
            ...(input.branch_office === undefined ? {} : { branch_office: input.branch_office }),
            page,
            page_size: 100,
          },
          options,
        ),
      signal,
    )
  ).filter(
    (customer) =>
      customer.identification === input.customer_identification &&
      customer.active !== false &&
      (input.branch_office === undefined || (customer.branch_office ?? 0) === input.branch_office),
  );
  if (customers.length !== 1)
    unresolved.push({
      field: 'customer',
      message: 'Select exactly one active customer branch.',
      candidates: customers.map((c) => ({ identification: c.identification, branch_office: c.branch_office ?? 0, name: c.name })),
    });

  const documents = (await client.getDocumentTypes('FV', options)).filter(
    (doc) => doc.active && doc.type === 'FV' && (input.document_id === undefined || doc.id === input.document_id),
  );
  if (documents.length !== 1)
    unresolved.push({
      field: 'document',
      message: 'Select exactly one active sales document type.',
      candidates: documents.map(({ id, name }) => ({ id, name })),
    });

  for (const code of new Set(input.items.map((item) => item.code))) {
    const products = (await collect((page) => client.getProducts({ code, page, page_size: 100 }, options), signal)).filter(
      (product) => product.code === code && product.active !== false,
    );
    if (products.length !== 1)
      unresolved.push({ field: 'items', message: `Product code '${code}' must identify exactly one active product.` });
  }

  const requestedTaxes = new Set(input.items.flatMap((item) => item.taxes?.map((tax) => tax.id) ?? []));
  if (requestedTaxes.size) {
    const taxes = await client.getTaxes(options);
    for (const id of requestedTaxes) {
      if (!taxes.some((tax) => tax.id === id && tax.active))
        unresolved.push({ field: 'items.taxes', message: `Tax ${id} is not active or does not exist.` });
    }
  }
  const paymentTypes = await client.getPaymentTypes('FV', options);
  for (const payment of input.payments) {
    const type = paymentTypes.find((entry) => entry.id === payment.id && entry.active);
    if (!type) unresolved.push({ field: 'payments', message: `Payment type ${payment.id} is not active or does not exist for FV.` });
    else if (type.due_date && !payment.due_date)
      unresolved.push({ field: 'payments', message: `Payment type ${payment.id} requires due_date.` });
  }
  if (unresolved.length) return { ready: false, unresolved };

  const invoice = invoiceInputSchema.parse({
    document: { id: documents[0]?.id },
    date: input.date,
    customer: { identification: input.customer_identification, branch_office: customers[0]?.branch_office ?? 0 },
    seller: input.seller,
    items: input.items,
    payments: input.payments,
    ...(input.observations === undefined ? {} : { observations: input.observations }),
  });
  return {
    ready: true,
    invoice,
    unresolved: [],
    validation:
      'Local schema and customer, product, document, tax and payment references checked. Prices and payment amounts are caller-supplied; Siigo performs final accounting validation.',
  };
}
