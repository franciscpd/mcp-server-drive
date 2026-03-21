import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { drive_v3 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';
import { formatFile, FILE_FIELDS } from './format.js';

export function registerDriveMove(server: McpServer, drive: drive_v3.Drive): void {
  server.tool(
    'drive_move',
    'Move a file to a different folder.',
    {
      file_id: z.string(),
      destination_folder_id: z.string(),
    },
    (params) =>
      safeToolHandler(async () => {
        const current = await drive.files.get({
          fileId: params.file_id,
          fields: 'parents',
          supportsAllDrives: true,
        });

        const currentParents = current.data.parents ?? [];

        const response = await drive.files.update({
          fileId: params.file_id,
          addParents: params.destination_folder_id,
          removeParents: currentParents.join(','),
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
