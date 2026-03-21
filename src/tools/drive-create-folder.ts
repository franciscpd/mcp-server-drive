import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { drive_v3 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';
import { formatFile, FILE_FIELDS } from './format.js';

export function registerDriveCreateFolder(server: McpServer, drive: drive_v3.Drive): void {
  server.tool(
    'drive_create_folder',
    'Create a new folder in Google Drive. Optionally specify a parent folder.',
    {
      name: z.string(),
      parent_id: z.string().optional(),
    },
    (params) =>
      safeToolHandler(async () => {
        const response = await drive.files.create({
          requestBody: {
            name: params.name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: params.parent_id ? [params.parent_id] : undefined,
          },
          fields: FILE_FIELDS,
          supportsAllDrives: true,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(formatFile(response.data), null, 2),
            },
          ],
        };
      }),
  );
}
