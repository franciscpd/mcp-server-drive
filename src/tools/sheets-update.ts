import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { sheets_v4 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';

export function registerSheetsUpdate(server: McpServer, sheets: sheets_v4.Sheets): void {
  server.tool(
    'sheets_update',
    'Update cell values in a spreadsheet range. Values are written as literal text (formulas are NOT executed).',
    {
      spreadsheet_id: z.string(),
      range: z.string(),
      values: z.array(z.array(z.string())),
    },
    (params) =>
      safeToolHandler(async () => {
        const response = await sheets.spreadsheets.values.update({
          spreadsheetId: params.spreadsheet_id,
          range: params.range,
          valueInputOption: 'RAW',
          requestBody: { values: params.values },
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  updatedRange: response.data.updatedRange,
                  updatedRows: response.data.updatedRows,
                  updatedColumns: response.data.updatedColumns,
                  updatedCells: response.data.updatedCells,
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
