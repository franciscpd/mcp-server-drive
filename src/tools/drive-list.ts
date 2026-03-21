import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { drive_v3 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';
import { formatFile, buildPagination, FILE_FIELDS } from './format.js';

export function registerDriveList(server: McpServer, drive: drive_v3.Drive): void {
  server.tool(
    'drive_list',
    'List files and folders in a specific folder. Defaults to root. Use drive_search for query-based search.',
    {
      folder_id: z.string().default('root'),
      page_size: z.number().min(1).max(100).default(20),
      page_token: z.string().optional(),
    },
    (params) =>
      safeToolHandler(async () => {
        const response = await drive.files.list({
          q: `'${params.folder_id}' in parents and trashed = false`,
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
