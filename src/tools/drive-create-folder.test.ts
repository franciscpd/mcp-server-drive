import { describe, it, expect, vi } from 'vitest';
import { registerDriveCreateFolder } from './drive-create-folder.js';
import { createMockDrive, createMockFile, captureToolHandler } from './test-helpers.js';

describe('drive_create_folder', () => {
  it('creates a folder with name only', async () => {
    const mockFolder = createMockFile({
      id: 'folder-new',
      name: 'My Folder',
      mimeType: 'application/vnd.google-apps.folder',
    });
    const drive = createMockDrive({
      filesCreate: vi.fn().mockResolvedValue({ data: mockFolder }),
    });

    const handler = captureToolHandler(registerDriveCreateFolder, drive);
    const result = await handler({ name: 'My Folder' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.id).toBe('folder-new');
    expect(parsed.name).toBe('My Folder');
    expect(parsed.mimeType).toBe('application/vnd.google-apps.folder');

    expect(drive.files.create).toHaveBeenCalledWith({
      requestBody: {
        name: 'My Folder',
        mimeType: 'application/vnd.google-apps.folder',
        parents: undefined,
      },
      fields: expect.any(String),
      supportsAllDrives: true,
    });
  });

  it('creates a folder with a parent', async () => {
    const mockFolder = createMockFile({
      id: 'folder-child',
      name: 'Sub Folder',
      mimeType: 'application/vnd.google-apps.folder',
      parents: ['parent-123'],
    });
    const drive = createMockDrive({
      filesCreate: vi.fn().mockResolvedValue({ data: mockFolder }),
    });

    const handler = captureToolHandler(registerDriveCreateFolder, drive);
    const result = await handler({ name: 'Sub Folder', parent_id: 'parent-123' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.id).toBe('folder-child');
    expect(parsed.parents).toContain('parent-123');

    expect(drive.files.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          parents: ['parent-123'],
        }),
      }),
    );
  });

  it('returns error on API failure', async () => {
    const drive = createMockDrive({
      filesCreate: vi.fn().mockRejectedValue(new Error('Quota exceeded')),
    });

    const handler = captureToolHandler(registerDriveCreateFolder, drive);
    const result = await handler({ name: 'Fail Folder' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('quota exceeded');
  });
});
