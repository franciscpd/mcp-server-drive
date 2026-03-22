# Phase 2: Drive Tools — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 12 Drive file management tools (search, list, CRUD, move, copy, rename, share, shared drives) with Workspace file export and complete test coverage.

**Architecture:** Each tool is a standalone file exporting `registerDriveXxx(server, drive)`. Shared utilities: `format.ts` (formatFile, buildPagination), `export.ts` (Workspace file export with turndown), `test-helpers.ts` (mocks, captureToolHandler). All tools use `safeToolHandler` from `src/utils/errors.ts` and include `supportsAllDrives: true`.

**Tech Stack:** TypeScript, googleapis (drive_v3), zod, turndown, vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `package.json` | Modify | Add turndown + @types/turndown |
| `src/tools/format.ts` | Create | FormattedFile, formatFile(), buildPagination(), FILE_FIELDS |
| `src/tools/format.test.ts` | Create | Format utility tests |
| `src/tools/test-helpers.ts` | Create | createMockDrive(), createMockFile(), captureToolHandler() |
| `src/tools/export.ts` | Create | exportWorkspaceFile() with turndown |
| `src/tools/export.test.ts` | Create | Export utility tests |
| `src/tools/drive-search.ts` | Create | drive_search tool |
| `src/tools/drive-search.test.ts` | Create | Search tool tests |
| `src/tools/drive-list.ts` | Create | drive_list tool |
| `src/tools/drive-list.test.ts` | Create | List tool tests |
| `src/tools/drive-create-folder.ts` | Create | drive_create_folder tool |
| `src/tools/drive-create-folder.test.ts` | Create | Create folder tests |
| `src/tools/drive-upload.ts` | Create | drive_upload tool |
| `src/tools/drive-upload.test.ts` | Create | Upload tests |
| `src/tools/drive-read.ts` | Create | drive_read tool |
| `src/tools/drive-read.test.ts` | Create | Read tool tests |
| `src/tools/drive-delete.ts` | Create | drive_delete tool |
| `src/tools/drive-delete.test.ts` | Create | Delete tool tests |
| `src/tools/drive-move.ts` | Create | drive_move tool |
| `src/tools/drive-move.test.ts` | Create | Move tool tests |
| `src/tools/drive-copy.ts` | Create | drive_copy tool |
| `src/tools/drive-copy.test.ts` | Create | Copy tool tests |
| `src/tools/drive-rename.ts` | Create | drive_rename tool |
| `src/tools/drive-rename.test.ts` | Create | Rename tool tests |
| `src/tools/drive-share.ts` | Create | drive_share tool |
| `src/tools/drive-share.test.ts` | Create | Share tool tests |
| `src/tools/drive-list-shared.ts` | Create | drive_list_shared_drives tool |
| `src/tools/drive-list-shared.test.ts` | Create | List shared drives tests |
| `src/tools/register.ts` | Modify | Import and call all 12 registerDrive* functions |

---

### Task 1: Add turndown dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install turndown**

Run: `npm install turndown && npm install -D @types/turndown`

- [ ] **Step 2: Verify installation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add turndown for HTML-to-Markdown conversion"
```

---

### Task 2: Format Utilities

**Files:**
- Create: `src/tools/format.ts`
- Create: `src/tools/format.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/tools/format.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { formatFile, buildPagination, FILE_FIELDS } from './format.js';

describe('FILE_FIELDS', () => {
  it('contains all required fields', () => {
    expect(FILE_FIELDS).toContain('id');
    expect(FILE_FIELDS).toContain('name');
    expect(FILE_FIELDS).toContain('mimeType');
    expect(FILE_FIELDS).toContain('size');
    expect(FILE_FIELDS).toContain('createdTime');
    expect(FILE_FIELDS).toContain('modifiedTime');
    expect(FILE_FIELDS).toContain('owners');
    expect(FILE_FIELDS).toContain('parents');
    expect(FILE_FIELDS).toContain('webViewLink');
    expect(FILE_FIELDS).toContain('shared');
    expect(FILE_FIELDS).toContain('trashed');
  });
});

describe('formatFile', () => {
  it('maps all fields from Drive API response', () => {
    const result = formatFile({
      id: 'file-1',
      name: 'test.txt',
      mimeType: 'text/plain',
      size: '1024',
      createdTime: '2026-01-01T00:00:00Z',
      modifiedTime: '2026-03-20T10:00:00Z',
      owners: [{ emailAddress: 'user@example.com' }],
      parents: ['folder-1'],
      webViewLink: 'https://drive.google.com/file/d/file-1',
      shared: true,
      trashed: false,
    });

    expect(result).toEqual({
      id: 'file-1',
      name: 'test.txt',
      mimeType: 'text/plain',
      size: '1024',
      createdTime: '2026-01-01T00:00:00Z',
      modifiedTime: '2026-03-20T10:00:00Z',
      owners: ['user@example.com'],
      parents: ['folder-1'],
      webViewLink: 'https://drive.google.com/file/d/file-1',
      shared: true,
      trashed: false,
    });
  });

  it('handles null and undefined fields gracefully', () => {
    const result = formatFile({ id: 'file-2' });

    expect(result.id).toBe('file-2');
    expect(result.name).toBe('');
    expect(result.mimeType).toBe('');
    expect(result.size).toBeNull();
    expect(result.createdTime).toBeNull();
    expect(result.modifiedTime).toBeNull();
    expect(result.owners).toEqual([]);
    expect(result.parents).toEqual([]);
    expect(result.webViewLink).toBeNull();
    expect(result.shared).toBe(false);
    expect(result.trashed).toBe(false);
  });

  it('extracts multiple owner emails', () => {
    const result = formatFile({
      id: 'file-3',
      owners: [
        { emailAddress: 'a@example.com' },
        { emailAddress: 'b@example.com' },
      ],
    });
    expect(result.owners).toEqual(['a@example.com', 'b@example.com']);
  });
});

describe('buildPagination', () => {
  it('returns has_more true with token', () => {
    const result = buildPagination('next-token');
    expect(result).toEqual({ next_page_token: 'next-token', has_more: true });
  });

  it('returns has_more false without token', () => {
    const result = buildPagination(undefined);
    expect(result).toEqual({ next_page_token: null, has_more: false });
  });

  it('returns has_more false with null token', () => {
    const result = buildPagination(null);
    expect(result).toEqual({ next_page_token: null, has_more: false });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tools/format.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement format utilities**

Create `src/tools/format.ts`:

```typescript
import type { drive_v3 } from 'googleapis';

export const FILE_FIELDS =
  'id, name, mimeType, size, createdTime, modifiedTime, owners(emailAddress), parents, webViewLink, shared, trashed';

export interface FormattedFile {
  id: string;
  name: string;
  mimeType: string;
  size: string | null;
  createdTime: string | null;
  modifiedTime: string | null;
  owners: string[];
  parents: string[];
  webViewLink: string | null;
  shared: boolean;
  trashed: boolean;
}

export function formatFile(file: drive_v3.Schema$File): FormattedFile {
  return {
    id: file.id ?? '',
    name: file.name ?? '',
    mimeType: file.mimeType ?? '',
    size: file.size ?? null,
    createdTime: file.createdTime ?? null,
    modifiedTime: file.modifiedTime ?? null,
    owners: (file.owners ?? [])
      .map((o) => o.emailAddress)
      .filter((e): e is string => !!e),
    parents: file.parents ?? [],
    webViewLink: file.webViewLink ?? null,
    shared: file.shared ?? false,
    trashed: file.trashed ?? false,
  };
}

export function buildPagination(nextPageToken?: string | null): {
  next_page_token: string | null;
  has_more: boolean;
} {
  return {
    next_page_token: nextPageToken ?? null,
    has_more: !!nextPageToken,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tools/format.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/format.ts src/tools/format.test.ts
git commit -m "feat: add format utilities (formatFile, buildPagination, FILE_FIELDS)"
```

---

### Task 3: Test Helpers

**Files:**
- Create: `src/tools/test-helpers.ts`

- [ ] **Step 1: Create test helpers**

Create `src/tools/test-helpers.ts`:

```typescript
import { vi } from 'vitest';
import type { drive_v3 } from 'googleapis';

export function createMockFile(
  overrides?: Partial<drive_v3.Schema$File>,
): drive_v3.Schema$File {
  return {
    id: 'file-1',
    name: 'test-file.txt',
    mimeType: 'text/plain',
    size: '1024',
    createdTime: '2026-01-01T00:00:00Z',
    modifiedTime: '2026-03-20T10:00:00Z',
    owners: [{ emailAddress: 'user@example.com' }],
    parents: ['parent-folder-1'],
    webViewLink: 'https://drive.google.com/file/d/file-1/view',
    shared: false,
    trashed: false,
    ...overrides,
  };
}

export function createMockDrive(
  overrides?: Partial<{
    filesList: ReturnType<typeof vi.fn>;
    filesGet: ReturnType<typeof vi.fn>;
    filesCreate: ReturnType<typeof vi.fn>;
    filesUpdate: ReturnType<typeof vi.fn>;
    filesCopy: ReturnType<typeof vi.fn>;
    filesDelete: ReturnType<typeof vi.fn>;
    filesExport: ReturnType<typeof vi.fn>;
    permissionsCreate: ReturnType<typeof vi.fn>;
    drivesList: ReturnType<typeof vi.fn>;
  }>,
) {
  return {
    files: {
      list: overrides?.filesList ?? vi.fn().mockResolvedValue({
        data: { files: [createMockFile()], nextPageToken: null },
      }),
      get: overrides?.filesGet ?? vi.fn().mockResolvedValue({
        data: createMockFile(),
      }),
      create: overrides?.filesCreate ?? vi.fn().mockResolvedValue({
        data: createMockFile(),
      }),
      update: overrides?.filesUpdate ?? vi.fn().mockResolvedValue({
        data: createMockFile(),
      }),
      copy: overrides?.filesCopy ?? vi.fn().mockResolvedValue({
        data: createMockFile(),
      }),
      delete: overrides?.filesDelete ?? vi.fn().mockResolvedValue({}),
      export: overrides?.filesExport ?? vi.fn().mockResolvedValue({
        data: 'exported content',
      }),
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/tools/test-helpers.ts
git commit -m "feat: add test helpers (createMockDrive, createMockFile, captureToolHandler)"
```

---

### Task 4: Export Utilities

**Files:**
- Create: `src/tools/export.ts`
- Create: `src/tools/export.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/tools/export.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { readFileContent } from './export.js';
import { createMockDrive } from './test-helpers.js';

describe('readFileContent', () => {
  it('exports Google Docs as markdown via turndown', async () => {
    const drive = createMockDrive({
      filesExport: vi.fn().mockResolvedValue({
        data: '<h1>Title</h1><p>Hello world</p>',
      }),
    });

    const content = await readFileContent(
      drive,
      'doc-1',
      'application/vnd.google-apps.document',
    );

    expect(content).toContain('Title');
    expect(content).toContain('Hello world');
    expect(drive.files.export).toHaveBeenCalledWith({
      fileId: 'doc-1',
      mimeType: 'text/html',
    });
  });

  it('exports Google Sheets as CSV', async () => {
    const drive = createMockDrive({
      filesExport: vi.fn().mockResolvedValue({
        data: 'Name,Age\nAlice,30\nBob,25',
      }),
    });

    const content = await readFileContent(
      drive,
      'sheet-1',
      'application/vnd.google-apps.spreadsheet',
    );

    expect(content).toBe('Name,Age\nAlice,30\nBob,25');
    expect(drive.files.export).toHaveBeenCalledWith({
      fileId: 'sheet-1',
      mimeType: 'text/csv',
    });
  });

  it('exports Google Slides as plain text', async () => {
    const drive = createMockDrive({
      filesExport: vi.fn().mockResolvedValue({
        data: 'Slide 1: Title\nSlide 2: Content',
      }),
    });

    const content = await readFileContent(
      drive,
      'slides-1',
      'application/vnd.google-apps.presentation',
    );

    expect(content).toBe('Slide 1: Title\nSlide 2: Content');
    expect(drive.files.export).toHaveBeenCalledWith({
      fileId: 'slides-1',
      mimeType: 'text/plain',
    });
  });

  it('reads regular files as raw content', async () => {
    const drive = createMockDrive({
      filesGet: vi.fn().mockResolvedValue({
        data: 'raw file content here',
      }),
    });

    const content = await readFileContent(drive, 'txt-1', 'text/plain');

    expect(content).toBe('raw file content here');
    expect(drive.files.get).toHaveBeenCalledWith({
      fileId: 'txt-1',
      alt: 'media',
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tools/export.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement export utilities**

Create `src/tools/export.ts`:

```typescript
import type { drive_v3 } from 'googleapis';
import TurndownService from 'turndown';

const turndown = new TurndownService();

const WORKSPACE_EXPORT: Record<string, { exportMime: string; transform?: 'html-to-markdown' }> = {
  'application/vnd.google-apps.document': { exportMime: 'text/html', transform: 'html-to-markdown' },
  'application/vnd.google-apps.spreadsheet': { exportMime: 'text/csv' },
  'application/vnd.google-apps.presentation': { exportMime: 'text/plain' },
  'application/vnd.google-apps.drawing': { exportMime: 'image/svg+xml' },
};

export async function readFileContent(
  drive: drive_v3.Drive,
  fileId: string,
  mimeType: string,
): Promise<string> {
  const config = WORKSPACE_EXPORT[mimeType];

  if (config) {
    const response = await drive.files.export({
      fileId,
      mimeType: config.exportMime,
    });
    const content = String(response.data);
    return config.transform === 'html-to-markdown'
      ? turndown.turndown(content)
      : content;
  }

  const response = await drive.files.get({
    fileId,
    alt: 'media',
  });
  return String(response.data);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tools/export.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/export.ts src/tools/export.test.ts
git commit -m "feat: add Workspace file export with turndown for Docs"
```

---

### Task 5: drive_search

**Files:**
- Create: `src/tools/drive-search.ts`
- Create: `src/tools/drive-search.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/tools/drive-search.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { registerDriveSearch } from './drive-search.js';
import { createMockDrive, createMockFile, captureToolHandler } from './test-helpers.js';

describe('drive_search', () => {
  it('searches files with query and returns formatted results', async () => {
    const drive = createMockDrive({
      filesList: vi.fn().mockResolvedValue({
        data: {
          files: [createMockFile({ id: 'f1', name: 'report.docx' })],
          nextPageToken: null,
        },
      }),
    });
    const handler = captureToolHandler(registerDriveSearch, drive);

    const result = await handler({ query: "name contains 'report'" });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.files).toHaveLength(1);
    expect(parsed.files[0].id).toBe('f1');
    expect(parsed.has_more).toBe(false);
    expect(drive.files.list).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "name contains 'report'",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      }),
    );
  });

  it('passes pagination parameters', async () => {
    const drive = createMockDrive({
      filesList: vi.fn().mockResolvedValue({
        data: { files: [createMockFile()], nextPageToken: 'next-abc' },
      }),
    });
    const handler = captureToolHandler(registerDriveSearch, drive);

    const result = await handler({ query: 'test', page_size: 10, page_token: 'prev-token' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.has_more).toBe(true);
    expect(parsed.next_page_token).toBe('next-abc');
    expect(drive.files.list).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: 10, pageToken: 'prev-token' }),
    );
  });

  it('returns toolError on API failure', async () => {
    const drive = createMockDrive({
      filesList: vi.fn().mockRejectedValue(new Error('API error')),
    });
    const handler = captureToolHandler(registerDriveSearch, drive);

    const result = await handler({ query: 'test' });
    expect(result.isError).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tools/drive-search.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement drive_search**

Create `src/tools/drive-search.ts`:

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { drive_v3 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';
import { formatFile, buildPagination, FILE_FIELDS } from './format.js';

export function registerDriveSearch(
  server: McpServer,
  drive: drive_v3.Drive,
): void {
  server.tool(
    'drive_search',
    'Search files across Google Drive using query syntax (e.g., "name contains \'report\'", "mimeType = \'application/vnd.google-apps.folder\'"). Returns paginated results including Shared Drive files. Use drive_read to get file content.',
    {
      query: z.string().describe('Drive query string (e.g., "name contains \'report\'")'),
      page_size: z.number().min(1).max(100).default(20).describe('Results per page (1-100)'),
      page_token: z.string().optional().describe('Page token for next page'),
    },
    (params) =>
      safeToolHandler(async () => {
        const response = await drive.files.list({
          q: params.query,
          pageSize: params.page_size,
          pageToken: params.page_token,
          fields: `nextPageToken, files(${FILE_FIELDS})`,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });

        const files = (response.data.files ?? []).map(formatFile);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ files, ...buildPagination(response.data.nextPageToken) }, null, 2),
          }],
        };
      }),
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tools/drive-search.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/drive-search.ts src/tools/drive-search.test.ts
git commit -m "feat: add drive_search tool with pagination"
```

---

### Task 6: drive_list

**Files:**
- Create: `src/tools/drive-list.ts`
- Create: `src/tools/drive-list.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/tools/drive-list.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { registerDriveList } from './drive-list.js';
import { createMockDrive, createMockFile, captureToolHandler } from './test-helpers.js';

describe('drive_list', () => {
  it('lists folder contents with default root', async () => {
    const drive = createMockDrive({
      filesList: vi.fn().mockResolvedValue({
        data: { files: [createMockFile()], nextPageToken: null },
      }),
    });
    const handler = captureToolHandler(registerDriveList, drive);

    const result = await handler({});
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.files).toHaveLength(1);
    expect(drive.files.list).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "'root' in parents and trashed = false",
        supportsAllDrives: true,
      }),
    );
  });

  it('lists specific folder contents', async () => {
    const drive = createMockDrive();
    const handler = captureToolHandler(registerDriveList, drive);

    await handler({ folder_id: 'folder-abc' });

    expect(drive.files.list).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "'folder-abc' in parents and trashed = false",
      }),
    );
  });
});
```

- [ ] **Step 2: Implement drive_list**

Create `src/tools/drive-list.ts`:

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { drive_v3 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';
import { formatFile, buildPagination, FILE_FIELDS } from './format.js';

export function registerDriveList(
  server: McpServer,
  drive: drive_v3.Drive,
): void {
  server.tool(
    'drive_list',
    'List files and folders in a specific folder. Defaults to root. Use drive_search for query-based search.',
    {
      folder_id: z.string().default('root').describe('Folder ID to list (default: root)'),
      page_size: z.number().min(1).max(100).default(20).describe('Results per page (1-100)'),
      page_token: z.string().optional().describe('Page token for next page'),
    },
    (params) =>
      safeToolHandler(async () => {
        const response = await drive.files.list({
          q: `'${params.folder_id}' in parents and trashed = false`,
          pageSize: params.page_size,
          pageToken: params.page_token,
          fields: `nextPageToken, files(${FILE_FIELDS})`,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });

        const files = (response.data.files ?? []).map(formatFile);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ files, ...buildPagination(response.data.nextPageToken) }, null, 2),
          }],
        };
      }),
  );
}
```

- [ ] **Step 3: Run tests, verify pass, commit**

Run: `npx vitest run src/tools/drive-list.test.ts`

```bash
git add src/tools/drive-list.ts src/tools/drive-list.test.ts
git commit -m "feat: add drive_list tool with folder navigation"
```

---

### Task 7: drive_create_folder

**Files:**
- Create: `src/tools/drive-create-folder.ts`
- Create: `src/tools/drive-create-folder.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/tools/drive-create-folder.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { registerDriveCreateFolder } from './drive-create-folder.js';
import { createMockDrive, createMockFile, captureToolHandler } from './test-helpers.js';

describe('drive_create_folder', () => {
  it('creates folder with name', async () => {
    const drive = createMockDrive({
      filesCreate: vi.fn().mockResolvedValue({
        data: createMockFile({ id: 'new-folder', name: 'My Folder', mimeType: 'application/vnd.google-apps.folder' }),
      }),
    });
    const handler = captureToolHandler(registerDriveCreateFolder, drive);

    const result = await handler({ name: 'My Folder' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.id).toBe('new-folder');
    expect(parsed.name).toBe('My Folder');
    expect(drive.files.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          name: 'My Folder',
          mimeType: 'application/vnd.google-apps.folder',
        }),
        supportsAllDrives: true,
      }),
    );
  });

  it('creates folder with parent', async () => {
    const drive = createMockDrive();
    const handler = captureToolHandler(registerDriveCreateFolder, drive);

    await handler({ name: 'Sub Folder', parent_id: 'parent-1' });

    expect(drive.files.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({ parents: ['parent-1'] }),
      }),
    );
  });
});
```

- [ ] **Step 2: Implement**

Create `src/tools/drive-create-folder.ts`:

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { drive_v3 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';
import { formatFile, FILE_FIELDS } from './format.js';

export function registerDriveCreateFolder(
  server: McpServer,
  drive: drive_v3.Drive,
): void {
  server.tool(
    'drive_create_folder',
    'Create a new folder in Google Drive. Optionally specify a parent folder.',
    {
      name: z.string().describe('Folder name'),
      parent_id: z.string().optional().describe('Parent folder ID'),
    },
    (params) =>
      safeToolHandler(async () => {
        const response = await drive.files.create({
          requestBody: {
            name: params.name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: params.parent_id ? [params.parent_id] : undefined,
          },
          fields: FILE_FIELDS,
          supportsAllDrives: true,
        });

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(formatFile(response.data), null, 2),
          }],
        };
      }),
  );
}
```

- [ ] **Step 3: Run tests, verify pass, commit**

Run: `npx vitest run src/tools/drive-create-folder.test.ts`

```bash
git add src/tools/drive-create-folder.ts src/tools/drive-create-folder.test.ts
git commit -m "feat: add drive_create_folder tool"
```

---

### Task 8: drive_upload

**Files:**
- Create: `src/tools/drive-upload.ts`
- Create: `src/tools/drive-upload.test.ts`

- [ ] **Step 1: Write test, implement, verify, commit**

Test (`src/tools/drive-upload.test.ts`) should verify: creates file with content and media body, passes mimeType, handles optional parent_id, returns formatted file.

Implementation (`src/tools/drive-upload.ts`):

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { drive_v3 } from 'googleapis';
import { Readable } from 'node:stream';
import { safeToolHandler } from '../utils/errors.js';
import { formatFile, FILE_FIELDS } from './format.js';

export function registerDriveUpload(
  server: McpServer,
  drive: drive_v3.Drive,
): void {
  server.tool(
    'drive_upload',
    'Upload a text file to Google Drive. Use drive_create_folder to create folders first.',
    {
      name: z.string().describe('File name (e.g., "report.txt")'),
      content: z.string().describe('File content as text'),
      mime_type: z.string().default('text/plain').describe('MIME type (default: text/plain)'),
      parent_id: z.string().optional().describe('Parent folder ID'),
    },
    (params) =>
      safeToolHandler(async () => {
        const response = await drive.files.create({
          requestBody: {
            name: params.name,
            mimeType: params.mime_type,
            parents: params.parent_id ? [params.parent_id] : undefined,
          },
          media: {
            mimeType: params.mime_type,
            body: Readable.from(params.content),
          },
          fields: FILE_FIELDS,
          supportsAllDrives: true,
        });

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(formatFile(response.data), null, 2),
          }],
        };
      }),
  );
}
```

Commit: `feat: add drive_upload tool`

---

### Task 9: drive_read

**Files:**
- Create: `src/tools/drive-read.ts`
- Create: `src/tools/drive-read.test.ts`

- [ ] **Step 1: Write tests**

Tests should cover: reads regular text file (files.get with alt:media), reads Google Doc (exports as HTML → markdown), reads Google Sheet (exports as CSV), returns both metadata and content.

- [ ] **Step 2: Implement**

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { drive_v3 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';
import { formatFile, FILE_FIELDS } from './format.js';
import { readFileContent } from './export.js';

export function registerDriveRead(
  server: McpServer,
  drive: drive_v3.Drive,
): void {
  server.tool(
    'drive_read',
    'Read file content from Google Drive. Automatically exports Google Workspace files: Docs as Markdown, Sheets as CSV, Slides as plain text. Best for text-based files.',
    {
      file_id: z.string().describe('File ID to read'),
    },
    (params) =>
      safeToolHandler(async () => {
        const metaResponse = await drive.files.get({
          fileId: params.file_id,
          fields: FILE_FIELDS,
          supportsAllDrives: true,
        });

        const file = metaResponse.data;
        const content = await readFileContent(drive, params.file_id, file.mimeType ?? '');

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ file: formatFile(file), content }, null, 2),
          }],
        };
      }),
  );
}
```

Commit: `feat: add drive_read tool with Workspace file export`

---

### Task 10: drive_delete

**Files:**
- Create: `src/tools/drive-delete.ts`
- Create: `src/tools/drive-delete.test.ts`

Implementation: `files.update({ fileId, requestBody: { trashed: true }, fields: FILE_FIELDS, supportsAllDrives: true })`. Returns formatted file with trashed=true. Test: verify trashed is passed, verify response shows trashed=true.

Commit: `feat: add drive_delete tool (soft delete only)`

---

### Task 11: drive_move

**Files:**
- Create: `src/tools/drive-move.ts`
- Create: `src/tools/drive-move.test.ts`

Implementation:
1. Get current parents: `files.get({ fileId, fields: 'parents', supportsAllDrives: true })`
2. Move: `files.update({ fileId, addParents: destination_folder_id, removeParents: currentParents.join(','), fields: FILE_FIELDS, supportsAllDrives: true })`

Test: verify 2 API calls (get parents then update), verify addParents/removeParents params.

Commit: `feat: add drive_move tool`

---

### Task 12: drive_copy

**Files:**
- Create: `src/tools/drive-copy.ts`
- Create: `src/tools/drive-copy.test.ts`

Implementation: `files.copy({ fileId, requestBody: { name, parents: parent_id ? [parent_id] : undefined }, fields: FILE_FIELDS, supportsAllDrives: true })`. Test: verify copy with/without name and parent.

Commit: `feat: add drive_copy tool`

---

### Task 13: drive_rename

**Files:**
- Create: `src/tools/drive-rename.ts`
- Create: `src/tools/drive-rename.test.ts`

Implementation: `files.update({ fileId, requestBody: { name: new_name }, fields: FILE_FIELDS, supportsAllDrives: true })`. Test: verify new name is passed.

Commit: `feat: add drive_rename tool`

---

### Task 14: drive_share

**Files:**
- Create: `src/tools/drive-share.ts`
- Create: `src/tools/drive-share.test.ts`

Implementation:
1. Create permission: `permissions.create({ fileId, requestBody: { type: 'user', role, emailAddress: email }, supportsAllDrives: true })`
2. Get updated file: `files.get({ fileId, fields: FILE_FIELDS, supportsAllDrives: true })`
3. Return `{ file: FormattedFile, permission: { id, type, role, emailAddress } }`

Test: verify permission created with correct role, verify response includes both file and permission.

Commit: `feat: add drive_share tool`

---

### Task 15: drive_list_shared_drives

**Files:**
- Create: `src/tools/drive-list-shared.ts`
- Create: `src/tools/drive-list-shared.test.ts`

Implementation: `drives.list({ pageSize, pageToken })`. Returns `{ drives: Array<{ id, name, createdTime }>, next_page_token, has_more }`.

Test: verify pagination, verify drive fields returned.

Commit: `feat: add drive_list_shared_drives tool`

---

### Task 16: Update register.ts

**Files:**
- Modify: `src/tools/register.ts`

- [ ] **Step 1: Update register.ts with all 12 tool imports**

```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DriveClient } from '../auth/client.js';
import { registerDriveSearch } from './drive-search.js';
import { registerDriveList } from './drive-list.js';
import { registerDriveCreateFolder } from './drive-create-folder.js';
import { registerDriveUpload } from './drive-upload.js';
import { registerDriveRead } from './drive-read.js';
import { registerDriveDelete } from './drive-delete.js';
import { registerDriveMove } from './drive-move.js';
import { registerDriveCopy } from './drive-copy.js';
import { registerDriveRename } from './drive-rename.js';
import { registerDriveShare } from './drive-share.js';
import { registerDriveListSharedDrives } from './drive-list-shared.js';

export function registerTools(
  server: McpServer,
  client: DriveClient,
): void {
  registerDriveSearch(server, client.drive);
  registerDriveList(server, client.drive);
  registerDriveCreateFolder(server, client.drive);
  registerDriveUpload(server, client.drive);
  registerDriveRead(server, client.drive);
  registerDriveDelete(server, client.drive);
  registerDriveMove(server, client.drive);
  registerDriveCopy(server, client.drive);
  registerDriveRename(server, client.drive);
  registerDriveShare(server, client.drive);
  registerDriveListSharedDrives(server, client.drive);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Verify build**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/tools/register.ts
git commit -m "feat: register all 12 Drive tools"
```

---

### Task 17: Full Verification

- [ ] **Step 1: Run complete test suite**

Run: `npm test`
Expected: All tests pass (Phase 1 tests + all new tool tests).

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: Clean build.

- [ ] **Step 4: Smoke test startup**

Run: `set -a; source .env; set +a; timeout 10 node dist/index.js 2>&1 || true`
Expected: `Authenticated as franciscpd@gmail.com` + `Drive MCP Server running on stdio`.

- [ ] **Step 5: Commit fixes if needed**

```bash
git add -A
git commit -m "fix: adjust tests for full suite compatibility"
```

---

## Verification Checklist

- [ ] All 12 tools registered and discoverable
- [ ] drive_search returns paginated results with query syntax
- [ ] drive_list navigates folder hierarchy (default root)
- [ ] drive_create_folder creates with optional parent
- [ ] drive_upload creates text files with content
- [ ] drive_read auto-exports Workspace files (Docs→MD, Sheets→CSV, Slides→text)
- [ ] drive_delete soft-deletes (trash only)
- [ ] drive_move moves between folders
- [ ] drive_copy copies with optional name/parent
- [ ] drive_rename updates file name
- [ ] drive_share adds permissions (reader/writer/commenter)
- [ ] drive_list_shared_drives lists available Shared Drives
- [ ] All tools include supportsAllDrives: true
- [ ] All responses use formatFile with complete field set
