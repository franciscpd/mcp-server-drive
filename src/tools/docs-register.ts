import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DriveClient } from '../auth/client.js';
import { registerDocsCreate } from './docs-create.js';
import { registerDocsRead } from './docs-read.js';
import { registerDocsInsertText } from './docs-insert-text.js';
import { registerDocsDeleteText } from './docs-delete-text.js';
import { registerDocsListComments } from './docs-list-comments.js';
import { registerDocsAddComment } from './docs-add-comment.js';

export function registerDocsTools(server: McpServer, client: DriveClient): void {
  registerDocsCreate(server, client.docs);
  registerDocsRead(server, client.docs);
  registerDocsInsertText(server, client.docs);
  registerDocsDeleteText(server, client.docs);
  registerDocsListComments(server, client.drive);
  registerDocsAddComment(server, client.drive);
}
