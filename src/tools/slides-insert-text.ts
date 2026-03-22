import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { slides_v1 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';

export function registerSlidesInsertText(server: McpServer, slides: slides_v1.Slides): void {
  server.tool(
    'slides_insert_text',
    'Insert or replace text in a slide shape/placeholder. Use slides_read to get objectIds.',
    {
      presentation_id: z.string(),
      object_id: z.string(),
      text: z.string(),
    },
    (params) =>
      safeToolHandler(async () => {
        await slides.presentations.batchUpdate({
          presentationId: params.presentation_id,
          requestBody: {
            requests: [
              {
                deleteText: {
                  objectId: params.object_id,
                  textRange: { type: 'ALL' },
                },
              },
              {
                insertText: {
                  objectId: params.object_id,
                  text: params.text,
                  insertionIndex: 0,
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
                  presentationId: params.presentation_id,
                  objectId: params.object_id,
                  message: `Text updated in shape ${params.object_id}`,
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
