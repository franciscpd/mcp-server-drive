import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { slides_v1 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';

export function registerSlidesCreate(server: McpServer, slides: slides_v1.Slides): void {
  server.tool(
    'slides_create',
    'Create a new Google Slides presentation.',
    {
      title: z.string(),
    },
    (params) =>
      safeToolHandler(async () => {
        const response = await slides.presentations.create({
          requestBody: { title: params.title },
        });

        const presentationId = response.data.presentationId!;
        const title = response.data.title!;

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  presentationId,
                  title,
                  url: `https://docs.google.com/presentation/d/${presentationId}/edit`,
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
