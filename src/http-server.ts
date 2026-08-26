import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from './mcp-server.js';
import type { SiigoClient } from './siigo-client.js';

export interface HttpServerOptions {
  client: SiigoClient;
  host?: string;
  authToken?: string;
  allowedHosts?: string[];
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

export function createHttpApp({ client, host = '127.0.0.1', authToken, allowedHosts }: HttpServerOptions) {
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

  app.post('/mcp', async (req, res) => {
    const server = createMcpServer(client);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    let closed = false;

    const closeRequest = async () => {
      if (closed) {
        return;
      }

      closed = true;
      await transport.close();
      await server.close();
    };

    res.on('close', () => {
      void closeRequest();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error: unknown) {
      console.error('Error handling MCP request:', error);

      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }

      await closeRequest();
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
