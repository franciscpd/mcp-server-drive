import { describe, it, expect, vi } from 'vitest';
import { registerSheetsCreate } from './sheets-create.js';
import { createMockSheets, captureToolHandler } from './test-helpers.js';

describe('sheets_create', () => {
  it('creates a spreadsheet without data', async () => {
    const sheets = createMockSheets({
      spreadsheetsCreate: vi.fn().mockResolvedValue({
        data: {
          spreadsheetId: 'sheet-1',
          properties: { title: 'My Sheet' },
          spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/sheet-1/edit',
          sheets: [{ properties: { sheetId: 0, title: 'Sheet1' } }],
        },
      }),
    });

    const handler = captureToolHandler(registerSheetsCreate, sheets);
    const result = await handler({ title: 'My Sheet' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.spreadsheetId).toBe('sheet-1');
    expect(parsed.title).toBe('My Sheet');
    expect(parsed.url).toBe('https://docs.google.com/spreadsheets/d/sheet-1/edit');
    expect(parsed.sheets).toEqual([{ sheetId: 0, title: 'Sheet1' }]);

    expect(sheets.spreadsheets.create).toHaveBeenCalledWith({
      requestBody: { properties: { title: 'My Sheet' } },
    });
    expect(sheets.spreadsheets.values.update).not.toHaveBeenCalled();
  });

  it('creates a spreadsheet with initial data', async () => {
    const sheets = createMockSheets({
      spreadsheetsCreate: vi.fn().mockResolvedValue({
        data: {
          spreadsheetId: 'sheet-2',
          properties: { title: 'With Data' },
          spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/sheet-2/edit',
          sheets: [{ properties: { sheetId: 0, title: 'Sheet1' } }],
        },
      }),
    });

    const data = [['Name', 'Age'], ['Alice', '30']];
    const handler = captureToolHandler(registerSheetsCreate, sheets);
    const result = await handler({ title: 'With Data', data });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.spreadsheetId).toBe('sheet-2');

    expect(sheets.spreadsheets.create).toHaveBeenCalledWith({
      requestBody: { properties: { title: 'With Data' } },
    });
    expect(sheets.spreadsheets.values.update).toHaveBeenCalledWith({
      spreadsheetId: 'sheet-2',
      range: 'Sheet1',
      valueInputOption: 'RAW',
      requestBody: { values: data },
    });
  });

  it('returns error on API failure', async () => {
    const sheets = createMockSheets({
      spreadsheetsCreate: vi.fn().mockRejectedValue(new Error('Create failed')),
    });

    const handler = captureToolHandler(registerSheetsCreate, sheets);
    const result = await handler({ title: 'Fail' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Create failed');
  });
});
