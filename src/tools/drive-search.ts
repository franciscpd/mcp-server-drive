import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { drive_v3 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';
import { formatFile, buildPagination, FILE_FIELDS } from './format.js';

export function registerDriveSearch(server: McpServer, drive: drive_v3.Drive): void {
  server.tool(
    'drive_search',
    "Search files across Google Drive using query syntax (e.g., \"name contains 'report'\", \"mimeType = 'application/vnd.google-apps.folder'\"). Returns paginated results including Shared Drive files. Use drive_read to get file content.",
    {
      query: z.string(),
      page_size: z.number().min(1).max(100).default(20),
      page_token: z.string().optional(),
    },
    (params) =>
      safeToolHandler(async () => {
        const response = await drive.files.list({
          q: params.query,
          pageSize: params.page_size,
          pageToken: params.page_token,
          fields: `nextPageToken, files(${FILE_FIELDS})`,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });

        const files = (response.data.files ?? []).map(formatFile);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { files, ...buildPagination(response.data.nextPageToken) },
                null,
                2,
              ),
            },
          ],
        };
      }),
  );
}
