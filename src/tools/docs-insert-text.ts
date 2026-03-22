import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { docs_v1 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';

export function registerDocsInsertText(server: McpServer, docs: docs_v1.Docs): void {
  server.tool(
    'docs_insert_text',
    'Insert text at a specific position in a Google Doc. Use docs_read to get current index positions.',
    {
      document_id: z.string(),
      text: z.string(),
      index: z.number().min(1),
    },
    (params) =>
      safeToolHandler(async () => {
        await docs.documents.batchUpdate({
          documentId: params.document_id,
          requestBody: {
            requests: [{ insertText: { text: params.text, location: { index: params.index } } }],
          },
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  documentId: params.document_id,
                  message: `Inserted ${params.text.length} characters at index ${params.index}`,
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
