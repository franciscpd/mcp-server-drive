import { describe, it, expect, vi } from 'vitest';
import { registerDriveList } from './drive-list.js';
import { createMockDrive, createMockFile, captureToolHandler } from './test-helpers.js';

describe('drive_list', () => {
  it('lists files in root folder by default', async () => {
    const mockFile = createMockFile({ id: 'root-file', name: 'doc.txt' });
    const drive = createMockDrive({
      filesList: vi.fn().mockResolvedValue({
        data: { files: [mockFile], nextPageToken: null },
      }),
    });

    const handler = captureToolHandler(registerDriveList, drive);
    const result = await handler({ folder_id: 'root', page_size: 20 });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.files).toHaveLength(1);
    expect(parsed.files[0].id).toBe('root-file');
    expect(parsed.has_more).toBe(false);

    expect(drive.files.list).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "'root' in parents and trashed = false",
        pageSize: 20,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      }),
    );
  });

  it('lists files in a specific folder', async () => {
    const drive = createMockDrive({
      filesList: vi.fn().mockResolvedValue({
        data: { files: [createMockFile()], nextPageToken: 'next-tok' },
      }),
    });

    const handler = captureToolHandler(registerDriveList, drive);
    const result = await handler({ folder_id: 'folder-abc', page_size: 10, page_token: 'tok-1' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.has_more).toBe(true);
    expect(parsed.next_page_token).toBe('next-tok');

    expect(drive.files.list).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "'folder-abc' in parents and trashed = false",
        pageSize: 10,
        pageToken: 'tok-1',
      }),
    );
  });

  it('returns error on API failure', async () => {
    const drive = createMockDrive({
      filesList: vi.fn().mockRejectedValue(new Error('Network error')),
    });

    const handler = captureToolHandler(registerDriveList, drive);
    const result = await handler({ folder_id: 'root', page_size: 20 });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Network error');
  });
});
