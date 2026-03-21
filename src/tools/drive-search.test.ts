import { describe, it, expect, vi } from 'vitest';
import { registerDriveSearch } from './drive-search.js';
import { createMockDrive, createMockFile, captureToolHandler } from './test-helpers.js';

describe('drive_search', () => {
  it('searches files with query and returns formatted results', async () => {
    const mockFile = createMockFile({ id: 'search-1', name: 'report.pdf' });
    const drive = createMockDrive({
      filesList: vi.fn().mockResolvedValue({
        data: { files: [mockFile], nextPageToken: null },
      }),
    });

    const handler = captureToolHandler(registerDriveSearch, drive);
    const result = await handler({ query: "name contains 'report'", page_size: 20 });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.files).toHaveLength(1);
    expect(parsed.files[0].id).toBe('search-1');
    expect(parsed.files[0].name).toBe('report.pdf');
    expect(parsed.has_more).toBe(false);
    expect(parsed.next_page_token).toBeNull();

    expect(drive.files.list).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "name contains 'report'",
        pageSize: 20,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      }),
    );
  });

  it('passes pagination parameters', async () => {
    const drive = createMockDrive({
      filesList: vi.fn().mockResolvedValue({
        data: { files: [], nextPageToken: 'token-abc' },
      }),
    });

    const handler = captureToolHandler(registerDriveSearch, drive);
    const result = await handler({
      query: 'trashed = false',
      page_size: 50,
      page_token: 'prev-token',
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.has_more).toBe(true);
    expect(parsed.next_page_token).toBe('token-abc');

    expect(drive.files.list).toHaveBeenCalledWith(
      expect.objectContaining({
        pageSize: 50,
        pageToken: 'prev-token',
      }),
    );
  });

  it('returns error on API failure', async () => {
    const drive = createMockDrive({
      filesList: vi.fn().mockRejectedValue(new Error('API error')),
    });

    const handler = captureToolHandler(registerDriveSearch, drive);
    const result = await handler({ query: 'test' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('API error');
  });
});
