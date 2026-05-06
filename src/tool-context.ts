import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SiigoClient } from './siigo-client.js';

export interface ToolContext {
  server: McpServer;
  client: SiigoClient;
}
