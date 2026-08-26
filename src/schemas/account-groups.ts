import { z } from 'zod';
import { listResponseSchema, positiveIntegerSchema, toolOutputSchema } from './common.js';

export const accountGroupIdSchema = positiveIntegerSchema.describe('Inventory classification ID');

export const accountGroupInputSchema = z
  .object({
    code: z
      .string()
      .min(1)
      .max(10)
      .regex(/^[A-Za-z0-9]+$/, 'Category code must be alphanumeric without spaces'),
    name: z.string().min(1).max(50),
  })
  .strict();

export const accountGroupListInputSchema = z.object({}).strict();

export const accountGroupUpdateInputSchema = z
  .object({
    id: accountGroupIdSchema,
    code: accountGroupInputSchema.shape.code,
    name: accountGroupInputSchema.shape.name,
  })
  .strict();

export const accountGroupResponseSchema = z
  .object({
    id: accountGroupIdSchema,
    code: z.string().optional(),
    name: z.string(),
    active: z.boolean().optional(),
  })
  .passthrough();

export const accountGroupEntityToolOutputSchema = toolOutputSchema(accountGroupResponseSchema);
export const accountGroupListToolOutputSchema = toolOutputSchema(
  z.union([z.array(accountGroupResponseSchema), listResponseSchema(accountGroupResponseSchema)]),
);
