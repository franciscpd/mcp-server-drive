import { describe, it, expect, vi } from 'vitest';
import { registerDriveMove } from './drive-move.js';
import { createMockDrive, createMockFile, captureToolHandler } from './test-helpers.js';

describe('drive_move', () => {
  it('moves a file to a different folder', async () => {
    const mockFile = createMockFile({ id: 'move-1', parents: ['dest-folder'] });
    const filesGet = vi.fn().mockResolvedValue({ data: { parents: ['old-parent-1', 'old-parent-2'] } });
    const filesUpdate = vi.fn().mockResolvedValue({ data: mockFile });
    const drive = createMockDrive({ filesGet, filesUpdate });

    const handler = captureToolHandler(registerDriveMove, drive);
    const result = await handler({ file_id: 'move-1', destination_folder_id: 'dest-folder' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.id).toBe('move-1');
    expect(parsed.parents).toContain('dest-folder');

    expect(filesGet).toHaveBeenCalledWith({
      fileId: 'move-1',
      fields: 'parents',
      supportsAllDrives: true,
    });

    expect(filesUpdate).toHaveBeenCalledWith({
      fileId: 'move-1',
      addParents: 'dest-folder',
      removeParents: 'old-parent-1,old-parent-2',
      fields: expect.any(String),
      supportsAllDrives: true,
    });
  });

  it('returns error on API failure', async () => {
    const drive = createMockDrive({
      filesGet: vi.fn().mockRejectedValue(new Error('Move failed')),
    });

    const handler = captureToolHandler(registerDriveMove, drive);
    const result = await handler({ file_id: 'x', destination_folder_id: 'y' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Move failed');
  });
});
