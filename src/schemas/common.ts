import { z } from 'zod';

export const uuidSchema = z.uuid();
export const dateSchema = z.iso.date();
export const dateTimeSchema = z.iso.datetime({ offset: true });
export const positiveIntegerSchema = z.number().int().positive();
export const nonNegativeIntegerSchema = z.number().int().nonnegative();
export const positiveAmountSchema = z.number().positive();
export const nonNegativeAmountSchema = z.number().nonnegative();

export function hasAtMostDecimalPlaces(value: number, maximumDecimals: number): boolean {
  const [coefficient = '', exponentText] = value.toString().toLowerCase().split('e');
  const decimalPoint = coefficient.indexOf('.');
  const fractionalDigits = decimalPoint === -1 ? 0 : coefficient.length - decimalPoint - 1;
  const exponent = exponentText === undefined ? 0 : Number(exponentText);

  return Math.max(0, fractionalDigits - exponent) <= maximumDecimals;
}

export const paginationQuerySchema = z
  .object({
    page: positiveIntegerSchema.optional().describe('Page number (starts at 1)'),
    page_size: z.number().int().min(1).max(100).optional().describe('Results per page (1-100)'),
  })
  .strict();

export const paginationResponseSchema = z
  .object({
    page: positiveIntegerSchema,
    page_size: positiveIntegerSchema,
    total_results: nonNegativeIntegerSchema,
  })
  .strict();

export const metadataSchema = z
  .object({
    created: z.string(),
    last_updated: z.string().nullable().optional(),
  })
  .passthrough();

export const documentRefSchema = z
  .object({
    id: positiveIntegerSchema,
  })
  .strict();

export const citySchema = z
  .object({
    country_code: z.string().min(2).max(2),
    state_code: z.string().min(1).max(10),
    city_code: z.string().min(1).max(10),
  })
  .strict();

export const addressSchema = z
  .object({
    address: z.string().min(1).max(256),
    city: citySchema,
    postal_code: z
      .string()
      .regex(/^[A-Za-z0-9]+$/, 'Postal code must be alphanumeric without spaces')
      .max(10)
      .optional(),
  })
  .strict();

const phonePartSchema = z.string().regex(/^\d+$/, 'Phone fields must contain digits only').max(10);

export const phoneSchema = z
  .object({
    indicative: phonePartSchema.optional(),
    number: phonePartSchema.optional(),
    extension: phonePartSchema.optional(),
  })
  .strict();

export const contactSchema = z
  .object({
    first_name: z.string().min(1).max(50),
    last_name: z.string().max(50).optional(),
    email: z.email().max(100).optional(),
    phone: phoneSchema.partial().strict().optional(),
  })
  .strict();

export const currencySchema = z
  .object({
    code: z.string().length(3),
    exchange_rate: positiveAmountSchema,
  })
  .strict();

export const taxRefSchema = z
  .object({
    id: positiveIntegerSchema,
  })
  .strict();

export const taxWithBaseRefSchema = taxRefSchema
  .extend({
    base: nonNegativeAmountSchema.optional(),
  })
  .strict();

export const paymentSchema = z
  .object({
    id: positiveIntegerSchema,
    value: positiveAmountSchema,
    due_date: dateSchema.optional(),
  })
  .strict();

export const stampSchema = z
  .object({
    send: z.boolean(),
  })
  .strict();

export const mailSchema = z
  .object({
    send: z.boolean(),
  })
  .strict();

export const customerRefSchema = z
  .object({
    identification: z.string().min(1).max(50),
    branch_office: z.number().int().min(0).max(999).optional(),
  })
  .strict();

export const supplierRefSchema = customerRefSchema;

export const idempotencyKeySchema = z
  .string()
  .regex(/^[A-Za-z0-9]+$/, 'Idempotency key must be alphanumeric')
  .max(30);

export const linksSchema = z.record(
  z.string(),
  z
    .object({
      href: z.string(),
    })
    .passthrough(),
);

export const deleteResponseSchema = z
  .object({
    id: z.string(),
    deleted: z.literal(true),
  })
  .passthrough();

export function toolOutputSchema<T extends z.ZodType>(resultSchema: T) {
  return z.object({ result: resultSchema }).strict();
}

export function listResponseSchema<T extends z.ZodType>(itemSchema: T) {
  return z
    .object({
      pagination: paginationResponseSchema,
      results: z.array(itemSchema),
      _links: linksSchema.optional(),
      __links: linksSchema.optional(),
    })
    .passthrough();
}

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
