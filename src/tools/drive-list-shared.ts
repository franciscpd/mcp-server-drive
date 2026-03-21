import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { drive_v3 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';
import { buildPagination } from './format.js';

export function registerDriveListShared(server: McpServer, drive: drive_v3.Drive): void {
  server.tool(
    'drive_list_shared_drives',
    'List available Shared Drives (Team Drives).',
    {
      page_size: z.number().min(1).max(100).default(20),
      page_token: z.string().optional(),
    },
    (params) =>
      safeToolHandler(async () => {
        const response = await drive.drives.list({
          pageSize: params.page_size,
          pageToken: params.page_token,
        });

        const items = response.data.drives ?? [];
        const drives = items.map((d) => ({
          id: d.id,
          name: d.name,
          createdTime: d.createdTime,
        }));

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { drives, ...buildPagination(response.data.nextPageToken) },
                null,
                2,
              ),
            },
          ],
        };
      }),
  );
}
