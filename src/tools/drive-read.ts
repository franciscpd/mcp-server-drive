import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { drive_v3 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';
import { formatFile, FILE_FIELDS } from './format.js';
import { readFileContent } from './export.js';

export function registerDriveRead(server: McpServer, drive: drive_v3.Drive): void {
  server.tool(
    'drive_read',
    'Read file content from Google Drive. Automatically exports Google Workspace files: Docs as Markdown, Sheets as CSV, Slides as plain text. Best for text-based files.',
    {
      file_id: z.string(),
    },
    (params) =>
      safeToolHandler(async () => {
        const metaResponse = await drive.files.get({
          fileId: params.file_id,
          fields: FILE_FIELDS,
          supportsAllDrives: true,
        });

        const content = await readFileContent(
          drive,
          params.file_id,
          metaResponse.data.mimeType ?? '',
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { file: formatFile(metaResponse.data), content },
                null,
                2,
              ),
            },
          ],
        };
      }),
  );
}
