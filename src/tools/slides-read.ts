import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { slides_v1 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';

export function registerSlidesRead(server: McpServer, slides: slides_v1.Slides): void {
  server.tool(
    'slides_read',
    'Read a Google Slides presentation\'s content including slide objectIds, shapes, and text. Use objectIds with slides_insert_text to modify content.',
    {
      presentation_id: z.string(),
    },
    (params) =>
      safeToolHandler(async () => {
        const response = await slides.presentations.get({
          presentationId: params.presentation_id,
        });

        const presentation = response.data;
        const extractedSlides = (presentation.slides ?? []).map((slide) => ({
          objectId: slide.objectId,
          pageElements: (slide.pageElements ?? [])
            .filter((el) => el.shape)
            .map((el) => {
              const text = (el.shape!.text?.textElements ?? [])
                .map((te) => te.textRun?.content ?? '')
                .join('')
                .trimEnd();
              return {
                objectId: el.objectId,
                shapeType: el.shape!.shapeType,
                placeholderType: el.shape!.placeholder?.type ?? null,
                text,
              };
            }),
        }));

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  presentationId: presentation.presentationId,
                  title: presentation.title,
                  slides: extractedSlides,
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
