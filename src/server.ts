import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DriveClient } from './auth/client.js';
import { registerTools } from './tools/register.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

export function createServer(client: DriveClient): McpServer {
  const server = new McpServer({
    name: 'drive-mcp-server',
    version,
  });

  registerTools(server, client);

  return server;
}
