import { describe, it, expect, vi } from 'vitest';
import { readFileContent } from './export.js';
import { createMockDrive } from './test-helpers.js';

describe('readFileContent', () => {
  it('exports Google Docs as markdown via turndown', async () => {
    const drive = createMockDrive({
      filesExport: vi.fn().mockResolvedValue({ data: '<h1>Title</h1><p>Hello world</p>' }),
    });
    const content = await readFileContent(drive, 'doc-1', 'application/vnd.google-apps.document');
    expect(content).toContain('Title');
    expect(content).toContain('Hello world');
    expect(drive.files.export).toHaveBeenCalledWith({ fileId: 'doc-1', mimeType: 'text/html' });
  });

  it('exports Google Sheets as CSV', async () => {
    const drive = createMockDrive({
      filesExport: vi.fn().mockResolvedValue({ data: 'Name,Age\nAlice,30' }),
    });
    const content = await readFileContent(drive, 'sheet-1', 'application/vnd.google-apps.spreadsheet');
    expect(content).toBe('Name,Age\nAlice,30');
    expect(drive.files.export).toHaveBeenCalledWith({ fileId: 'sheet-1', mimeType: 'text/csv' });
  });

  it('exports Google Slides as plain text', async () => {
    const drive = createMockDrive({
      filesExport: vi.fn().mockResolvedValue({ data: 'Slide 1: Title' }),
    });
    const content = await readFileContent(drive, 'slides-1', 'application/vnd.google-apps.presentation');
    expect(content).toBe('Slide 1: Title');
    expect(drive.files.export).toHaveBeenCalledWith({ fileId: 'slides-1', mimeType: 'text/plain' });
  });

  it('reads regular files as raw content', async () => {
    const drive = createMockDrive({
      filesGet: vi.fn().mockResolvedValue({ data: 'raw file content' }),
    });
    const content = await readFileContent(drive, 'txt-1', 'text/plain');
    expect(content).toBe('raw file content');
    expect(drive.files.get).toHaveBeenCalledWith({ fileId: 'txt-1', alt: 'media' });
  });
});
