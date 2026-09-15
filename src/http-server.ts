import { createMcpExpressApp } from '@modelcontextprotocol/express';
import { NodeStreamableHTTPServerTransport, toNodeHandler, toWebRequest } from '@modelcontextprotocol/node';
import { createMcpHandler, isLegacyRequest } from '@modelcontextprotocol/server';
import { createMcpServer } from './mcp-server.js';
import { OperationRegistry } from './operations.js';
import type { SiigoClient } from './siigo-client.js';

export interface HttpServerOptions {
  client: SiigoClient;
  host?: string;
  authToken?: string;
  allowedHosts?: string[];
  toolProfile?: 'compact' | 'legacy';
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.has(host.toLowerCase());
}

function unauthorizedResult() {
  return {
    jsonrpc: '2.0',
    error: {
      code: -32001,
      message: 'Unauthorized',
    },
    id: null,
  };
}

function methodNotAllowedResult() {
  return {
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message: 'Method not allowed',
    },
    id: null,
  };
}

export function createHttpApp({ client, host = '127.0.0.1', authToken, allowedHosts, toolProfile = 'compact' }: HttpServerOptions) {
  if (!isLoopbackHost(host) && !authToken) {
    throw new Error('authToken is required when the MCP HTTP server binds to a non-loopback host');
  }

  const app = createMcpExpressApp({ host, ...(allowedHosts ? { allowedHosts } : {}) });

  app.use('/mcp', (req, res, next) => {
    if (authToken && req.headers.authorization !== `Bearer ${authToken}`) {
      res.status(401).json(unauthorizedResult());
      return;
    }

    next();
  });

  const operations = new OperationRegistry(client);
  const factory = async () => {
    if (toolProfile === 'legacy') {
      const { createLegacyMcpServer } = await import('./legacy-server.js');
      return createLegacyMcpServer(client);
    }
    return createMcpServer(client, { operations });
  };
  const onerror = (error: unknown) => console.error('Error handling MCP request:', error);
  const handler = createMcpHandler(factory, { legacy: 'reject', onerror });
  const nodeHandler = toNodeHandler(handler, { onerror });
  app.locals.closeMcp = () => handler.close();
  app.post('/mcp', async (req, res) => {
    // Preserve JSON responses for existing 2025 clients; modern traffic uses
    // the SDK's per-request handler and its cancellation semantics.
    if (!(await isLegacyRequest(await toWebRequest(req, req.body), req.body))) {
      await nodeHandler(req, res, req.body);
      return;
    }
    const server = await factory();
    const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    let closed = false;
    const close = async () => {
      if (closed) return;
      closed = true;
      await transport.close();
      await server.close();
    };
    res.on('close', () => {
      void close().catch(onerror);
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error: unknown) {
      onerror(error);
      if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Internal server error' } });
      await close();
    }
  });

  app.get('/mcp', (_req, res) => {
    res.status(405).json(methodNotAllowedResult());
  });

  app.delete('/mcp', (_req, res) => {
    res.status(405).json(methodNotAllowedResult());
  });

  return app;
}
