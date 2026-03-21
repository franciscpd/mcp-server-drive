import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { validateEnv } from './auth/env.js';
import { createDriveClient, validateCredentials } from './auth/client.js';
import { createServer } from './server.js';
import { logger } from './utils/logger.js';

async function main() {
  const credentials = validateEnv();
  const client = createDriveClient(credentials);
  await validateCredentials(client.drive);

  const server = createServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('Drive MCP Server running on stdio');

  const gracefulShutdown = async () => {
    logger.info('Drive MCP Server shutting down');
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}

main().catch((error) => {
  logger.error(
    error instanceof Error ? error.message : 'Unknown error',
  );
  process.exit(1);
});
