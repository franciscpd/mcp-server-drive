import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { sheets_v4 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';

export function registerSheetsList(server: McpServer, sheets: sheets_v4.Sheets): void {
  server.tool(
    'sheets_list',
    'List all sheets (tabs) in a spreadsheet.',
    {
      spreadsheet_id: z.string(),
    },
    (params) =>
      safeToolHandler(async () => {
        const response = await sheets.spreadsheets.get({
          spreadsheetId: params.spreadsheet_id,
          fields: 'spreadsheetId,properties.title,sheets.properties',
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  spreadsheetId: response.data.spreadsheetId,
                  title: response.data.properties!.title,
                  sheets: response.data.sheets!.map((s) => ({
                    sheetId: s.properties!.sheetId,
                    title: s.properties!.title,
                    index: s.properties!.index,
                    rowCount: s.properties!.gridProperties!.rowCount,
                    columnCount: s.properties!.gridProperties!.columnCount,
                  })),
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
