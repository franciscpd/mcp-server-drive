# Phase 3: Docs + Sheets Tools — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 10 tools for Google Docs (create, read with indices, insert/delete text, comments) and Google Sheets (create, read, update, list tabs).

**Architecture:** Same tool pattern as Phase 2. Each tool is a standalone file with `registerXxx(server, apiClient)`. Docs tools use `docs_v1.Docs` for document ops and `drive_v3.Drive` for comments. Sheets tools use `sheets_v4.Sheets`. All wrapped in `safeToolHandler`. Sheets writes use `valueInputOption: RAW` to prevent formula injection.

**Tech Stack:** TypeScript, googleapis (docs_v1, sheets_v4, drive_v3), zod, vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/tools/test-helpers.ts` | Modify | Add createMockDocs(), createMockSheets(), extend createMockDrive with comments, make captureToolHandler generic |
| `src/tools/docs-create.ts` | Create | docs_create tool |
| `src/tools/docs-create.test.ts` | Create | Tests |
| `src/tools/docs-read.ts` | Create | docs_read tool (paragraph extraction) |
| `src/tools/docs-read.test.ts` | Create | Tests |
| `src/tools/docs-insert-text.ts` | Create | docs_insert_text tool |
| `src/tools/docs-insert-text.test.ts` | Create | Tests |
| `src/tools/docs-delete-text.ts` | Create | docs_delete_text tool |
| `src/tools/docs-delete-text.test.ts` | Create | Tests |
| `src/tools/docs-list-comments.ts` | Create | docs_list_comments tool (Drive API) |
| `src/tools/docs-list-comments.test.ts` | Create | Tests |
| `src/tools/docs-add-comment.ts` | Create | docs_add_comment tool (Drive API) |
| `src/tools/docs-add-comment.test.ts` | Create | Tests |
| `src/tools/sheets-create.ts` | Create | sheets_create tool |
| `src/tools/sheets-create.test.ts` | Create | Tests |
| `src/tools/sheets-read.ts` | Create | sheets_read tool |
| `src/tools/sheets-read.test.ts` | Create | Tests |
| `src/tools/sheets-update.ts` | Create | sheets_update tool (RAW) |
| `src/tools/sheets-update.test.ts` | Create | Tests |
| `src/tools/sheets-list.ts` | Create | sheets_list tool |
| `src/tools/sheets-list.test.ts` | Create | Tests |
| `src/tools/register.ts` | Modify | Add registerDocsTools + registerSheetsTools |

---

### Task 1: Extend Test Helpers

**Files:**
- Modify: `src/tools/test-helpers.ts`

- [ ] **Step 1: Update test-helpers.ts**

Add `createMockDocs()`, `createMockSheets()`, extend `createMockDrive` with comments, and make `captureToolHandler` generic:

```typescript
import { vi } from 'vitest';
import type { drive_v3, docs_v1, sheets_v4 } from 'googleapis';

// ... keep existing createMockFile, createMockDrive (extend with comments) ...

// Add to createMockDrive overrides interface:
//   commentsList: ReturnType<typeof vi.fn>;
//   commentsCreate: ReturnType<typeof vi.fn>;
// Add to the returned object:
//   comments: {
//     list: overrides?.commentsList ?? vi.fn().mockResolvedValue({ data: { comments: [] } }),
//     create: overrides?.commentsCreate ?? vi.fn().mockResolvedValue({
//       data: { id: 'comment-1', author: { displayName: 'User', emailAddress: 'user@example.com' }, content: 'Test comment', createdTime: '2026-03-21T00:00:00Z' },
//     }),
//   },

// NEW: Mock Docs client
export function createMockDocs(overrides?: Partial<{
  documentsCreate: ReturnType<typeof vi.fn>;
  documentsGet: ReturnType<typeof vi.fn>;
  documentsBatchUpdate: ReturnType<typeof vi.fn>;
}>) {
  return {
    documents: {
      create: overrides?.documentsCreate ?? vi.fn().mockResolvedValue({
        data: { documentId: 'doc-1', title: 'Test Doc', body: { content: [] } },
      }),
      get: overrides?.documentsGet ?? vi.fn().mockResolvedValue({
        data: {
          documentId: 'doc-1',
          title: 'Test Doc',
          body: {
            content: [
              { startIndex: 1, endIndex: 12, paragraph: { elements: [{ textRun: { content: 'Hello world' } }] } },
              { startIndex: 12, endIndex: 13, paragraph: { elements: [{ textRun: { content: '\n' } }] } },
            ],
          },
        },
      }),
      batchUpdate: overrides?.documentsBatchUpdate ?? vi.fn().mockResolvedValue({
        data: { documentId: 'doc-1', replies: [] },
      }),
    },
  } as unknown as docs_v1.Docs;
}

// NEW: Mock Sheets client
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

// UPDATE captureToolHandler to be generic (accept any API client type):
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
```

- [ ] **Step 2: Verify existing tests still pass**

Run: `npm test`
Expected: All 73 existing tests pass (captureToolHandler signature change is backward compatible via rest params).

- [ ] **Step 3: Commit**

```bash
git add src/tools/test-helpers.ts
git commit -m "feat: extend test helpers with Docs/Sheets mocks and generic captureToolHandler"
```

---

### Task 2: docs_create

**Files:**
- Create: `src/tools/docs-create.ts`
- Create: `src/tools/docs-create.test.ts`

- [ ] **Step 1: Write tests**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { registerDocsCreate } from './docs-create.js';
import { createMockDocs, captureToolHandler } from './test-helpers.js';

describe('docs_create', () => {
  it('creates doc with title only', async () => {
    const docs = createMockDocs();
    const handler = captureToolHandler(registerDocsCreate, docs);
    const result = await handler({ title: 'My Doc' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.documentId).toBe('doc-1');
    expect(parsed.title).toBe('Test Doc');
    expect(parsed.url).toContain('doc-1');
    expect(docs.documents.create).toHaveBeenCalledWith({ requestBody: { title: 'My Doc' } });
    expect(docs.documents.batchUpdate).not.toHaveBeenCalled();
  });

  it('creates doc with initial content', async () => {
    const docs = createMockDocs();
    const handler = captureToolHandler(registerDocsCreate, docs);
    await handler({ title: 'My Doc', content: 'Hello world' });
    expect(docs.documents.create).toHaveBeenCalled();
    expect(docs.documents.batchUpdate).toHaveBeenCalledWith({
      documentId: 'doc-1',
      requestBody: { requests: [{ insertText: { text: 'Hello world', location: { index: 1 } } }] },
    });
  });

  it('returns toolError on failure', async () => {
    const docs = createMockDocs({ documentsCreate: vi.fn().mockRejectedValue(new Error('fail')) });
    const handler = captureToolHandler(registerDocsCreate, docs);
    const result = await handler({ title: 'fail' });
    expect(result.isError).toBe(true);
  });
});
```

- [ ] **Step 2: Implement**

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { docs_v1 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';

export function registerDocsCreate(server: McpServer, docs: docs_v1.Docs): void {
  server.tool(
    'docs_create',
    'Create a new Google Doc with optional initial content.',
    {
      title: z.string().describe('Document title'),
      content: z.string().optional().describe('Initial text content'),
    },
    (params) =>
      safeToolHandler(async () => {
        const response = await docs.documents.create({ requestBody: { title: params.title } });
        const documentId = response.data.documentId!;

        if (params.content) {
          await docs.documents.batchUpdate({
            documentId,
            requestBody: {
              requests: [{ insertText: { text: params.content, location: { index: 1 } } }],
            },
          });
        }

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              documentId,
              title: response.data.title ?? params.title,
              url: `https://docs.google.com/document/d/${documentId}/edit`,
            }, null, 2),
          }],
        };
      }),
  );
}
```

- [ ] **Step 3: Test, commit**

Run: `npx vitest run src/tools/docs-create.test.ts`
Commit: `feat: add docs_create tool`

---

### Task 3: docs_read

**Files:**
- Create: `src/tools/docs-read.ts`
- Create: `src/tools/docs-read.test.ts`

This is the most complex tool — extracts paragraphs with indices from the Docs API structure.

- [ ] **Step 1: Write tests**

Tests should cover:
- Normal document with multiple paragraphs — verify text concatenation, paragraph indices
- Empty document (single newline at index 1) — verify graceful handling
- Verify documentId, title, text, length, paragraphs array in response

Mock `body.content[]` structure:
```typescript
{
  body: {
    content: [
      { endIndex: 1 },  // sectionBreak (no paragraph)
      { startIndex: 1, endIndex: 13, paragraph: { elements: [{ startIndex: 1, endIndex: 13, textRun: { content: 'Hello world\n' } }] } },
      { startIndex: 13, endIndex: 30, paragraph: { elements: [{ startIndex: 13, endIndex: 30, textRun: { content: 'Second paragraph\n' } }] } },
    ],
  },
}
```

Expected output:
```json
{ "text": "Hello world\nSecond paragraph\n", "length": 30, "paragraphs": [{ "start": 1, "end": 13, "text": "Hello world\n" }, { "start": 13, "end": 30, "text": "Second paragraph\n" }] }
```

- [ ] **Step 2: Implement**

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { docs_v1 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';

export function registerDocsRead(server: McpServer, docs: docs_v1.Docs): void {
  server.tool(
    'docs_read',
    "Read a Google Doc's content as plain text with paragraph index information. Use indices for docs_insert_text and docs_delete_text.",
    {
      document_id: z.string().describe('Google Doc document ID'),
    },
    (params) =>
      safeToolHandler(async () => {
        const response = await docs.documents.get({ documentId: params.document_id });
        const doc = response.data;
        const content = doc.body?.content ?? [];

        const paragraphs: Array<{ start: number; end: number; text: string }> = [];
        let fullText = '';

        for (const element of content) {
          if (!element.paragraph) continue;
          const start = element.startIndex ?? 0;
          const end = element.endIndex ?? 0;
          let paragraphText = '';
          for (const el of element.paragraph.elements ?? []) {
            if (el.textRun?.content) {
              paragraphText += el.textRun.content;
            }
          }
          if (paragraphText) {
            paragraphs.push({ start, end, text: paragraphText });
            fullText += paragraphText;
          }
        }

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              documentId: doc.documentId,
              title: doc.title,
              text: fullText,
              length: content[content.length - 1]?.endIndex ?? 0,
              paragraphs,
            }, null, 2),
          }],
        };
      }),
  );
}
```

- [ ] **Step 3: Test, commit**

Commit: `feat: add docs_read tool with paragraph index extraction`

---

### Task 4: docs_insert_text + docs_delete_text

**Files:**
- Create: `src/tools/docs-insert-text.ts` + `.test.ts`
- Create: `src/tools/docs-delete-text.ts` + `.test.ts`

- [ ] **Step 1: Implement docs_insert_text**

Input: `{ document_id, text, index }` (index min 1).
API: `docs.documents.batchUpdate({ documentId, requestBody: { requests: [{ insertText: { text, location: { index } } }] } })`
Response: `{ documentId, message: "Inserted N characters at index X" }`

- [ ] **Step 2: Implement docs_delete_text**

Input: `{ document_id, start_index, end_index }` (both min 1).
API: `docs.documents.batchUpdate({ documentId, requestBody: { requests: [{ deleteContentRange: { range: { startIndex, endIndex, segmentId: '' } } }] } })`
Response: `{ documentId, message: "Deleted range X-Y" }`

- [ ] **Step 3: Tests for both**

Verify batchUpdate called with correct request structure, verify response message format, verify error handling.

- [ ] **Step 4: Commit**

```bash
git add src/tools/docs-insert-text.ts src/tools/docs-insert-text.test.ts src/tools/docs-delete-text.ts src/tools/docs-delete-text.test.ts
git commit -m "feat: add docs_insert_text and docs_delete_text tools"
```

---

### Task 5: docs_list_comments + docs_add_comment

**Files:**
- Create: `src/tools/docs-list-comments.ts` + `.test.ts`
- Create: `src/tools/docs-add-comment.ts` + `.test.ts`

**IMPORTANT:** These tools use `drive_v3.Drive` (not `docs_v1.Docs`) because comments are a Drive API feature.

- [ ] **Step 1: Implement docs_list_comments**

Input: `{ document_id }`
API: `drive.comments.list({ fileId: document_id, fields: 'comments(id,author(displayName,emailAddress),content,createdTime,resolved)' })`
Response: `{ comments: [{ id, author: { name, email }, content, createdTime, resolved }] }`

Map `author.displayName` → `name`, `author.emailAddress` → `email`.

- [ ] **Step 2: Implement docs_add_comment**

Input: `{ document_id, content }`
API: `drive.comments.create({ fileId: document_id, fields: 'id,author(displayName,emailAddress),content,createdTime', requestBody: { content } })`
Response: `{ id, author: { name, email }, content, createdTime }`

- [ ] **Step 3: Tests for both**

Use `createMockDrive` (with comments mocks). Verify `drive.comments.list` / `drive.comments.create` called (NOT `docs.documents.*`). Verify fileId matches document_id param.

- [ ] **Step 4: Commit**

```bash
git add src/tools/docs-list-comments.ts src/tools/docs-list-comments.test.ts src/tools/docs-add-comment.ts src/tools/docs-add-comment.test.ts
git commit -m "feat: add docs_list_comments and docs_add_comment tools"
```

---

### Task 6: sheets_create

**Files:**
- Create: `src/tools/sheets-create.ts` + `.test.ts`

- [ ] **Step 1: Implement**

Input: `{ title, data?: string[][] }`
Logic:
1. `sheets.spreadsheets.create({ requestBody: { properties: { title } } })`
2. If data: `sheets.spreadsheets.values.update({ spreadsheetId, range: 'Sheet1', valueInputOption: 'RAW', requestBody: { values: data } })`
Response: `{ spreadsheetId, title, url, sheets: [{ sheetId, title }] }`

- [ ] **Step 2: Tests**

Test with/without data. Verify `valueInputOption: 'RAW'` when data provided. Verify values.update NOT called when no data.

- [ ] **Step 3: Commit**

Commit: `feat: add sheets_create tool`

---

### Task 7: sheets_read + sheets_update + sheets_list

**Files:**
- Create: `src/tools/sheets-read.ts` + `.test.ts`
- Create: `src/tools/sheets-update.ts` + `.test.ts`
- Create: `src/tools/sheets-list.ts` + `.test.ts`

- [ ] **Step 1: Implement sheets_read**

Input: `{ spreadsheet_id, range }` (A1 notation)
API: `sheets.spreadsheets.values.get({ spreadsheetId, range })`
Response: `{ range, values: string[][] }`

- [ ] **Step 2: Implement sheets_update**

Input: `{ spreadsheet_id, range, values: z.array(z.array(z.string())) }`
API: `sheets.spreadsheets.values.update({ spreadsheetId, range, valueInputOption: 'RAW', requestBody: { values } })`
Response: `{ updatedRange, updatedRows, updatedColumns, updatedCells }`

- [ ] **Step 3: Implement sheets_list**

Input: `{ spreadsheet_id }`
API: `sheets.spreadsheets.get({ spreadsheetId, fields: 'spreadsheetId,properties.title,sheets.properties' })`
Response: `{ spreadsheetId, title, sheets: [{ sheetId, title, index, rowCount, columnCount }] }`

- [ ] **Step 4: Tests for all 3**

Verify API calls, verify response format, verify RAW mode for update.

- [ ] **Step 5: Commit**

```bash
git add src/tools/sheets-read.ts src/tools/sheets-read.test.ts src/tools/sheets-update.ts src/tools/sheets-update.test.ts src/tools/sheets-list.ts src/tools/sheets-list.test.ts
git commit -m "feat: add sheets_read, sheets_update, and sheets_list tools"
```

---

### Task 8: Update register.ts + registerDocsTools + registerSheetsTools

**Files:**
- Create: `src/tools/docs-register.ts` — hub for 6 Docs tools
- Create: `src/tools/sheets-register.ts` — hub for 4 Sheets tools
- Modify: `src/tools/register.ts` — import and call both hubs

- [ ] **Step 1: Create docs-register.ts**

```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DriveClient } from '../auth/client.js';
import { registerDocsCreate } from './docs-create.js';
import { registerDocsRead } from './docs-read.js';
import { registerDocsInsertText } from './docs-insert-text.js';
import { registerDocsDeleteText } from './docs-delete-text.js';
import { registerDocsListComments } from './docs-list-comments.js';
import { registerDocsAddComment } from './docs-add-comment.js';

export function registerDocsTools(server: McpServer, client: DriveClient): void {
  registerDocsCreate(server, client.docs);
  registerDocsRead(server, client.docs);
  registerDocsInsertText(server, client.docs);
  registerDocsDeleteText(server, client.docs);
  registerDocsListComments(server, client.drive);
  registerDocsAddComment(server, client.drive);
}
```

- [ ] **Step 2: Create sheets-register.ts**

```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { sheets_v4 } from 'googleapis';
import { registerSheetsCreate } from './sheets-create.js';
import { registerSheetsRead } from './sheets-read.js';
import { registerSheetsUpdate } from './sheets-update.js';
import { registerSheetsList } from './sheets-list.js';

export function registerSheetsTools(server: McpServer, sheets: sheets_v4.Sheets): void {
  registerSheetsCreate(server, sheets);
  registerSheetsRead(server, sheets);
  registerSheetsUpdate(server, sheets);
  registerSheetsList(server, sheets);
}
```

- [ ] **Step 3: Update register.ts**

Add imports for `registerDocsTools` and `registerSheetsTools`. Replace Phase 3 comments with actual calls:

```typescript
import { registerDocsTools } from './docs-register.js';
import { registerSheetsTools } from './sheets-register.js';

// In registerTools body, after Drive tools:
// Phase 3: Docs + Sheets tools
registerDocsTools(server, client);
registerSheetsTools(server, client.sheets);
```

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit && npm run build`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/tools/docs-register.ts src/tools/sheets-register.ts src/tools/register.ts
git commit -m "feat: register all Docs and Sheets tools"
```

---

### Task 9: Full Verification

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass (73 existing + ~30 new).

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Build**

Run: `npm run build`

- [ ] **Step 4: Smoke test**

Run: `set -a; source .env; set +a; timeout 10 node dist/index.js 2>&1 || true`
Expected: `Authenticated as franciscpd@gmail.com` + `Drive MCP Server running on stdio`

- [ ] **Step 5: Commit fixes if needed**

---

## Verification Checklist

- [ ] docs_create creates doc with optional initial content (2 API calls abstracted into 1)
- [ ] docs_read returns text + paragraph indices (1-based)
- [ ] docs_insert_text inserts at specified index via batchUpdate
- [ ] docs_delete_text deletes range via batchUpdate
- [ ] docs_list_comments uses Drive API (not Docs API)
- [ ] docs_add_comment uses Drive API (not Docs API)
- [ ] sheets_create creates spreadsheet with optional initial data
- [ ] sheets_read returns 2D array from A1 range
- [ ] sheets_update uses valueInputOption: RAW
- [ ] sheets_list returns sheet metadata (sheetId, title, index, rowCount, columnCount)
- [ ] All tools registered and server starts successfully
