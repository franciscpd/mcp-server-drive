import { vi } from 'vitest';
import type { drive_v3 } from 'googleapis';

export function createMockFile(overrides?: Partial<drive_v3.Schema$File>): drive_v3.Schema$File {
  return {
    id: 'file-1', name: 'test-file.txt', mimeType: 'text/plain', size: '1024',
    createdTime: '2026-01-01T00:00:00Z', modifiedTime: '2026-03-20T10:00:00Z',
    owners: [{ emailAddress: 'user@example.com' }], parents: ['parent-folder-1'],
    webViewLink: 'https://drive.google.com/file/d/file-1/view',
    shared: false, trashed: false, ...overrides,
  };
}

export function createMockDrive(overrides?: Partial<{
  filesList: ReturnType<typeof vi.fn>;
  filesGet: ReturnType<typeof vi.fn>;
  filesCreate: ReturnType<typeof vi.fn>;
  filesUpdate: ReturnType<typeof vi.fn>;
  filesCopy: ReturnType<typeof vi.fn>;
  filesDelete: ReturnType<typeof vi.fn>;
  filesExport: ReturnType<typeof vi.fn>;
  permissionsCreate: ReturnType<typeof vi.fn>;
  drivesList: ReturnType<typeof vi.fn>;
}>) {
  return {
    files: {
      list: overrides?.filesList ?? vi.fn().mockResolvedValue({ data: { files: [createMockFile()], nextPageToken: null } }),
      get: overrides?.filesGet ?? vi.fn().mockResolvedValue({ data: createMockFile() }),
      create: overrides?.filesCreate ?? vi.fn().mockResolvedValue({ data: createMockFile() }),
      update: overrides?.filesUpdate ?? vi.fn().mockResolvedValue({ data: createMockFile() }),
      copy: overrides?.filesCopy ?? vi.fn().mockResolvedValue({ data: createMockFile() }),
      delete: overrides?.filesDelete ?? vi.fn().mockResolvedValue({}),
      export: overrides?.filesExport ?? vi.fn().mockResolvedValue({ data: 'exported content' }),
    },
    permissions: {
      create: overrides?.permissionsCreate ?? vi.fn().mockResolvedValue({
        data: { id: 'perm-1', type: 'user', role: 'reader', emailAddress: 'shared@example.com' },
      }),
    },
    drives: {
      list: overrides?.drivesList ?? vi.fn().mockResolvedValue({
        data: { drives: [{ id: 'drive-1', name: 'Shared Drive', createdTime: '2026-01-01T00:00:00Z' }], nextPageToken: null },
      }),
    },
  } as unknown as drive_v3.Drive;
}

export function captureToolHandler(
  registerFn: (server: any, drive: drive_v3.Drive) => void,
  drive: drive_v3.Drive,
): (params: any) => Promise<any> {
  let capturedHandler: ((params: any) => Promise<any>) | null = null;
  const mockServer = {
    tool: (_name: string, _desc: string, _schema: any, handler: any) => {
      capturedHandler = handler;
    },
  };
  registerFn(mockServer as any, drive);
  if (!capturedHandler) throw new Error('Handler not captured');
  return capturedHandler;
}
