import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { drive_v3 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';
import { formatFile, FILE_FIELDS } from './format.js';

export function registerDriveShare(server: McpServer, drive: drive_v3.Drive): void {
  server.tool(
    'drive_share',
    'Share a file or folder with a user by email. Sets permission role (reader, writer, or commenter).',
    {
      file_id: z.string(),
      email: z.string(),
      role: z.enum(['reader', 'writer', 'commenter']),
    },
    (params) =>
      safeToolHandler(async () => {
        const permResponse = await drive.permissions.create({
          fileId: params.file_id,
          requestBody: {
            type: 'user',
            role: params.role,
            emailAddress: params.email,
          },
          supportsAllDrives: true,
        });

        const fileResponse = await drive.files.get({
          fileId: params.file_id,
          fields: FILE_FIELDS,
          supportsAllDrives: true,
        });

        const perm = permResponse.data;

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  file: formatFile(fileResponse.data),
                  permission: {
                    id: perm.id,
                    type: perm.type,
                    role: perm.role,
                    emailAddress: perm.emailAddress,
                  },
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
