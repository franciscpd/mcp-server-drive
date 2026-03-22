import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { sheets_v4 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';

export function registerSheetsRead(server: McpServer, sheets: sheets_v4.Sheets): void {
  server.tool(
    'sheets_read',
    'Read cell values from a spreadsheet range using A1 notation (e.g., "Sheet1!A1:C10").',
    {
      spreadsheet_id: z.string(),
      range: z.string(),
    },
    (params) =>
      safeToolHandler(async () => {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: params.spreadsheet_id,
          range: params.range,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  range: response.data.range,
                  values: response.data.values ?? [],
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
