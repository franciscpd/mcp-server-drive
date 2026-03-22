# Phase 2: Drive Tools — Design Spec

**Date:** 2026-03-21
**Approach:** Sequential by dependency — utilities first, then tools in natural order
**Status:** Approved

## Overview

Implement 12 Drive file management tools: search, list folder contents, create folder, upload text file, read/download file content, soft delete (trash), move, copy, rename, share (add permission), and list shared drives. All tools include `supportsAllDrives: true` transparently. Google Workspace files (Docs, Sheets, Slides) are auto-exported to readable formats when read.

## File Structure

```
src/tools/
├── register.ts              # Updated — imports and calls all 12 registerDrive* functions
├── format.ts                # FormattedFile interface, formatFile(), buildPagination(), FILE_FIELDS
├── export.ts                # exportWorkspaceFile() — MIME-based export with turndown for Docs
├── test-helpers.ts          # createMockDrive(), createMockFile(), captureToolHandler()
├── drive-search.ts          # drive_search — files.list with query
├── drive-search.test.ts
├── drive-list.ts            # drive_list — files.list with parent filter
├── drive-list.test.ts
├── drive-create-folder.ts   # drive_create_folder — files.create with folder MIME
├── drive-create-folder.test.ts
├── drive-upload.ts          # drive_upload — files.create with text content
├── drive-upload.test.ts
├── drive-read.ts            # drive_read — files.get or files.export (auto-detect)
├── drive-read.test.ts
├── drive-delete.ts          # drive_delete — files.update trashed=true
├── drive-delete.test.ts
├── drive-move.ts            # drive_move — files.update with addParents/removeParents
├── drive-move.test.ts
├── drive-copy.ts            # drive_copy — files.copy
├── drive-copy.test.ts
├── drive-rename.ts          # drive_rename — files.update name
├── drive-rename.test.ts
├── drive-share.ts           # drive_share — permissions.create
├── drive-share.test.ts
├── drive-list-shared.ts     # drive_list_shared_drives — drives.list
└── drive-list-shared.test.ts
```

Modified files:
- `src/tools/register.ts` — add imports and calls for all 12 tools
- `package.json` — add `turndown` + `@types/turndown` deps

## Components

### 1. Format Utilities (`src/tools/format.ts`)

**FormattedFile interface:**
```typescript
interface FormattedFile {
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
```

**Constants:**
```typescript
const FILE_FIELDS = 'id, name, mimeType, size, createdTime, modifiedTime, owners(emailAddress), parents, webViewLink, shared, trashed';
```

**Functions:**
- `formatFile(file: drive_v3.Schema$File): FormattedFile` — maps API response to standard fields. Extracts owner emails from owners array. Defaults nulls safely.
- `buildPagination(nextPageToken?: string | null): { next_page_token: string | null; has_more: boolean }` — same pattern as Gmail/Calendar servers.

### 2. Export Utilities (`src/tools/export.ts`)

**Google Workspace MIME types:**
```typescript
const WORKSPACE_MIME_TYPES: Record<string, { exportMime: string; transform?: 'html-to-markdown' }> = {
  'application/vnd.google-apps.document': { exportMime: 'text/html', transform: 'html-to-markdown' },
  'application/vnd.google-apps.spreadsheet': { exportMime: 'text/csv' },
  'application/vnd.google-apps.presentation': { exportMime: 'text/plain' },
};
```

**`exportWorkspaceFile(drive, fileId, mimeType): Promise<string>`**
1. Look up MIME type in `WORKSPACE_MIME_TYPES`
2. If found: call `drive.files.export({ fileId, mimeType: exportMime })` → get content
3. If transform is `html-to-markdown`: convert via `new TurndownService().turndown(html)`
4. If not found (regular file): call `drive.files.get({ fileId, alt: 'media' })` → return raw text
5. Return content string

### 3. Test Helpers (`src/tools/test-helpers.ts`)

**`createMockFile(overrides?): drive_v3.Schema$File`** — returns a default mock file with all fields populated. Accepts overrides for specific test scenarios.

**`createMockDrive(overrides?)`** — returns a mock `drive_v3.Drive` with vi.fn() mocks for all used methods: `files.list`, `files.get`, `files.create`, `files.update`, `files.copy`, `files.delete`, `files.export`, `permissions.create`, `drives.list`.

**`captureToolHandler(registerFn, drive)`** — captures the handler function from `server.tool()` call for isolated testing.

### 4. The 12 Tools

Each tool follows this pattern:
```typescript
export function registerDriveXxx(server: McpServer, drive: drive_v3.Drive): void {
  server.tool(
    'drive_xxx',
    'Description referencing related tools...',
    { /* zod schema */ },
    (params) => safeToolHandler(async () => {
      // API call with supportsAllDrives: true
      // Format response with formatFile()
      // Return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }),
  );
}
```

#### Tool 1: `drive_search` (DRIV-01)
- **API:** `files.list` with `q` parameter
- **Input:** `query: string`, `page_size?: number (1-100, default 20)`, `page_token?: string`
- **Response:** `{ files: FormattedFile[], next_page_token, has_more }`
- **API params:** `q, pageSize, pageToken, fields: 'nextPageToken, files(FILE_FIELDS)', supportsAllDrives: true, includeItemsFromAllDrives: true`

#### Tool 2: `drive_list` (DRIV-02)
- **API:** `files.list` with parent filter
- **Input:** `folder_id?: string (default 'root')`, `page_size?: number (1-100, default 20)`, `page_token?: string`
- **Response:** `{ files: FormattedFile[], next_page_token, has_more }`
- **API params:** `q: "'${folderId}' in parents and trashed = false"`, same fields/pagination as search

#### Tool 3: `drive_create_folder` (DRIV-03)
- **API:** `files.create`
- **Input:** `name: string`, `parent_id?: string`
- **Response:** `FormattedFile` (the created folder)
- **API params:** `requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: parent_id ? [parent_id] : undefined }`, `fields: FILE_FIELDS`, `supportsAllDrives: true`

#### Tool 4: `drive_upload` (DRIV-04)
- **API:** `files.create` with media body
- **Input:** `name: string`, `content: string`, `mime_type?: string (default 'text/plain')`, `parent_id?: string`
- **Response:** `FormattedFile` (the uploaded file)
- **API params:** `requestBody: { name, mimeType, parents }`, `media: { mimeType, body: content }`, `fields: FILE_FIELDS`, `supportsAllDrives: true`

#### Tool 5: `drive_read` (DRIV-05)
- **API:** `files.get` (metadata) then `files.get` (media) or `files.export`
- **Input:** `file_id: string`
- **Response:** `{ file: FormattedFile, content: string }` — metadata + content together
- **Logic:**
  1. Get file metadata via `files.get({ fileId, fields: FILE_FIELDS })`
  2. If mimeType is Workspace type → `exportWorkspaceFile(drive, fileId, mimeType)`
  3. If regular file → `files.get({ fileId, alt: 'media' })` for raw content
  4. Return both metadata and content

#### Tool 6: `drive_delete` (DRIV-06)
- **API:** `files.update` with `trashed: true`
- **Input:** `file_id: string`
- **Response:** `FormattedFile` (the trashed file with trashed=true)
- **API params:** `fileId, requestBody: { trashed: true }, fields: FILE_FIELDS, supportsAllDrives: true`

#### Tool 7: `drive_move` (DRIV-07)
- **API:** `files.update` with `addParents`/`removeParents`
- **Input:** `file_id: string`, `destination_folder_id: string`
- **Response:** `FormattedFile` (the moved file)
- **Logic:**
  1. Get current parents via `files.get({ fileId, fields: 'parents' })`
  2. `files.update({ fileId, addParents: destination, removeParents: currentParents.join(','), fields: FILE_FIELDS })`

#### Tool 8: `drive_copy` (DRIV-08)
- **API:** `files.copy`
- **Input:** `file_id: string`, `name?: string`, `parent_id?: string`
- **Response:** `FormattedFile` (the copied file)
- **API params:** `fileId, requestBody: { name, parents: parent_id ? [parent_id] : undefined }, fields: FILE_FIELDS, supportsAllDrives: true`

#### Tool 9: `drive_rename` (DRIV-09)
- **API:** `files.update`
- **Input:** `file_id: string`, `new_name: string`
- **Response:** `FormattedFile` (the renamed file)
- **API params:** `fileId, requestBody: { name: new_name }, fields: FILE_FIELDS, supportsAllDrives: true`

#### Tool 10: `drive_share` (DRIV-10)
- **API:** `permissions.create`
- **Input:** `file_id: string`, `email: string`, `role: 'reader' | 'writer' | 'commenter'`
- **Response:** `{ file: FormattedFile, permission: { id, type, role, emailAddress } }`
- **Logic:**
  1. `permissions.create({ fileId, requestBody: { type: 'user', role, emailAddress: email }, supportsAllDrives: true })`
  2. Get updated file metadata
  3. Return both file and permission info

#### Tool 11: `drive_list_shared_drives` (DRIV-11)
- **API:** `drives.list`
- **Input:** `page_size?: number (1-100, default 20)`, `page_token?: string`
- **Response:** `{ drives: Array<{ id, name, createdTime }>, next_page_token, has_more }`

## Data Flow

```
Tool handler called with params
  → safeToolHandler wraps execution
    → Drive API call (with supportsAllDrives: true, fields: FILE_FIELDS)
      → Format response (formatFile / buildPagination)
        → JSON.stringify with pretty print
          → { content: [{ type: 'text', text: json }] }

For drive_read specifically:
  → Get file metadata (files.get)
    → Detect MIME type
      → Workspace? → exportWorkspaceFile (export + optional turndown)
      → Regular? → files.get with alt: 'media'
        → Return { file: metadata, content: text }
```

## Testing Strategy

Each tool gets a dedicated `.test.ts` file with:

1. **Success case** — mock API returns valid data, verify formatted response
2. **Pagination** (for search, list, list_shared_drives) — verify next_page_token/has_more
3. **Error handling** — mock API throws, verify safeToolHandler returns toolError

**Export tests (`export.test.ts`):**
- Google Doc → verify turndown is called, markdown output
- Google Sheet → verify CSV export
- Regular file → verify raw content fetch

**Format tests (`format.test.ts`):**
- `formatFile` maps all fields correctly
- Handles null/undefined fields gracefully
- `buildPagination` with and without token

## Dependencies

### New production deps
- `turndown` ^7.2.2 — HTML to Markdown conversion for Docs export
- `@types/turndown` ^5.0.6 — TypeScript types (devDep)

## Requirements Coverage

| Requirement | Tool | How |
|-------------|------|-----|
| DRIV-01 | drive_search | files.list with q, pagination |
| DRIV-02 | drive_list | files.list with parent filter, default root |
| DRIV-03 | drive_create_folder | files.create with folder MIME |
| DRIV-04 | drive_upload | files.create with media body |
| DRIV-05 | drive_read | files.get/export, auto-detect MIME, turndown for Docs |
| DRIV-06 | drive_delete | files.update trashed=true (soft only) |
| DRIV-07 | drive_move | files.update addParents/removeParents |
| DRIV-08 | drive_copy | files.copy |
| DRIV-09 | drive_rename | files.update name |
| DRIV-10 | drive_share | permissions.create (reader/writer/commenter) |
| DRIV-11 | drive_list_shared_drives | drives.list with pagination |
| DRIV-12 | ALL | supportsAllDrives: true on every API call |

## Canonical References

Implementation MUST follow these:
- `src/utils/errors.ts` — safeToolHandler, categorizeError (already built)
- `/home/franciscpd/Projects/mcp-server-gmail/src/tools/read-emails.ts` — paginated tool pattern
- `/home/franciscpd/Projects/mcp-server-gmail/src/tools/format.ts` — buildPagination pattern
- `/home/franciscpd/Projects/mcp-server-gmail/src/test-helpers.ts` — captureToolHandler pattern
- `/home/franciscpd/Projects/mcp-server-calendar/src/utils/format.ts` — formatEntity pattern

---

*Phase: 02-drive-tools*
*Design approved: 2026-03-21*
