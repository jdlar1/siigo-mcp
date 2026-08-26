import { z } from 'zod';
import {
  dateTimeSchema,
  deleteResponseSchema,
  hasAtMostDecimalPlaces,
  listResponseSchema,
  metadataSchema,
  nonNegativeIntegerSchema,
  paginationQuerySchema,
  positiveIntegerSchema,
  toolOutputSchema,
} from './common.js';

const productTypeSchema = z.enum(['Product', 'Service', 'ConsumerGood', 'Combo']);
const productDateFilterSchema = z.union([z.iso.date(), dateTimeSchema]);

const productIdsSchema = z.string().refine((value) => {
  const ids = value.split(',');
  return ids.length <= 20 && ids.every((id) => z.uuid().safeParse(id.trim()).success);
}, 'ids must contain up to 20 comma-separated UUIDs');

export const productListQuerySchema = paginationQuerySchema
  .extend({
    code: z.string().min(1).max(30).optional().describe('Product code filter'),
    account_group: z.string().min(1).optional().describe('Inventory classification ID filter'),
    type: productTypeSchema.optional().describe('Product type filter'),
    stock_control: z.boolean().optional().describe('Filter by inventory stock control'),
    active: z.boolean().optional().describe('Filter by active status'),
    ids: productIdsSchema.optional().describe('Up to 20 comma-separated product UUIDs'),
    created_start: productDateFilterSchema.optional().describe('Created-at lower bound'),
    created_end: productDateFilterSchema.optional().describe('Created-at upper bound'),
    date_start: productDateFilterSchema.optional().describe('Date lower bound'),
    date_end: productDateFilterSchema.optional().describe('Date upper bound'),
    updated_start: productDateFilterSchema.optional().describe('Updated-at lower bound'),
    updated_end: productDateFilterSchema.optional().describe('Updated-at upper bound'),
  })
  .strict();

const productCodeSchema = z
  .string()
  .min(1)
  .max(30)
  .regex(/^[^'\s]+$/, 'Product code cannot contain spaces or apostrophes');

const productComponentSchema = z
  .object({
    code: productCodeSchema.describe('Existing active component product code'),
    quantity: z.number().positive().describe('Component quantity'),
  })
  .strict();

const productTaxSchema = z
  .object({
    id: positiveIntegerSchema.describe('Tax ID'),
    milliliters: z.number().positive().optional().describe('Milliliters for applicable consumption taxes'),
    rate: z
      .union([18, 28, 35, 38, 55, 65].map((value) => z.literal(value)) as [z.ZodLiteral<number>, ...z.ZodLiteral<number>[]])
      .optional()
      .describe('Applicable sugar-drink consumption tax rate'),
  })
  .strict();

const productPriceValueSchema = z
  .number()
  .positive()
  .refine((value) => hasAtMostDecimalPlaces(value, 2), 'Price must have at most 2 decimal places');

const productPriceSchema = z
  .object({
    currency_code: z.string().length(3),
    price_list: z
      .array(
        z
          .object({
            position: z.number().int().min(1).max(12),
            value: productPriceValueSchema,
          })
          .strict(),
      )
      .min(1)
      .max(12),
  })
  .strict();

const productAdditionalFieldsSchema = z
  .object({
    barcode: z.string().max(50).optional(),
    brand: z.string().max(50).optional(),
    tariff: z.string().max(10).optional(),
    model: z.string().max(50).optional(),
  })
  .strict();

export const productInputSchema = z
  .object({
    code: productCodeSchema.describe('Unique product code'),
    name: z.string().min(1).max(100).describe('Product or service name'),
    account_group: positiveIntegerSchema.describe('Inventory classification ID'),
    type: productTypeSchema.optional().describe('Product type; defaults to Product'),
    stock_control: z.boolean().optional(),
    active: z.boolean().optional(),
    tax_classification: z.enum(['Taxed', 'Exempt', 'Excluded']).optional(),
    tax_included: z.boolean().optional(),
    tax_consumption_value: productPriceValueSchema.optional(),
    taxes: z.array(productTaxSchema).max(3).optional(),
    prices: z.array(productPriceSchema).max(12).optional(),
    unit: z.string().min(1).max(10).optional(),
    unit_label: z.string().max(100).optional(),
    reference: z.string().max(80).optional(),
    description: z.string().max(2500).optional(),
    additional_fields: productAdditionalFieldsSchema.optional(),
    components: z.array(productComponentSchema).min(1).optional(),
  })
  .strict()
  .superRefine((product, context) => {
    if (product.components && product.type !== 'Combo') {
      context.addIssue({
        code: 'custom',
        path: ['components'],
        message: 'components can only be sent for Combo products',
      });
    }
  });

export const productSearchSchema = z
  .object({
    code: z.string().min(1).max(30).optional().describe('Partial product code'),
    name: z.string().min(1).max(100).optional().describe('Partial product name'),
    reference: z.string().min(1).max(80).optional().describe('Partial product reference'),
    page: paginationQuerySchema.shape.page,
    page_size: paginationQuerySchema.shape.page_size,
  })
  .strict();

export const productIdSchema = z.uuid().describe('Product UUID');

export const productIdInputSchema = z
  .object({
    id: productIdSchema,
  })
  .strict();

export const productCreateInputSchema = z
  .object({
    product: productInputSchema,
  })
  .strict();

export const productUpdateInputSchema = z
  .object({
    id: productIdSchema,
    product: productInputSchema,
  })
  .strict();

export const productResponseTaxSchema = z
  .object({
    id: nonNegativeIntegerSchema.optional(),
    name: z.string().optional(),
    type: z.string().optional(),
    percentage: z.number().optional(),
    value: z.number().optional(),
    milliliters: z.number().optional(),
    rate: z.number().optional(),
  })
  .passthrough();

export const productResponsePriceSchema = z
  .object({
    currency_code: z.string().optional(),
    price_list: z
      .array(
        z
          .object({
            position: z.number().int().optional(),
            name: z.string().optional(),
            value: z.union([z.number(), z.string()]).optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

export const productResponseComponentSchema = z
  .object({
    id: z.string().optional(),
    code: z.string().optional(),
    name: z.string().optional(),
    quantity: z.number().optional(),
  })
  .passthrough();

export const productResponseWarehouseSchema = z
  .object({
    id: nonNegativeIntegerSchema.optional(),
    name: z.string().optional(),
    quantity: z.union([z.number(), z.string()]).optional(),
  })
  .passthrough();

export const productResponseSchema = z
  .object({
    id: z.string().optional(),
    code: z.string().optional(),
    name: z.string().optional(),
    account_group: z
      .union([nonNegativeIntegerSchema, z.object({ id: nonNegativeIntegerSchema, name: z.string().optional() }).passthrough()])
      .optional(),
    type: productTypeSchema.optional(),
    stock_control: z.boolean().optional(),
    active: z.boolean().optional(),
    tax_classification: z.enum(['Taxed', 'Exempt', 'Excluded']).optional(),
    tax_included: z.boolean().optional(),
    tax_consumption_value: z.number().optional(),
    taxes: z.array(productResponseTaxSchema).optional(),
    prices: z.array(productResponsePriceSchema).optional(),
    unit: z.union([z.string(), z.object({}).passthrough()]).optional(),
    unit_label: z.string().optional(),
    reference: z.string().optional(),
    description: z.string().optional(),
    additional_fields: z.object({}).passthrough().optional(),
    components: z.array(productResponseComponentSchema).optional(),
    available_quantity: z.number().optional(),
    warehouses: z.array(productResponseWarehouseSchema).optional(),
    metadata: metadataSchema.optional(),
  })
  .passthrough();

export const productEntityToolOutputSchema = toolOutputSchema(productResponseSchema);
export const productListToolOutputSchema = toolOutputSchema(listResponseSchema(productResponseSchema));
export const productDeleteToolOutputSchema = toolOutputSchema(deleteResponseSchema);
