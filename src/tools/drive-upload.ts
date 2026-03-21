import { Readable } from 'node:stream';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { drive_v3 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';
import { formatFile, FILE_FIELDS } from './format.js';

export function registerDriveUpload(server: McpServer, drive: drive_v3.Drive): void {
  server.tool(
    'drive_upload',
    'Upload a text file to Google Drive. Use drive_create_folder to create folders first.',
    {
      name: z.string(),
      content: z.string(),
      mime_type: z.string().default('text/plain'),
      parent_id: z.string().optional(),
    },
    (params) =>
      safeToolHandler(async () => {
        const response = await drive.files.create({
          requestBody: {
            name: params.name,
            mimeType: params.mime_type,
            parents: params.parent_id ? [params.parent_id] : undefined,
          },
          media: {
            mimeType: params.mime_type,
            body: Readable.from(params.content),
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
