import { describe, it, expect, vi } from 'vitest';
import { registerSheetsUpdate } from './sheets-update.js';
import { createMockSheets, captureToolHandler } from './test-helpers.js';

describe('sheets_update', () => {
  it('updates cells with RAW value input option', async () => {
    const sheets = createMockSheets({
      valuesUpdate: vi.fn().mockResolvedValue({
        data: { updatedRange: 'Sheet1!A1:B2', updatedRows: 2, updatedColumns: 2, updatedCells: 4 },
      }),
    });

    const values = [['Name', 'Age'], ['Bob', '25']];
    const handler = captureToolHandler(registerSheetsUpdate, sheets);
    const result = await handler({ spreadsheet_id: 'sheet-1', range: 'Sheet1!A1:B2', values });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.updatedRange).toBe('Sheet1!A1:B2');
    expect(parsed.updatedRows).toBe(2);
    expect(parsed.updatedColumns).toBe(2);
    expect(parsed.updatedCells).toBe(4);

    expect(sheets.spreadsheets.values.update).toHaveBeenCalledWith({
      spreadsheetId: 'sheet-1',
      range: 'Sheet1!A1:B2',
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  });

  it('passes values correctly to the API', async () => {
    const sheets = createMockSheets();
    const values = [['=SUM(A1:A10)']];

    const handler = captureToolHandler(registerSheetsUpdate, sheets);
    await handler({ spreadsheet_id: 'sheet-1', range: 'Sheet1!C1', values });

    const call = (sheets.spreadsheets.values.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.valueInputOption).toBe('RAW');
    expect(call.requestBody.values).toEqual([['=SUM(A1:A10)']]);
  });

  it('returns error on API failure', async () => {
    const sheets = createMockSheets({
      valuesUpdate: vi.fn().mockRejectedValue(new Error('Update failed')),
    });

    const handler = captureToolHandler(registerSheetsUpdate, sheets);
    const result = await handler({ spreadsheet_id: 'sheet-1', range: 'A1', values: [['x']] });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Update failed');
  });
});
