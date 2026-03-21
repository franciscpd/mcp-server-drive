import { describe, it, expect, vi } from 'vitest';
import { registerDriveRename } from './drive-rename.js';
import { createMockDrive, createMockFile, captureToolHandler } from './test-helpers.js';

describe('drive_rename', () => {
  it('renames a file', async () => {
    const mockFile = createMockFile({ id: 'ren-1', name: 'new-name.txt' });
    const drive = createMockDrive({
      filesUpdate: vi.fn().mockResolvedValue({ data: mockFile }),
    });

    const handler = captureToolHandler(registerDriveRename, drive);
    const result = await handler({ file_id: 'ren-1', new_name: 'new-name.txt' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.id).toBe('ren-1');
    expect(parsed.name).toBe('new-name.txt');

    expect(drive.files.update).toHaveBeenCalledWith({
      fileId: 'ren-1',
      requestBody: { name: 'new-name.txt' },
      fields: expect.any(String),
      supportsAllDrives: true,
    });
  });

  it('returns error on API failure', async () => {
    const drive = createMockDrive({
      filesUpdate: vi.fn().mockRejectedValue(new Error('Rename failed')),
    });

    const handler = captureToolHandler(registerDriveRename, drive);
    const result = await handler({ file_id: 'x', new_name: 'y' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Rename failed');
  });
});
