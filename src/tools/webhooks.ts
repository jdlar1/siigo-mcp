import { z } from 'zod';
import { errorResult, jsonResult } from '../mcp-results.js';
import type { ToolContext } from '../tool-context.js';

export function registerWebhookTools({ server, client }: ToolContext) {
  // ═══════════════════════════════════════════════════════════════════════════
  // WEBHOOKS (4 tools)
  // ═══════════════════════════════════════════════════════════════════════════

  server.registerTool(
    'siigo_get_webhooks',
    {
      title: 'Get Webhooks',
      description: 'Get list of webhook subscriptions',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async () => {
      try {
        return jsonResult(await client.getWebhooks());
      } catch (e) {
        return errorResult('siigo_get_webhooks', e);
      }
    },
  );

  server.registerTool(
    'siigo_create_webhook',
    {
      title: 'Create Webhook',
      description: 'Subscribe to a webhook event',
      inputSchema: z.object({
        event: z.string().describe('Event to subscribe to'),
        url: z.string().describe('Webhook URL (HTTPS)'),
        secret: z.string().optional().describe('Webhook secret for signature verification'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (args) => {
      try {
        return jsonResult(await client.createWebhook(args));
      } catch (e) {
        return errorResult('siigo_create_webhook', e);
      }
    },
  );

  server.registerTool(
    'siigo_update_webhook',
    {
      title: 'Update Webhook',
      description: 'Update an existing webhook subscription',
      inputSchema: z.object({
        id: z.string().describe('Webhook ID'),
        event: z.string().optional().describe('Event to subscribe to'),
        url: z.string().optional().describe('Webhook URL (HTTPS)'),
        secret: z.string().optional().describe('Webhook secret'),
        active: z.boolean().optional().describe('Active status'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ id, ...webhook }) => {
      try {
        return jsonResult(await client.updateWebhook(id, webhook));
      } catch (e) {
        return errorResult('siigo_update_webhook', e);
      }
    },
  );

  server.registerTool(
    'siigo_delete_webhook',
    {
      title: 'Delete Webhook',
      description: 'Delete a webhook subscription',
      inputSchema: z.object({
        id: z.string().describe('Webhook ID'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ id }) => {
      try {
        return jsonResult(await client.deleteWebhook(id));
      } catch (e) {
        return errorResult('siigo_delete_webhook', e);
      }
    },
  );
}
