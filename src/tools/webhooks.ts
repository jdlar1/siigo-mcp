import { errorResult, jsonResult } from '../mcp-results.js';
import {
  webhookCreateToolSchema,
  webhookDeleteToolOutputSchema,
  webhookEntityToolOutputSchema,
  webhookIdInputSchema,
  webhookListQuerySchema,
  webhookListToolOutputSchema,
  webhookUpdateToolSchema,
} from '../schemas/webhooks.js';
import type { ToolContext } from '../tool-context.js';

const readAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

const createAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
} as const;

const updateAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

const deleteAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export function registerWebhookTools({ server, client }: ToolContext) {
  server.registerTool(
    'siigo_get_webhooks',
    {
      title: 'Get Webhooks',
      description: 'Get webhook subscriptions with pagination.',
      inputSchema: webhookListQuerySchema,
      outputSchema: webhookListToolOutputSchema,
      annotations: readAnnotations,
    },
    async (args, extra) => {
      try {
        return jsonResult(await client.getWebhooks(args, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_get_webhooks', error);
      }
    },
  );

  server.registerTool(
    'siigo_create_webhook',
    {
      title: 'Create Webhook',
      description: 'Subscribe an application URL to a Siigo webhook topic.',
      inputSchema: webhookCreateToolSchema,
      outputSchema: webhookEntityToolOutputSchema,
      annotations: createAnnotations,
    },
    async (webhook, extra) => {
      try {
        return jsonResult(await client.createWebhook(webhook, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_create_webhook', error);
      }
    },
  );

  server.registerTool(
    'siigo_update_webhook',
    {
      title: 'Update Webhook',
      description:
        "Update a webhook subscription using Siigo's collection route. An optional legacy ID enables fallback for older deployments.",
      inputSchema: webhookUpdateToolSchema,
      outputSchema: webhookEntityToolOutputSchema,
      annotations: updateAnnotations,
    },
    async ({ id, ...webhook }, extra) => {
      try {
        return jsonResult(await client.updateWebhook(id, webhook, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_update_webhook', error);
      }
    },
  );

  server.registerTool(
    'siigo_delete_webhook',
    {
      title: 'Delete Webhook',
      description: 'Delete a webhook subscription by its UUID.',
      inputSchema: webhookIdInputSchema,
      outputSchema: webhookDeleteToolOutputSchema,
      annotations: deleteAnnotations,
    },
    async ({ id }, extra) => {
      try {
        return jsonResult(await client.deleteWebhook(id, { signal: extra.signal }));
      } catch (error) {
        return errorResult('siigo_delete_webhook', error);
      }
    },
  );
}
