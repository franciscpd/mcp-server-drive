import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { drive_v3 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';

export function registerDocsListComments(server: McpServer, drive: drive_v3.Drive): void {
  server.tool(
    'docs_list_comments',
    'List all comments on a Google Doc.',
    {
      document_id: z.string(),
    },
    (params) =>
      safeToolHandler(async () => {
        const response = await drive.comments.list({
          fileId: params.document_id,
          fields: 'comments(id,author(displayName,emailAddress),content,createdTime,resolved)',
        });

        const comments = (response.data.comments ?? []).map((c) => ({
          id: c.id,
          author: { name: c.author?.displayName, email: c.author?.emailAddress },
          content: c.content,
          createdTime: c.createdTime,
          resolved: c.resolved ?? false,
        }));

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ comments }, null, 2),
            },
          ],
        };
      }),
  );
}
