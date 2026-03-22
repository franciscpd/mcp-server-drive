import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { sheets_v4 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';

export function registerSheetsCreate(server: McpServer, sheets: sheets_v4.Sheets): void {
  server.tool(
    'sheets_create',
    'Create a new Google Spreadsheet with optional initial data. Data is a 2D array of strings.',
    {
      title: z.string(),
      data: z.array(z.array(z.string())).optional(),
    },
    (params) =>
      safeToolHandler(async () => {
        const response = await sheets.spreadsheets.create({
          requestBody: { properties: { title: params.title } },
        });

        const spreadsheetId = response.data.spreadsheetId!;

        if (params.data) {
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Sheet1',
            valueInputOption: 'RAW',
            requestBody: { values: params.data },
          });
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  spreadsheetId,
                  title: response.data.properties!.title,
                  url: response.data.spreadsheetUrl,
                  sheets: response.data.sheets!.map((s) => ({
                    sheetId: s.properties!.sheetId,
                    title: s.properties!.title,
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
