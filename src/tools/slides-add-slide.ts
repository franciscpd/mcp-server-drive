import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { slides_v1 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';

export function registerSlidesAddSlide(server: McpServer, slides: slides_v1.Slides): void {
  server.tool(
    'slides_add_slide',
    'Add a new slide to an existing presentation. Optionally specify a predefined layout (BLANK, TITLE, TITLE_AND_BODY, TITLE_ONLY).',
    {
      presentation_id: z.string(),
      layout: z.string().default('BLANK'),
    },
    (params) =>
      safeToolHandler(async () => {
        const response = await slides.presentations.batchUpdate({
          presentationId: params.presentation_id,
          requestBody: {
            requests: [
              {
                createSlide: {
                  slideLayoutReference: { predefinedLayout: params.layout },
                },
              },
            ],
          },
        });

        const presentationId = response.data.presentationId!;
        const slideObjectId = response.data.replies![0].createSlide!.objectId!;

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ presentationId, slideObjectId }, null, 2),
            },
          ],
        };
      }),
  );
}
