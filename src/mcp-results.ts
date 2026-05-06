import { SiigoApiError } from './siigo-client.js';

export function jsonResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function errorResult(toolName: string, error: unknown) {
  const detail = error instanceof SiigoApiError && error.response ? `\n${JSON.stringify(error.response, null, 2)}` : '';

  return {
    content: [
      {
        type: 'text' as const,
        text: `Error executing ${toolName}: ${error instanceof Error ? error.message : String(error)}${detail}`,
      },
    ],
    isError: true as const,
  };
}
