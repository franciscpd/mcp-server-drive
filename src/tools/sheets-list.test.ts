import { describe, it, expect, vi } from 'vitest';
import { registerSheetsList } from './sheets-list.js';
import { createMockSheets, captureToolHandler } from './test-helpers.js';

describe('sheets_list', () => {
  it('lists all sheets with properties', async () => {
    const sheets = createMockSheets({
      spreadsheetsGet: vi.fn().mockResolvedValue({
        data: {
          spreadsheetId: 'sheet-1',
          properties: { title: 'My Spreadsheet' },
          sheets: [
            { properties: { sheetId: 0, title: 'Sheet1', index: 0, gridProperties: { rowCount: 1000, columnCount: 26 } } },
            { properties: { sheetId: 1, title: 'Sheet2', index: 1, gridProperties: { rowCount: 500, columnCount: 10 } } },
          ],
        },
      }),
    });

    const handler = captureToolHandler(registerSheetsList, sheets);
    const result = await handler({ spreadsheet_id: 'sheet-1' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.spreadsheetId).toBe('sheet-1');
    expect(parsed.title).toBe('My Spreadsheet');
    expect(parsed.sheets).toEqual([
      { sheetId: 0, title: 'Sheet1', index: 0, rowCount: 1000, columnCount: 26 },
      { sheetId: 1, title: 'Sheet2', index: 1, rowCount: 500, columnCount: 10 },
    ]);

    expect(sheets.spreadsheets.get).toHaveBeenCalledWith({
      spreadsheetId: 'sheet-1',
      fields: 'spreadsheetId,properties.title,sheets.properties',
    });
  });

  it('returns error on API failure', async () => {
    const sheets = createMockSheets({
      spreadsheetsGet: vi.fn().mockRejectedValue(new Error('List failed')),
    });

    const handler = captureToolHandler(registerSheetsList, sheets);
    const result = await handler({ spreadsheet_id: 'sheet-1' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('List failed');
  });
});
