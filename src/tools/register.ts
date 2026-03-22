import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DriveClient } from '../auth/client.js';
import { registerDriveSearch } from './drive-search.js';
import { registerDriveList } from './drive-list.js';
import { registerDriveCreateFolder } from './drive-create-folder.js';
import { registerDriveUpload } from './drive-upload.js';
import { registerDriveRead } from './drive-read.js';
import { registerDriveDelete } from './drive-delete.js';
import { registerDriveMove } from './drive-move.js';
import { registerDriveCopy } from './drive-copy.js';
import { registerDriveRename } from './drive-rename.js';
import { registerDriveShare } from './drive-share.js';
import { registerDriveListShared } from './drive-list-shared.js';
import { registerDocsTools } from './docs-register.js';
import { registerSheetsTools } from './sheets-register.js';

export function registerTools(
  server: McpServer,
  client: DriveClient,
): void {
  // Phase 2: Drive tools
  registerDriveSearch(server, client.drive);
  registerDriveList(server, client.drive);
  registerDriveCreateFolder(server, client.drive);
  registerDriveUpload(server, client.drive);
  registerDriveRead(server, client.drive);
  registerDriveDelete(server, client.drive);
  registerDriveMove(server, client.drive);
  registerDriveCopy(server, client.drive);
  registerDriveRename(server, client.drive);
  registerDriveShare(server, client.drive);
  registerDriveListShared(server, client.drive);

  // Phase 3: Docs + Sheets tools
  registerDocsTools(server, client);
  registerSheetsTools(server, client.sheets);

  // Phase 4: registerSlidesTools(server, client.slides)
}
