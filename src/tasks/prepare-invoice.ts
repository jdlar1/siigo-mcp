import type { z } from 'zod';
import { invoiceInputSchema } from '../schemas/invoices.js';
import type { prepareInvoiceSchema } from '../schemas/prepare-invoice.js';
import type { SiigoClient } from '../siigo-client.js';
import { checkDocumentReferences } from './document-references.js';

export async function prepareInvoice(client: SiigoClient, input: z.infer<typeof prepareInvoiceSchema>, signal: AbortSignal) {
  const references = await checkDocumentReferences(
    client,
    {
      party: 'customer',
      identification: input.customer_identification,
      branchOffice: input.branch_office,
      documentType: 'FV',
      documentId: input.document_id,
      productCodes: input.items.map((item) => item.code),
      taxIds: input.items.flatMap((item) => item.taxes?.map((tax) => tax.id) ?? []),
      payments: input.payments,
      itemSellers: input.items.map((item) => item.seller),
    },
    signal,
  );
  if (references.unresolved.length) return { ready: false as const, unresolved: references.unresolved };
  const invoice = invoiceInputSchema.parse({
    document: { id: references.documentId },
    date: input.date,
    customer: { identification: input.customer_identification, branch_office: references.branchOffice },
    seller: input.seller,
    items: input.items,
    payments: input.payments,
    ...(input.observations === undefined ? {} : { observations: input.observations }),
  });
  return {
    ready: true as const,
    invoice,
    unresolved: [],
    validation:
      'Local schema and customer, product, document, tax and payment references checked. Prices and payment amounts are caller-supplied; Siigo performs final accounting validation. Seller IDs and totals are not checked.',
  };
}
