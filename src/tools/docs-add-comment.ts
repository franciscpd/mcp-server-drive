import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { drive_v3 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';

export function registerDocsAddComment(server: McpServer, drive: drive_v3.Drive): void {
  server.tool(
    'docs_add_comment',
    'Add a comment to a Google Doc.',
    {
      document_id: z.string(),
      content: z.string(),
    },
    (params) =>
      safeToolHandler(async () => {
        const response = await drive.comments.create({
          fileId: params.document_id,
          fields: 'id,author(displayName,emailAddress),content,createdTime',
          requestBody: { content: params.content },
        });

        const data = response.data;

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  id: data.id,
                  author: { name: data.author?.displayName, email: data.author?.emailAddress },
                  content: data.content,
                  createdTime: data.createdTime,
                },
                null,
                2,
              ),
            },
          ],
        };
      }),
  );
}
