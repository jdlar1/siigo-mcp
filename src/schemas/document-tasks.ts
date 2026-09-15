import { z } from 'zod';
import { documentKindSchema, preparationKindSchema } from '../document-tasks.js';
import { idempotencyKeySchema, toolOutputSchema } from './common.js';

export const createDocumentSchema = z
  .object({
    type: documentKindSchema.describe('Document kind. Discover its creation schema or use the creation object returned by preparation.'),
    payload: z
      .record(z.string(), z.unknown())
      .describe('Exact document payload from preparation or discovery creation.payloadSchema; validated against the endpoint contract.'),
    idempotency_key: idempotencyKeySchema
      .optional()
      .describe('Only invoices, credit notes, journals and vouchers support this key; rejected for other kinds.'),
  })
  .strict();

export const prepareDocumentSchema = z
  .object({
    type: preparationKindSchema.describe('Supported preparation workflow; voucher means a customer cash receipt.'),
    input: z
      .record(z.string(), z.unknown())
      .describe('Workflow input matching discovery preparation.inputSchema. Discover the create operation for this document kind first.'),
  })
  .strict();

const unresolvedSchema = z
  .object({
    field: z.string(),
    message: z.string(),
    candidates: z
      .array(
        z
          .object({
            identification: z.string().optional(),
            branch_office: z.number().optional(),
            name: z.union([z.string(), z.array(z.string())]).optional(),
            id: z.number().optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

export const prepareDocumentOutputSchema = toolOutputSchema(
  z.discriminatedUnion('ready', [
    z.object({ ready: z.literal(false), unresolved: z.array(unresolvedSchema) }).strict(),
    z
      .object({
        ready: z.literal(true),
        unresolved: z.array(unresolvedSchema).length(0),
        creation: createDocumentSchema,
        validation: z.string(),
      })
      .strict(),
  ]),
);
