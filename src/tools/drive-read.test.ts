import { describe, it, expect, vi } from 'vitest';
import { registerDriveRead } from './drive-read.js';
import { createMockDrive, createMockFile, captureToolHandler } from './test-helpers.js';

vi.mock('./export.js', () => ({
  readFileContent: vi.fn().mockResolvedValue('file content here'),
}));

import { readFileContent } from './export.js';

describe('drive_read', () => {
  it('reads a text file', async () => {
    const mockFile = createMockFile({ id: 'read-1', name: 'notes.txt', mimeType: 'text/plain' });
    const drive = createMockDrive({
      filesGet: vi.fn().mockResolvedValue({ data: mockFile }),
    });

    const handler = captureToolHandler(registerDriveRead, drive);
    const result = await handler({ file_id: 'read-1' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.file.id).toBe('read-1');
    expect(parsed.file.name).toBe('notes.txt');
    expect(parsed.content).toBe('file content here');

    expect(drive.files.get).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: 'read-1',
        supportsAllDrives: true,
      }),
    );

    expect(readFileContent).toHaveBeenCalledWith(drive, 'read-1', 'text/plain');
  });

  it('reads a Google Doc (exports via readFileContent)', async () => {
    const mockDoc = createMockFile({
      id: 'doc-1',
      name: 'My Doc',
      mimeType: 'application/vnd.google-apps.document',
    });
    const drive = createMockDrive({
      filesGet: vi.fn().mockResolvedValue({ data: mockDoc }),
    });

    const handler = captureToolHandler(registerDriveRead, drive);
    const result = await handler({ file_id: 'doc-1' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.file.id).toBe('doc-1');
    expect(readFileContent).toHaveBeenCalledWith(drive, 'doc-1', 'application/vnd.google-apps.document');
  });

  it('returns error on API failure', async () => {
    const drive = createMockDrive({
      filesGet: vi.fn().mockRejectedValue(new Error('Not found')),
    });

    const handler = captureToolHandler(registerDriveRead, drive);
    const result = await handler({ file_id: 'missing' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Not found');
  });
});
