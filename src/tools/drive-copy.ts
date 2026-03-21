import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { drive_v3 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';
import { formatFile, FILE_FIELDS } from './format.js';

export function registerDriveCopy(server: McpServer, drive: drive_v3.Drive): void {
  server.tool(
    'drive_copy',
    'Copy a file. Optionally set a new name and/or parent folder.',
    {
      file_id: z.string(),
      name: z.string().optional(),
      parent_id: z.string().optional(),
    },
    (params) =>
      safeToolHandler(async () => {
        const response = await drive.files.copy({
          fileId: params.file_id,
          requestBody: {
            name: params.name,
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
