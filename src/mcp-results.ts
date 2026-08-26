import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { SiigoApiError } from './siigo-client.js';

const MAX_ERROR_DETAIL_LENGTH = 4000;
const MAX_ERROR_MESSAGE_LENGTH = 1000;

function boundedText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

function safeJson(data: unknown, maxLength?: number): string {
  let serialized: string;

  try {
    serialized = JSON.stringify(data === undefined ? null : data, null, 2) ?? 'null';
  } catch {
    serialized = JSON.stringify({ error: 'Unable to serialize response' });
  }

  if (maxLength !== undefined && serialized.length > maxLength) {
    return `${serialized.slice(0, maxLength)}…`;
  }

  return serialized;
}

function toJsonValue(data: unknown): unknown {
  try {
    return JSON.parse(safeJson(data));
  } catch {
    return null;
  }
}

export function jsonResult(data: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: safeJson(data) }],
    structuredContent: { result: toJsonValue(data) },
  };
}

export function errorResult(toolName: string, error: unknown): CallToolResult {
  const apiError = error instanceof SiigoApiError ? error : undefined;
  const message = boundedText(error instanceof Error ? error.message : String(error), MAX_ERROR_MESSAGE_LENGTH);
  const detail = apiError?.response === undefined ? undefined : safeJson(apiError.response, MAX_ERROR_DETAIL_LENGTH);
  const text = `Error executing ${toolName}: ${message}${detail ? `\n${detail}` : ''}`;
  const structuredError: Record<string, unknown> = {
    tool: toolName,
    message,
    ...(apiError?.status === undefined ? {} : { status: apiError.status }),
    ...(detail === undefined ? {} : { details: detail }),
  };

  return {
    content: [{ type: 'text', text }],
    structuredContent: { error: structuredError },
    isError: true,
  };
}
