import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { drive_v3 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';
import { formatFile, FILE_FIELDS } from './format.js';

export function registerDriveRename(server: McpServer, drive: drive_v3.Drive): void {
  server.tool(
    'drive_rename',
    'Rename a file or folder.',
    {
      file_id: z.string(),
      new_name: z.string(),
    },
    (params) =>
      safeToolHandler(async () => {
        const response = await drive.files.update({
          fileId: params.file_id,
          requestBody: { name: params.new_name },
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
