import { describe, it, expect, vi } from 'vitest';
import { registerSheetsRead } from './sheets-read.js';
import { createMockSheets, captureToolHandler } from './test-helpers.js';

describe('sheets_read', () => {
  it('reads values from a spreadsheet range', async () => {
    const sheets = createMockSheets({
      valuesGet: vi.fn().mockResolvedValue({
        data: { range: 'Sheet1!A1:B2', values: [['Name', 'Age'], ['Alice', '30']] },
      }),
    });

    const handler = captureToolHandler(registerSheetsRead, sheets);
    const result = await handler({ spreadsheet_id: 'sheet-1', range: 'Sheet1!A1:B2' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.range).toBe('Sheet1!A1:B2');
    expect(parsed.values).toEqual([['Name', 'Age'], ['Alice', '30']]);

    expect(sheets.spreadsheets.values.get).toHaveBeenCalledWith({
      spreadsheetId: 'sheet-1',
      range: 'Sheet1!A1:B2',
    });
  });

  it('returns empty array when no values', async () => {
    const sheets = createMockSheets({
      valuesGet: vi.fn().mockResolvedValue({
        data: { range: 'Sheet1!A1:A1', values: undefined },
      }),
    });

    const handler = captureToolHandler(registerSheetsRead, sheets);
    const result = await handler({ spreadsheet_id: 'sheet-1', range: 'Sheet1!A1:A1' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.values).toEqual([]);
  });

  it('returns error on API failure', async () => {
    const sheets = createMockSheets({
      valuesGet: vi.fn().mockRejectedValue(new Error('Read failed')),
    });

    const handler = captureToolHandler(registerSheetsRead, sheets);
    const result = await handler({ spreadsheet_id: 'sheet-1', range: 'Sheet1!A1:B2' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Read failed');
  });
});
