# Phase 2: Drive Tools - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Claude can manage files and folders in Google Drive — including personal Drive and Shared Drives — through 12 purpose-built tools. Covers search, CRUD (create folder, upload text, read/download, delete), file operations (move, copy, rename), sharing (add permissions), and Shared Drive listing. All operations use `supportsAllDrives: true` transparently.

</domain>

<decisions>
## Implementation Decisions

### Workspace file export (DRIV-05)
- **D-01:** Google Docs exported as HTML then converted to Markdown via `turndown` library — preserves document structure (headers, links, lists) in agent-readable format
- **D-02:** Google Sheets exported as CSV (`text/csv`) — first sheet only per export call
- **D-03:** Google Slides exported as plain text (`text/plain`) — sufficient for v1 content reading
- **D-04:** Add `turndown` and `@types/turndown` as dependencies in this phase
- **D-05:** MIME type detection determines export format: `application/vnd.google-apps.document` → HTML→MD, `application/vnd.google-apps.spreadsheet` → CSV, `application/vnd.google-apps.presentation` → plain text, everything else → raw content

### Response fields
- **D-06:** File listings and search results return complete field set: id, name, mimeType, size, createdTime, modifiedTime, owners, parents, webViewLink, shared, trashed
- **D-07:** Mutation operations (create, copy, move, rename, delete, share) return the full updated file object with same fields as listings
- **D-08:** Paginated responses use `{ files: [...], next_page_token: string | null, has_more: boolean }` pattern (same as Gmail/Calendar servers)

### Delete behavior (DRIV-06)
- **D-09:** `drive_delete_file` only does soft delete (trash) — never permanent deletion. No `permanent` flag. Safest for autonomous agents
- **D-10:** No `drive_restore` tool in this phase — restoring from trash is done via Google Drive UI. Keeps scope at exactly 12 tools

### Shared Drives (DRIV-12)
- **D-11:** All Drive API calls include `supportsAllDrives: true` and `includeItemsFromAllDrives: true` where applicable — transparent to the caller, no separate "shared drive mode"

### Claude's Discretion
- File organization within `src/tools/` — one file per tool or grouped by operation type
- Exact `buildPagination` utility implementation and placement (likely `src/utils/format.ts`)
- `formatFile` utility that maps Drive API response to the standard field set
- Default `pageSize` for paginated operations
- Zod schema details for each tool's input parameters
- Test helper mock factory for Drive API responses

</decisions>

<specifics>
## Specific Ideas

- Follow Gmail `captureToolHandler` test pattern for all tool tests — mock the server, capture the handler, test in isolation
- Use Drive API `fields` parameter to request only needed fields (optimization, reduces payload from Google)
- The `drive_read_file` tool should auto-detect MIME type and choose export format — no user-facing format parameter needed

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Drive server code
- `src/tools/register.ts` — Empty hub, will be populated with `registerDriveTools(server, client.drive)`
- `src/utils/errors.ts` — `safeToolHandler`, `categorizeError`, `ErrorCategory` with CONFLICT + QUOTA
- `src/auth/client.ts` — `DriveClient` interface with `drive: drive_v3.Drive`

### Tool patterns from companion servers
- `/home/franciscpd/Projects/mcp-server-gmail/src/tools/read-emails.ts` — Paginated tool pattern with zod schema, safeToolHandler, JSON response
- `/home/franciscpd/Projects/mcp-server-gmail/src/tools/format.ts` — `buildPagination`, `FormattedMessage`, `PaginatedResponse`
- `/home/franciscpd/Projects/mcp-server-gmail/src/test-helpers.ts` — `captureToolHandler` pattern for testing tools in isolation
- `/home/franciscpd/Projects/mcp-server-calendar/src/utils/format.ts` — `formatEvent`, `formatCalendar` — typed format functions per entity

### Google Drive API
- Drive API v3 Files resource — `files.list`, `files.get`, `files.create`, `files.update`, `files.copy`, `files.delete`, `files.export`
- Drive API v3 Permissions resource — `permissions.create`
- Drive API v3 Drives resource — `drives.list`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/utils/errors.ts` — `safeToolHandler` wraps all tool handlers, `categorizeError` handles Drive-specific errors (409 CONFLICT, QUOTA)
- `src/utils/logger.ts` — `logger.debug()` for request logging
- `src/auth/client.ts` — `DriveClient.drive` is the initialized `drive_v3.Drive` instance

### Established Patterns
- Tool registration: `server.tool(name, description, zod_schema, handler)` inside `safeToolHandler`
- Response format: `{ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }`
- Pagination: `buildPagination(nextPageToken)` → `{ next_page_token, has_more }`
- Testing: `captureToolHandler(registerFn, apiClient)` extracts handler for isolated testing

### Integration Points
- `src/tools/register.ts` → import and call `registerDriveTools(server, client.drive)` (currently empty)
- New file `src/utils/format.ts` — shared `formatFile()`, `buildPagination()` utilities
- New files `src/tools/drive-*.ts` — one per tool (or grouped logically)

</code_context>

<deferred>
## Deferred Ideas

- `drive_restore` tool (restore from trash) — v2 feature, not in current requirements
- Permanent delete option — too risky for autonomous agents, keep as trash-only
- Binary file upload (images, PDFs) — DRIV-13 in v2
- Full permission CRUD (list, update, remove permissions) — DRIV-15 in v2
- Rich text formatting for Docs — DOCS-07 in v2 (includes ABNT formatting capability)

</deferred>

---

*Phase: 02-drive-tools*
*Context gathered: 2026-03-21*
