import { describe, it, expect, vi } from 'vitest';
import { registerDriveUpload } from './drive-upload.js';
import { createMockDrive, createMockFile, captureToolHandler } from './test-helpers.js';

describe('drive_upload', () => {
  it('uploads a text file with defaults', async () => {
    const mockFile = createMockFile({ id: 'upload-1', name: 'hello.txt' });
    const drive = createMockDrive({
      filesCreate: vi.fn().mockResolvedValue({ data: mockFile }),
    });

    const handler = captureToolHandler(registerDriveUpload, drive);
    const result = await handler({ name: 'hello.txt', content: 'Hello world', mime_type: 'text/plain' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.id).toBe('upload-1');
    expect(parsed.name).toBe('hello.txt');

    expect(drive.files.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: {
          name: 'hello.txt',
          mimeType: 'text/plain',
          parents: undefined,
        },
        media: expect.objectContaining({
          mimeType: 'text/plain',
        }),
        supportsAllDrives: true,
      }),
    );
  });

  it('uploads with parent and custom mime type', async () => {
    const mockFile = createMockFile({
      id: 'upload-2',
      name: 'data.json',
      mimeType: 'application/json',
      parents: ['folder-abc'],
    });
    const drive = createMockDrive({
      filesCreate: vi.fn().mockResolvedValue({ data: mockFile }),
    });

    const handler = captureToolHandler(registerDriveUpload, drive);
    const result = await handler({
      name: 'data.json',
      content: '{"key":"value"}',
      mime_type: 'application/json',
      parent_id: 'folder-abc',
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.id).toBe('upload-2');
    expect(parsed.parents).toContain('folder-abc');

    expect(drive.files.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          name: 'data.json',
          mimeType: 'application/json',
          parents: ['folder-abc'],
        }),
      }),
    );
  });

  it('returns error on API failure', async () => {
    const drive = createMockDrive({
      filesCreate: vi.fn().mockRejectedValue(new Error('Upload failed')),
    });

    const handler = captureToolHandler(registerDriveUpload, drive);
    const result = await handler({ name: 'fail.txt', content: 'x', mime_type: 'text/plain' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Upload failed');
  });
});
