# Phase 3: Docs + Sheets Tools — Design Spec

**Date:** 2026-03-21
**Approach:** Port of Phase 2 tool pattern, adapted for Docs API v1 and Sheets API v4
**Status:** Approved

## Overview

Implement 10 tools: 6 for Google Docs (create, read with indices, insert text, delete text range, list comments, add comment) and 4 for Google Sheets (create with initial data, read cell range, update cell range, list sheet tabs). Comments use the Drive API. Sheets writes use `valueInputOption: RAW` to prevent formula injection.

## File Structure

```
src/tools/
├── docs-create.ts              # docs_create
├── docs-create.test.ts
├── docs-read.ts                # docs_read (paragraph extraction + indices)
├── docs-read.test.ts
├── docs-insert-text.ts         # docs_insert_text
├── docs-insert-text.test.ts
├── docs-delete-text.ts         # docs_delete_text
├── docs-delete-text.test.ts
├── docs-list-comments.ts       # docs_list_comments (uses Drive API)
├── docs-list-comments.test.ts
├── docs-add-comment.ts         # docs_add_comment (uses Drive API)
├── docs-add-comment.test.ts
├── sheets-create.ts            # sheets_create
├── sheets-create.test.ts
├── sheets-read.ts              # sheets_read
├── sheets-read.test.ts
├── sheets-update.ts            # sheets_update (RAW mode)
├── sheets-update.test.ts
├── sheets-list.ts              # sheets_list
├── sheets-list.test.ts
```

Modified files:
- `src/tools/register.ts` — add `registerDocsTools(server, client)` and `registerSheetsTools(server, client.sheets)`
- `src/tools/test-helpers.ts` — add `createMockDocs()` and `createMockSheets()` mock factories

## Components

### 1. Docs Tools

#### docs_create (DOCS-01)
- **Name:** `docs_create`
- **Description:** `Create a new Google Doc with optional initial content.`
- **Input:** `{ title: string, content?: string }`
- **Logic:**
  1. `docs.documents.create({ requestBody: { title } })` → get documentId
  2. If content provided: `docs.documents.batchUpdate({ documentId, requests: [{ insertText: { text: content, location: { index: 1 } } }] })`
- **Response:** `{ documentId, title, url }` where url is `https://docs.google.com/document/d/${documentId}/edit`

#### docs_read (DOCS-02)
- **Name:** `docs_read`
- **Description:** `Read a Google Doc's content as plain text with paragraph index information. Use indices for docs_insert_text and docs_delete_text.`
- **Input:** `{ document_id: string }`
- **Logic:**
  1. `docs.documents.get({ documentId })` → get full document
  2. Traverse `body.content[]` array
  3. For each element with `paragraph`: extract `elements[].textRun.content`, record `startIndex`/`endIndex`
  4. Build full text by concatenating all paragraph texts
  5. Build paragraphs array with `{ start, end, text }` for each paragraph
- **Response:** `{ documentId, title, text, length, paragraphs: [{ start, end, text }] }`
- **Note:** Indices are 1-based (matching Docs API convention). `length` is the endIndex of the last element.

#### docs_insert_text (DOCS-03)
- **Name:** `docs_insert_text`
- **Description:** `Insert text at a specific position in a Google Doc. Use docs_read to get current index positions.`
- **Input:** `{ document_id: string, text: string, index: number }` (index is 1-based)
- **API:** `docs.documents.batchUpdate({ documentId, requests: [{ insertText: { text, location: { index } } }] })`
- **Response:** `{ documentId, message: "Inserted N characters at index X" }`

#### docs_delete_text (DOCS-04)
- **Name:** `docs_delete_text`
- **Description:** `Delete a range of text from a Google Doc. Use docs_read to get current index positions.`
- **Input:** `{ document_id: string, start_index: number, end_index: number }` (1-based)
- **API:** `docs.documents.batchUpdate({ documentId, requests: [{ deleteContentRange: { range: { startIndex: start_index, endIndex: end_index, segmentId: '' } } }] })`
- **Response:** `{ documentId, message: "Deleted range X-Y" }`

#### docs_list_comments (DOCS-05)
- **Name:** `docs_list_comments`
- **Description:** `List all comments on a Google Doc.`
- **Input:** `{ document_id: string }`
- **API:** `drive.comments.list({ fileId: document_id, fields: 'comments(id,author(displayName,emailAddress),content,createdTime,resolved)' })`
- **Response:** `{ comments: [{ id, author: { name, email }, content, createdTime, resolved }] }`

#### docs_add_comment (DOCS-06)
- **Name:** `docs_add_comment`
- **Description:** `Add a comment to a Google Doc.`
- **Input:** `{ document_id: string, content: string }`
- **API:** `drive.comments.create({ fileId: document_id, fields: 'id,author(displayName,emailAddress),content,createdTime', requestBody: { content } })`
- **Response:** `{ id, author: { name, email }, content, createdTime }`

### 2. Sheets Tools

#### sheets_create (SHTS-01)
- **Name:** `sheets_create`
- **Description:** `Create a new Google Spreadsheet with optional initial data. Data is a 2D array of strings.`
- **Input:** `{ title: string, data?: string[][] }`
- **Logic:**
  1. `sheets.spreadsheets.create({ requestBody: { properties: { title } } })` → get spreadsheetId
  2. If data provided: `sheets.spreadsheets.values.update({ spreadsheetId, range: 'Sheet1', valueInputOption: 'RAW', requestBody: { values: data } })`
- **Response:** `{ spreadsheetId, title, url, sheets: [{ sheetId, title }] }` where url is `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`

#### sheets_read (SHTS-02)
- **Name:** `sheets_read`
- **Description:** `Read cell values from a spreadsheet range using A1 notation (e.g., "Sheet1!A1:C10").`
- **Input:** `{ spreadsheet_id: string, range: string }`
- **API:** `sheets.spreadsheets.values.get({ spreadsheetId, range })`
- **Response:** `{ range, values: string[][] }`

#### sheets_update (SHTS-03)
- **Name:** `sheets_update`
- **Description:** `Update cell values in a spreadsheet range. Values are written as literal text (formulas are NOT executed).`
- **Input:** `{ spreadsheet_id: string, range: string, values: string[][] }`
- **API:** `sheets.spreadsheets.values.update({ spreadsheetId, range, valueInputOption: 'RAW', requestBody: { values } })`
- **Response:** `{ updatedRange, updatedRows, updatedColumns, updatedCells }`

#### sheets_list (SHTS-04)
- **Name:** `sheets_list`
- **Description:** `List all sheets (tabs) in a spreadsheet.`
- **Input:** `{ spreadsheet_id: string }`
- **API:** `sheets.spreadsheets.get({ spreadsheetId, fields: 'spreadsheetId,properties.title,sheets.properties' })`
- **Response:** `{ spreadsheetId, title, sheets: [{ sheetId, title, index, rowCount, columnCount }] }`

### 3. Registration

**`registerDocsTools(server: McpServer, client: DriveClient): void`**
- Receives full `DriveClient` — uses `client.docs` for Docs API and `client.drive` for comments
- Calls individual register functions for each of 6 Docs tools
- Each tool gets the specific API client it needs (`client.docs` or `client.drive`)

**`registerSheetsTools(server: McpServer, sheets: sheets_v4.Sheets): void`**
- Receives just the Sheets client
- Calls individual register functions for each of 4 Sheets tools

**Updated `register.ts`:**
```
registerDriveSearch(server, client.drive);
// ... existing 11 Drive tools ...
registerDocsTools(server, client);         // NEW — full client for docs + comments
registerSheetsTools(server, client.sheets); // NEW — just sheets
```

### 4. Test Helpers Extension

Add to `src/tools/test-helpers.ts`:

**`createMockDocs(overrides?)`** — mock for `docs_v1.Docs` with:
- `documents.create`, `documents.get`, `documents.batchUpdate`

**`createMockSheets(overrides?)`** — mock for `sheets_v4.Sheets` with:
- `spreadsheets.create`, `spreadsheets.get`, `spreadsheets.values.get`, `spreadsheets.values.update`

Extend existing `createMockDrive` to include `comments.list` and `comments.create` mocks.

## Testing Strategy

Each tool gets a `.test.ts` file using `captureToolHandler`. Key test scenarios:

**docs_read:** Test paragraph extraction from mock `body.content[]` structure. Verify indices are correct.
**docs_create:** Test with and without content. Verify 2 API calls when content provided, 1 when not.
**docs_insert_text/delete_text:** Verify batchUpdate request structure.
**docs_list_comments/add_comment:** Verify Drive API (not Docs API) is called with correct fileId.
**sheets_create:** Test with and without initial data. Verify valueInputOption is RAW.
**sheets_update:** Verify RAW mode prevents formula execution.

## Requirements Coverage

| Requirement | Tool | How |
|-------------|------|-----|
| DOCS-01 | docs_create | documents.create + optional batchUpdate insertText |
| DOCS-02 | docs_read | documents.get → paragraph extraction with indices |
| DOCS-03 | docs_insert_text | batchUpdate insertText at 1-based index |
| DOCS-04 | docs_delete_text | batchUpdate deleteContentRange |
| DOCS-05 | docs_list_comments | drive.comments.list |
| DOCS-06 | docs_add_comment | drive.comments.create |
| SHTS-01 | sheets_create | spreadsheets.create + optional values.update |
| SHTS-02 | sheets_read | spreadsheets.values.get with A1 notation |
| SHTS-03 | sheets_update | spreadsheets.values.update with RAW |
| SHTS-04 | sheets_list | spreadsheets.get sheets.properties |

---

*Phase: 03-docs-sheets*
*Design approved: 2026-03-21*
