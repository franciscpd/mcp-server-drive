import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DriveClient } from '../auth/client.js';

export function registerTools(
  _server: McpServer,
  _client: DriveClient,
): void {
  // Tools will be registered in future phases:
  // Phase 2: registerDriveTools(server, client.drive)
  // Phase 3: registerDocsTools(server, client.docs)
  // Phase 3: registerSheetsTools(server, client.sheets)
  // Phase 4: registerSlidesTools(server, client.slides)
}
