import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { docs_v1 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';

export function registerDocsCreate(server: McpServer, docs: docs_v1.Docs): void {
  server.tool(
    'docs_create',
    'Create a new Google Doc with optional initial content.',
    {
      title: z.string(),
      content: z.string().optional(),
    },
    (params) =>
      safeToolHandler(async () => {
        const response = await docs.documents.create({
          requestBody: { title: params.title },
        });

        const documentId = response.data.documentId!;
        const title = response.data.title!;

        if (params.content) {
          await docs.documents.batchUpdate({
            documentId,
            requestBody: {
              requests: [{ insertText: { text: params.content, location: { index: 1 } } }],
            },
          });
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  documentId,
                  title,
                  url: `https://docs.google.com/document/d/${documentId}/edit`,
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
