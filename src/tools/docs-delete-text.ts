import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { docs_v1 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';

export function registerDocsDeleteText(server: McpServer, docs: docs_v1.Docs): void {
  server.tool(
    'docs_delete_text',
    'Delete a range of text from a Google Doc. Use docs_read to get current index positions.',
    {
      document_id: z.string(),
      start_index: z.number().min(1),
      end_index: z.number().min(1),
    },
    (params) =>
      safeToolHandler(async () => {
        await docs.documents.batchUpdate({
          documentId: params.document_id,
          requestBody: {
            requests: [
              {
                deleteContentRange: {
                  range: {
                    startIndex: params.start_index,
                    endIndex: params.end_index,
                    segmentId: '',
                  },
                },
              },
            ],
          },
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  documentId: params.document_id,
                  message: `Deleted range ${params.start_index}-${params.end_index}`,
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
