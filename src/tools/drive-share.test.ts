import { describe, it, expect, vi } from 'vitest';
import { registerDriveShare } from './drive-share.js';
import { createMockDrive, createMockFile, captureToolHandler } from './test-helpers.js';

describe('drive_share', () => {
  it('shares a file with a user as writer', async () => {
    const mockFile = createMockFile({ id: 'share-1', shared: true });
    const permissionsCreate = vi.fn().mockResolvedValue({
      data: { id: 'perm-1', type: 'user', role: 'writer', emailAddress: 'bob@example.com' },
    });
    const filesGet = vi.fn().mockResolvedValue({ data: mockFile });
    const drive = createMockDrive({ permissionsCreate, filesGet });

    const handler = captureToolHandler(registerDriveShare, drive);
    const result = await handler({ file_id: 'share-1', email: 'bob@example.com', role: 'writer' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.file.id).toBe('share-1');
    expect(parsed.file.shared).toBe(true);
    expect(parsed.permission.role).toBe('writer');
    expect(parsed.permission.emailAddress).toBe('bob@example.com');

    expect(permissionsCreate).toHaveBeenCalledWith({
      fileId: 'share-1',
      requestBody: {
        type: 'user',
        role: 'writer',
        emailAddress: 'bob@example.com',
      },
      supportsAllDrives: true,
    });

    expect(filesGet).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: 'share-1',
        supportsAllDrives: true,
      }),
    );
  });

  it('shares a file as reader', async () => {
    const permissionsCreate = vi.fn().mockResolvedValue({
      data: { id: 'perm-2', type: 'user', role: 'reader', emailAddress: 'alice@example.com' },
    });
    const drive = createMockDrive({ permissionsCreate });

    const handler = captureToolHandler(registerDriveShare, drive);
    const result = await handler({ file_id: 'share-2', email: 'alice@example.com', role: 'reader' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.permission.role).toBe('reader');

    expect(permissionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({ role: 'reader' }),
      }),
    );
  });

  it('returns error on API failure', async () => {
    const drive = createMockDrive({
      permissionsCreate: vi.fn().mockRejectedValue(new Error('Share failed')),
    });

    const handler = captureToolHandler(registerDriveShare, drive);
    const result = await handler({ file_id: 'x', email: 'y@z.com', role: 'reader' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Share failed');
  });
});
