import { describe, it, expect, vi } from 'vitest';
import { registerDriveCopy } from './drive-copy.js';
import { createMockDrive, createMockFile, captureToolHandler } from './test-helpers.js';

describe('drive_copy', () => {
  it('copies a file with defaults', async () => {
    const mockFile = createMockFile({ id: 'copy-1', name: 'test-file.txt' });
    const drive = createMockDrive({
      filesCopy: vi.fn().mockResolvedValue({ data: mockFile }),
    });

    const handler = captureToolHandler(registerDriveCopy, drive);
    const result = await handler({ file_id: 'original-1' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.id).toBe('copy-1');

    expect(drive.files.copy).toHaveBeenCalledWith({
      fileId: 'original-1',
      requestBody: {
        name: undefined,
        parents: undefined,
      },
      fields: expect.any(String),
      supportsAllDrives: true,
    });
  });

  it('copies with new name and parent', async () => {
    const mockFile = createMockFile({ id: 'copy-2', name: 'renamed.txt', parents: ['folder-99'] });
    const drive = createMockDrive({
      filesCopy: vi.fn().mockResolvedValue({ data: mockFile }),
    });

    const handler = captureToolHandler(registerDriveCopy, drive);
    const result = await handler({ file_id: 'original-2', name: 'renamed.txt', parent_id: 'folder-99' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.id).toBe('copy-2');
    expect(parsed.name).toBe('renamed.txt');
    expect(parsed.parents).toContain('folder-99');

    expect(drive.files.copy).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          name: 'renamed.txt',
          parents: ['folder-99'],
        }),
      }),
    );
  });

  it('returns error on API failure', async () => {
    const drive = createMockDrive({
      filesCopy: vi.fn().mockRejectedValue(new Error('Copy failed')),
    });

    const handler = captureToolHandler(registerDriveCopy, drive);
    const result = await handler({ file_id: 'x' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Copy failed');
  });
});
