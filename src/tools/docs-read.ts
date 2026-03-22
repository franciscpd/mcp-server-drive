import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { docs_v1 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';

export function registerDocsRead(server: McpServer, docs: docs_v1.Docs): void {
  server.tool(
    'docs_read',
    'Read a Google Doc\'s content as plain text with paragraph index information. Use indices for docs_insert_text and docs_delete_text.',
    {
      document_id: z.string(),
    },
    (params) =>
      safeToolHandler(async () => {
        const response = await docs.documents.get({ documentId: params.document_id });

        const doc = response.data;
        const paragraphs: { start: number; end: number; text: string }[] = [];
        let fullText = '';

        for (const element of doc.body?.content ?? []) {
          if (!element.paragraph) continue;

          const start = element.startIndex ?? 0;
          const end = element.endIndex ?? 0;
          let paragraphText = '';

          for (const pe of element.paragraph.elements ?? []) {
            if (pe.textRun?.content) {
              paragraphText += pe.textRun.content;
            }
          }

          paragraphs.push({ start, end, text: paragraphText });
          fullText += paragraphText;
        }

        const length = paragraphs.length > 0 ? paragraphs[paragraphs.length - 1].end : 0;

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  documentId: doc.documentId,
                  title: doc.title,
                  text: fullText,
                  length,
                  paragraphs,
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
