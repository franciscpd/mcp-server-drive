import { vi } from 'vitest';
import type { docs_v1, drive_v3, sheets_v4, slides_v1 } from 'googleapis';

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
  commentsList: ReturnType<typeof vi.fn>;
  commentsCreate: ReturnType<typeof vi.fn>;
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
    comments: {
      list: overrides?.commentsList ?? vi.fn().mockResolvedValue({ data: { comments: [] } }),
      create: overrides?.commentsCreate ?? vi.fn().mockResolvedValue({
        data: { id: 'comment-1', author: { displayName: 'User', emailAddress: 'user@example.com' }, content: 'Test comment', createdTime: '2026-03-21T00:00:00Z' },
      }),
    },
  } as unknown as drive_v3.Drive;
}

export function createMockDocs(overrides?: Partial<{
  documentsCreate: ReturnType<typeof vi.fn>;
  documentsGet: ReturnType<typeof vi.fn>;
  documentsBatchUpdate: ReturnType<typeof vi.fn>;
}>) {
  return {
    documents: {
      create: overrides?.documentsCreate ?? vi.fn().mockResolvedValue({
        data: { documentId: 'doc-1', title: 'Test Doc' },
      }),
      get: overrides?.documentsGet ?? vi.fn().mockResolvedValue({
        data: {
          documentId: 'doc-1', title: 'Test Doc',
          body: { content: [
            { endIndex: 1 },
            { startIndex: 1, endIndex: 13, paragraph: { elements: [{ startIndex: 1, endIndex: 13, textRun: { content: 'Hello world\n' } }] } },
          ] },
        },
      }),
      batchUpdate: overrides?.documentsBatchUpdate ?? vi.fn().mockResolvedValue({ data: { documentId: 'doc-1', replies: [] } }),
    },
  } as unknown as docs_v1.Docs;
}

export function createMockSheets(overrides?: Partial<{
  spreadsheetsCreate: ReturnType<typeof vi.fn>;
  spreadsheetsGet: ReturnType<typeof vi.fn>;
  valuesGet: ReturnType<typeof vi.fn>;
  valuesUpdate: ReturnType<typeof vi.fn>;
}>) {
  return {
    spreadsheets: {
      create: overrides?.spreadsheetsCreate ?? vi.fn().mockResolvedValue({
        data: {
          spreadsheetId: 'sheet-1', properties: { title: 'Test Sheet' },
          spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/sheet-1/edit',
          sheets: [{ properties: { sheetId: 0, title: 'Sheet1', index: 0, gridProperties: { rowCount: 1000, columnCount: 26 } } }],
        },
      }),
      get: overrides?.spreadsheetsGet ?? vi.fn().mockResolvedValue({
        data: {
          spreadsheetId: 'sheet-1', properties: { title: 'Test Sheet' },
          sheets: [{ properties: { sheetId: 0, title: 'Sheet1', index: 0, gridProperties: { rowCount: 1000, columnCount: 26 } } }],
        },
      }),
      values: {
        get: overrides?.valuesGet ?? vi.fn().mockResolvedValue({
          data: { range: 'Sheet1!A1:B2', values: [['Name', 'Age'], ['Alice', '30']] },
        }),
        update: overrides?.valuesUpdate ?? vi.fn().mockResolvedValue({
          data: { updatedRange: 'Sheet1!A1:B2', updatedRows: 2, updatedColumns: 2, updatedCells: 4 },
        }),
      },
    },
  } as unknown as sheets_v4.Sheets;
}

export function createMockSlides(overrides?: Partial<{
  presentationsCreate: ReturnType<typeof vi.fn>;
  presentationsGet: ReturnType<typeof vi.fn>;
  presentationsBatchUpdate: ReturnType<typeof vi.fn>;
}>) {
  return {
    presentations: {
      create: overrides?.presentationsCreate ?? vi.fn().mockResolvedValue({
        data: { presentationId: 'pres-1', title: 'Test Presentation' },
      }),
      get: overrides?.presentationsGet ?? vi.fn().mockResolvedValue({
        data: {
          presentationId: 'pres-1', title: 'Test Presentation',
          slides: [{
            objectId: 'slide-1',
            pageElements: [{
              objectId: 'shape-1',
              shape: { shapeType: 'TEXT_BOX', text: { textElements: [{ textRun: { content: 'Hello slide' } }] } },
            }],
          }],
        },
      }),
      batchUpdate: overrides?.presentationsBatchUpdate ?? vi.fn().mockResolvedValue({
        data: { presentationId: 'pres-1', replies: [{ createSlide: { objectId: 'new-slide-1' } }] },
      }),
    },
  } as unknown as slides_v1.Slides;
}

export function captureToolHandler(
  registerFn: (server: any, ...args: any[]) => void,
  ...args: any[]
): (params: any) => Promise<any> {
  let capturedHandler: ((params: any) => Promise<any>) | null = null;
  const mockServer = {
    tool: (_name: string, _desc: string, _schema: any, handler: any) => {
      capturedHandler = handler;
    },
  };
  registerFn(mockServer as any, ...args);
  if (!capturedHandler) throw new Error('Handler not captured');
  return capturedHandler;
}
