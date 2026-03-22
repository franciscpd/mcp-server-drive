# Phase 3: Docs + Sheets Tools - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Claude can create, read, and surgically edit Google Docs documents (create, read with index info, insert text, delete text range, list comments, add comments), and create and read/write Google Sheets spreadsheets (create with initial data, read cell range, update cell range, list sheets/tabs). 6 Docs tools + 4 Sheets tools = 10 tools total.

</domain>

<decisions>
## Implementation Decisions

### Docs reading (DOCS-02)
- **D-01:** `docs_read` returns structured JSON with: `text` (plain text content), `length` (total character count), and `paragraphs` array where each entry has `start`, `end`, and `text` — the startIndex/endIndex from the Docs API mapped to each paragraph
- **D-02:** Indices are 1-based (matching Docs API convention) — the agent uses these indices directly for `docs_insert_text` and `docs_delete_text`

### Docs creation (DOCS-01)
- **D-03:** `docs_create(title, content?)` abstracts 2 API calls internally: `documents.create({ title })` then `documents.batchUpdate({ insertText })` if content is provided. Agent sees one tool call.
- **D-04:** If content is provided, it's inserted at index 1 (beginning of document)

### Docs editing (DOCS-03, DOCS-04)
- **D-05:** `docs_insert_text(document_id, text, index)` — uses `batchUpdate` with `insertText` request. Index is 1-based.
- **D-06:** `docs_delete_text(document_id, start_index, end_index)` — uses `batchUpdate` with `deleteContentRange` request. Both indices 1-based.

### Docs comments (DOCS-05, DOCS-06)
- **D-07:** `docs_list_comments(document_id)` — uses Drive API `comments.list` (not Docs API — comments are a Drive feature). Returns array of `{ id, author, content, createdTime, resolved }`.
- **D-08:** `docs_add_comment(document_id, content)` — uses Drive API `comments.create`. Simple text comment on the document (not anchored to specific text in v1).

### Sheets data format (SHTS-01, SHTS-02, SHTS-03)
- **D-09:** Data passed as JSON array of arrays. Input (create/update) and output (read) use the same format: `[["Header1", "Header2"], ["val1", "val2"]]`
- **D-10:** `sheets_create(title, data?)` — creates spreadsheet via Sheets API, then writes initial data via `values.update` if provided
- **D-11:** `sheets_read(spreadsheet_id, range)` — range in A1 notation (e.g., "Sheet1!A1:C10"). Returns `{ range, values: string[][] }`
- **D-12:** `sheets_update(spreadsheet_id, range, values)` — uses `valueInputOption: 'RAW'` to prevent formula injection. Values as 2D array.
- **D-13:** `sheets_list(spreadsheet_id)` — returns array of `{ sheetId, title, index, rowCount, columnCount }`

### Claude's Discretion
- File organization: one file per tool (matching Phase 2 pattern)
- Tool registration: `registerDocsTools(server, client.docs)` and `registerSheetsTools(server, client.sheets)` in register.ts
- How to handle the Drive API dependency for comments (docs tools need both `docs` and `drive` clients, or use Drive API directly for comments)
- Paragraph extraction logic from Docs API `body.content[]` structure
- Error messages specific to Docs/Sheets operations

</decisions>

<specifics>
## Specific Ideas

- Comments use the Drive API (`drive.comments`), not the Docs API — this means docs comment tools need the `drive` client, not the `docs` client. Consider passing the full `DriveClient` to `registerDocsTools` instead of just `client.docs`.
- The Docs API `body.content[]` array contains structural elements (paragraphs, tables, lists). For v1, extract only paragraph text and indices. Tables and lists are rendered as text within their paragraphs.
- `valueInputOption: 'RAW'` is critical for Sheets — it prevents strings like `=SUM(A1:A10)` from being executed as formulas, which is a security concern for agent-written data.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Drive server code
- `src/tools/register.ts` — Currently registers Drive tools, needs Docs + Sheets additions
- `src/tools/format.ts` — `formatFile`, `buildPagination` (reusable for paginated results)
- `src/tools/test-helpers.ts` — `captureToolHandler`, `createMockDrive` (extend with docs/sheets mocks)
- `src/utils/errors.ts` — `safeToolHandler` wraps all tool handlers
- `src/auth/client.ts` — `DriveClient` with `docs: docs_v1.Docs`, `sheets: sheets_v4.Sheets`, `drive: drive_v3.Drive`

### Tool pattern from Phase 2
- `src/tools/drive-search.ts` — exemplar tool pattern (imports, schema, safeToolHandler, JSON response)

### Google APIs
- Docs API v1: `documents.create`, `documents.get`, `documents.batchUpdate` (insertText, deleteContentRange)
- Sheets API v4: `spreadsheets.create`, `spreadsheets.get`, `spreadsheets.values.get`, `spreadsheets.values.update`
- Drive API v3: `comments.list`, `comments.create` (for Doc comments)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/tools/format.ts` — `buildPagination()` for paginated results
- `src/tools/test-helpers.ts` — `captureToolHandler()` pattern, extend `createMockDrive()` or create `createMockDocs()`/`createMockSheets()`
- `src/utils/errors.ts` — `safeToolHandler` for all tool handlers
- `src/tools/export.ts` — `readFileContent()` already handles Docs → Markdown export (via Drive API). This is separate from `docs_read` which uses the Docs API for structured reading with indices.

### Integration Points
- `src/tools/register.ts` → add `registerDocsTools(server, client)` and `registerSheetsTools(server, client.sheets)`
- Comments tools need `drive` client for `drive.comments.*` — `registerDocsTools` should receive full `DriveClient` or at least `{ docs, drive }`
- New files: `src/tools/docs-*.ts` (6 files) + `src/tools/sheets-*.ts` (4 files)

</code_context>

<deferred>
## Deferred Ideas

- Rich text formatting for Docs (bold, italic, headings) — DOCS-07 in v2
- Find and replace in Docs — DOCS-08 in v2
- Reply to and resolve comments — DOCS-09 in v2
- Anchor comments to specific text ranges — v2 enhancement
- Append rows to Sheets — SHTS-05 in v2
- Add/rename/delete sheet tabs — SHTS-06 in v2
- Cell formatting (colors, alignment, number formats) — SHTS-07 to SHTS-11 in v2

</deferred>

---

*Phase: 03-docs-sheets*
*Context gathered: 2026-03-21*
