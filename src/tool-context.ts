import type { CallToolResult, ServerContext, ToolAnnotations } from '@modelcontextprotocol/server';
import type { z } from 'zod';
import type { SiigoClient } from './siigo-client.js';

export interface OperationConfig<Input extends z.ZodType = z.ZodType, Output extends z.ZodType = z.ZodType> {
  title: string;
  description: string;
  inputSchema: Input;
  outputSchema: Output;
  annotations: ToolAnnotations;
}

/** The same definitions can be registered as MCP tools or loaded as internal operations. */
export interface ToolRegistrar {
  registerTool<Input extends z.ZodType, Output extends z.ZodType>(
    name: string,
    config: OperationConfig<Input, Output>,
    handler: (args: z.output<Input>, context: ServerContext) => Promise<CallToolResult>,
  ): void;
}

export interface ToolContext {
  server: ToolRegistrar;
  client: SiigoClient;
}
