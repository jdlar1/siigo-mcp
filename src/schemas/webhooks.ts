import { z } from 'zod';
import {
  dateTimeSchema,
  deleteResponseSchema,
  linksSchema,
  paginationQuerySchema,
  positiveIntegerSchema,
  toolOutputSchema,
  uuidSchema,
} from './common.js';

const applicationIdSchema = z.string().min(1).max(100);
const topicSchema = z.string().min(1).max(255);

export const webhookSchema = z
  .object({
    application_id: applicationIdSchema,
    url: z.url(),
    topic: topicSchema,
  })
  .strict();

export const webhookUpdateSchema = z
  .object({
    application_id: applicationIdSchema,
    url: z.url(),
    topic: topicSchema,
    active: z.boolean().optional(),
  })
  .strict();

export const webhookListQuerySchema = paginationQuerySchema;

export const webhookIdInputSchema = z
  .object({
    id: uuidSchema.describe('Webhook subscription UUID'),
  })
  .strict();

export const webhookCreateToolSchema = webhookSchema;

export const webhookUpdateToolSchema = z
  .object({
    id: uuidSchema.optional().describe('Legacy webhook UUID, used only if the documented collection route is unavailable'),
    application_id: applicationIdSchema,
    url: z.url(),
    topic: topicSchema,
    active: z.boolean().optional(),
  })
  .strict();

export const webhookResponseSchema = z
  .object({
    id: z.string(),
    application_id: applicationIdSchema,
    url: z.url(),
    topic: topicSchema,
    company_key: z.string(),
    active: z.boolean(),
    created_at: dateTimeSchema,
  })
  .strict();

export const webhookListResponseSchema = z
  .object({
    pagination: z
      .object({
        page: positiveIntegerSchema,
        page_size: positiveIntegerSchema,
        total_results: z.number().int().nonnegative(),
      })
      .strict(),
    results: z.array(webhookResponseSchema),
    _links: z
      .object({
        previous: z.object({ href: z.url() }).strict().optional(),
        self: z.object({ href: z.url() }).strict().optional(),
        next: z.object({ href: z.url() }).strict().optional(),
      })
      .strict()
      .optional(),
    __links: linksSchema.optional(),
  })
  .strict();

export const webhookEntityToolOutputSchema = toolOutputSchema(webhookResponseSchema);
export const webhookListToolOutputSchema = toolOutputSchema(webhookListResponseSchema);
export const webhookDeleteToolOutputSchema = toolOutputSchema(deleteResponseSchema);

export type Webhook = z.infer<typeof webhookSchema>;
export type WebhookUpdate = z.infer<typeof webhookUpdateSchema>;
export type WebhookListQuery = z.infer<typeof webhookListQuerySchema>;
