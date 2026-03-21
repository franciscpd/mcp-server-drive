import { describe, it, expect, vi } from 'vitest';
import { registerDriveDelete } from './drive-delete.js';
import { createMockDrive, createMockFile, captureToolHandler } from './test-helpers.js';

describe('drive_delete', () => {
  it('moves a file to trash (soft delete)', async () => {
    const mockFile = createMockFile({ id: 'del-1', name: 'old.txt', trashed: true });
    const drive = createMockDrive({
      filesUpdate: vi.fn().mockResolvedValue({ data: mockFile }),
    });

    const handler = captureToolHandler(registerDriveDelete, drive);
    const result = await handler({ file_id: 'del-1' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.id).toBe('del-1');
    expect(parsed.trashed).toBe(true);

    expect(drive.files.update).toHaveBeenCalledWith({
      fileId: 'del-1',
      requestBody: { trashed: true },
      fields: expect.any(String),
      supportsAllDrives: true,
    });
  });

  it('returns error on API failure', async () => {
    const drive = createMockDrive({
      filesUpdate: vi.fn().mockRejectedValue(new Error('Delete failed')),
    });

    const handler = captureToolHandler(registerDriveDelete, drive);
    const result = await handler({ file_id: 'missing' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Delete failed');
  });
});
