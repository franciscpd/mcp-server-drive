# Feature Research

**Domain:** Google Drive ecosystem MCP server (Drive, Docs, Sheets, Slides)
**Researched:** 2026-03-20
**Confidence:** HIGH — derived from direct analysis of reference implementation (piotr-agier/google-drive-mcp), cross-referenced against PROJECT.md requirements

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Drive: search files | Core discovery mechanism; without it the agent is blind | LOW | Drive API query syntax (fullText contains, mimeType, modifiedTime); support rawQuery pass-through for advanced filters |
| Drive: list folder contents | Agents need to navigate structure to find/place files | LOW | Pagination required; default to root if no folder given |
| Drive: create folder | Basic organization primitive; every workflow needs it | LOW | Accept parent folder ID or path |
| Drive: upload text/markdown file | Create plain-text artifacts; simplest write operation | LOW | createTextFile + updateTextFile pair |
| Drive: read file content | Reading is the primary agent use case | LOW | Must export Google Workspace formats (Doc→text, Sheet→csv); handle plain files as-is |
| Drive: delete file/folder | Lifecycle management; trash not permanent delete is fine | LOW | Trash semantics safe; permanent delete is overkill for v1 |
| Drive: move file | Organization; required when creating files then placing them | LOW | Update parents in Drive API |
| Drive: copy file | Template and duplication workflows | LOW | Drive files.copy |
| Drive: rename file | Basic metadata edit | LOW | Drive files.update name |
| Drive: share file / set permissions | Agents share deliverables with humans | MEDIUM | Need listPermissions, addPermission, removePermission, shareFile convenience wrapper |
| Drive: list shared drives | Multi-user orgs use Team Drives; must enumerate them | LOW | Drive drives.list |
| Docs: create Google Doc | First step of any document workflow | LOW | Docs documents.create |
| Docs: read document content | Agents need to consume existing documents | LOW | Emit as plain text or markdown; index information needed for surgical edits |
| Docs: insert text at position | Surgical edit without overwriting whole doc | MEDIUM | insertText at index; must handle 1-based Docs API indices |
| Docs: delete text range | Complement to insert; needed for edit workflows | MEDIUM | deleteContentRange by startIndex/endIndex |
| Docs: list comments | Review workflow; agents answer questions in comments | MEDIUM | Drive files.comments.list; returns author, content, anchoredText |
| Docs: add comment | Agent leaves notes for human review | MEDIUM | Drive files.comments.create; API limitation: anchoring may not be visible in UI |
| Sheets: create spreadsheet | Initial data capture; most common Sheets action | LOW | Sheets spreadsheets.create with initial data |
| Sheets: read cell range | Read back data; needed before any update | LOW | Sheets spreadsheets.values.get; A1 notation |
| Sheets: update cell range | Write data; core Sheets use case | LOW | Sheets spreadsheets.values.update; default RAW mode to avoid formula injection |
| Sheets: list sheets/tabs | Multi-tab spreadsheets are common; must enumerate | LOW | getSpreadsheetInfo + listSheets |
| Slides: create presentation | Initial presentation scaffolding | MEDIUM | Slides presentations.create + batchUpdate to add slides with title/body |
| Slides: read slide content | Agents need to inspect what exists | LOW | Slides presentations.get; return title, content, objectIds |
| Slides: add slides | Append new slides to existing presentations | MEDIUM | batchUpdate createSlide + insertText |
| Slides: insert/update text in slides | Content editing after creation | MEDIUM | batchUpdate insertText into placeholder objectIds |
| Auth: OAuth2 via env vars | Required for headless MCP server operation | LOW | 3 env vars: CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN; async-mutex refresh |
| Auth: startup credential validation | Fail fast with clear error rather than mysterious first-call failure | LOW | Test Drive API call on startup; log authenticated user email |
| Error handling: categorized responses | Agents need to know if error is auth, rate limit, validation, or network | MEDIUM | Map Google API error codes to error categories |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Docs: reply to and resolve comments | Enables full review loop; agent can close feedback cycles | MEDIUM | replyToComment + resolve flag; not in basic servers |
| Docs: rich text formatting (bold, italic, heading, color, link) | Agents produce properly formatted documents, not just raw text | MEDIUM | applyTextStyle + applyParagraphStyle; find by text OR by index |
| Docs: bullet list / numbered list creation | Structured content common in docs; improves readability | MEDIUM | createParagraphBullets with preset enum |
| Docs: table insert and cell edit | Structured tabular data inside documents | HIGH | insertTable + editTableCell; requires tracking table start indices |
| Docs: find and replace | Batch edit across entire document | LOW | Uses Docs batchUpdate replaceAllText |
| Docs: multi-tab support | Modern Google Docs have tabs; agent must navigate them | MEDIUM | listDocumentTabs, addDocumentTab, renameDocumentTab, readGoogleDoc tabId param |
| Docs: insert image (URL or local file) | Rich documents with visuals; differentiates from text-only servers | HIGH | insertImageFromUrl (public URL) + insertLocalImage (upload then insert); makePublic flag needed |
| Sheets: append rows | Incremental data accumulation pattern (log, tracker) | LOW | spreadsheets.values.append; safer than overwrite for logs |
| Sheets: add, rename, delete tabs | Multi-sheet workbooks for complex data | LOW | addSheet, renameSheet, deleteSheet via batchUpdate |
| Sheets: cell / text / number formatting | Production-quality spreadsheets agents can hand off directly | MEDIUM | formatGoogleSheetCells, formatGoogleSheetText, formatGoogleSheetNumbers |
| Sheets: data validation (dropdown, rules) | Structured input sheets for human handoff | MEDIUM | addDataValidation; ONE_OF_LIST for dropdowns |
| Sheets: conditional formatting | Visual data highlighting; dashboards and status sheets | MEDIUM | addGoogleSheetConditionalFormat |
| Slides: delete and duplicate slides | Presentation editing beyond initial creation | LOW | deleteGoogleSlide, duplicateSlide, reorderSlides |
| Slides: speaker notes | Presentation delivery support; notes are separate from slide content | LOW | getGoogleSlidesSpeakerNotes + updateGoogleSlidesSpeakerNotes |
| Slides: find and replace text | Bulk content update across presentation | LOW | replaceAllTextInSlides |
| Slides: thumbnail export | Previews without opening full presentation; useful for verification | LOW | exportSlideThumbnail returns URL |
| Drive: binary file upload (images, PDFs, etc.) | Real-world file management beyond text | MEDIUM | uploadFile with local path; MIME type auto-detection |
| Drive: file download to local path | Materialize Drive files locally for processing | MEDIUM | downloadFile with export format for Workspace files |
| Drive: full permission management | Granular sharing control vs. simple share wrapper | MEDIUM | listPermissions, addPermission, updatePermission, removePermission |
| Drive: file locking / unlocking | Protect deliverables from accidental edits | LOW | contentRestrictions via Drive API; niche but valued |
| Drive: create shortcuts | Cross-reference files across folders without duplication | LOW | Drive files.create with shortcut MIME type |
| Structured logging via stderr | Operational visibility without polluting MCP stdio | LOW | LOG_LEVEL env var; all logs to stderr only |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time change watching / webhooks | "Notify me when file changes" | Requires persistent process + webhook endpoint; incompatible with MCP stdio transport model; Drive Push Notifications have auth/registration complexity | Poll via search with modifiedTime filter when agent needs to detect changes |
| Batch operations across multiple files at once | "Update all 50 files" | Drive API has no true batch mutation; implementing client-side loops hides progress from agent; partial failure is hard to communicate | Agent calls individual tools in a loop; each call succeeds/fails atomically |
| Google Forms integration | "Complete the Drive ecosystem" | Forms API is separate, complex, rarely needed in agent workflows; adds scope + maintenance burden | Out of scope; Forms is a data collection tool, not a content manipulation tool |
| Advanced Slides layout/theme control | "Make it look professional" | Slides layout API requires deep knowledge of pageElement coordinates in EMU units; high complexity for low agent value; agents produce content, humans do design | Basic text/shape operations in v1; defer layout templates to v2 |
| File revision history management | "Roll back a mistake" | Workspace files restore via export/import loses some formatting; creates false confidence in rollback fidelity | Surface revisions as read-only info (getRevisions); warn that restore is lossy for Workspace types |
| PDF conversion (PDFs to Google Docs) | "I uploaded a PDF, edit it" | Drive OCR conversion quality is unpredictable; multi-page PDFs need chunking logic; adds pdf-lib dependency | Acceptable as a bonus feature (reference impl has it) but not a v1 requirement |
| Docker containerization | "Deploy as a container" | MCP servers run as local child processes; Docker adds startup latency and credential-mounting complexity | Ship as npm package only; Docker is opt-in for power users |
| Interactive OAuth browser flow | "No env vars, just log in" | Incompatible with headless MCP server pattern; breaks when server starts without a terminal | Env var pattern matches companion gmail/calendar servers; document how to get refresh token once |
| Google Calendar integration | Already covered | calendar-mcp-server handles this; duplicating it in drive-mcp-server creates two maintenance surfaces for the same functionality | Use @franciscpd/calendar-mcp-server |

## Feature Dependencies

```
Drive: OAuth auth (env vars)
    └──required by──> ALL other features

Drive: search files
    └──enhances──> Drive: list folder (alternative discovery path)

Drive: upload file (binary)
    └──required by──> Docs: insertLocalImage (uploads image then inserts)

Drive: read file content
    └──required by──> Docs: read document content (Workspace format export)

Docs: read document content (with indices)
    └──required by──> Docs: insert text at position (must know current indices)
    └──required by──> Docs: delete text range (must know indices)
    └──required by──> Docs: apply text style (find-by-text needs doc content)
    └──required by──> Docs: insert table (needs index)
    └──required by──> Docs: edit table cell (needs tableStartIndex)
    └──required by──> Docs: add comment (needs startIndex/endIndex)

Docs: list comments
    └──required by──> Docs: reply to comment (needs commentId)
    └──required by──> Docs: delete comment (needs commentId)

Sheets: list sheets/tabs
    └──required by──> Sheets: rename sheet (needs sheetId)
    └──required by──> Sheets: delete sheet (needs sheetId)

Slides: read slide content
    └──required by──> Slides: insert/update text (needs objectId of placeholder)
    └──required by──> Slides: delete/duplicate slide (needs slideObjectId)
    └──required by──> Slides: reorder slides (needs slideObjectIds)
    └──required by──> Slides: speaker notes get/set (needs slide presence)
    └──required by──> Slides: thumbnail export (needs slideObjectId)

Drive: permissions (add/update/remove)
    └──enhances──> Drive: share file (shareFile is a convenience wrapper over addPermission)
```

### Dependency Notes

- **All tools require Auth:** OAuth2 client must be initialized before any Drive/Docs/Sheets/Slides API call. Auth failure is a hard blocker for all downstream tools.
- **Docs surgical edits require read first:** The Docs API uses character indices that shift after every mutation. An agent must always read current content before inserting or deleting by index to get correct positions.
- **Slides shape operations require content read first:** objectIds for placeholders and shapes are only known after reading slide content. The create-then-edit pattern requires two tool calls minimum.
- **Sheets tab operations require getSpreadsheetInfo first:** sheetId (numeric, not the same as sheetTitle) is only returned by spreadsheets.get; rename/delete require it.
- **insertLocalImage requires upload step:** The Docs API only accepts publicly accessible URLs for inline images. Local images must be uploaded to Drive first (optionally made public), then the returned URL is passed to insertInlineImage.

## MVP Definition

### Launch With (v1)

Minimum viable product — matches PROJECT.md Active requirements exactly.

**Drive:**
- [ ] Search files with query syntax — core discovery
- [ ] List folder contents with pagination — navigation
- [ ] Create folder — organization
- [ ] Upload text/markdown file — basic write
- [ ] Read file content (text + Workspace export) — primary read
- [ ] Delete file/folder (trash) — lifecycle
- [ ] Move file between folders — organization
- [ ] Copy file — duplication
- [ ] Rename file — metadata edit
- [ ] Share file (set permissions) — handoff to humans
- [ ] List shared drives — org support

**Docs:**
- [ ] Create new Google Doc
- [ ] Read document content as plain text/markdown
- [ ] Insert text at position (surgical edit)
- [ ] Delete text range
- [ ] List comments
- [ ] Add comment

**Sheets:**
- [ ] Create spreadsheet with initial data
- [ ] Read cell ranges (A1 notation)
- [ ] Update cell ranges
- [ ] List sheets/tabs in a spreadsheet

**Slides:**
- [ ] Create new presentation
- [ ] Read slide content
- [ ] Add new slides
- [ ] Insert text into slides

**Infrastructure:**
- [ ] OAuth2 via 3 env vars with async-mutex refresh
- [ ] Startup credential validation
- [ ] Structured logging via stderr with LOG_LEVEL
- [ ] Error categorization (auth, rate limit, validation, network)
- [ ] NPM package @franciscpd/drive-mcp-server
- [ ] CI/CD: GitHub Actions test + publish

### Add After Validation (v1.x)

Features from reference impl worth adding once core is stable.

- [ ] Docs: rich text formatting (applyTextStyle, applyParagraphStyle) — agents produce properly formatted docs not just text blobs
- [ ] Docs: find and replace — useful for template-filling workflows
- [ ] Docs: reply to and resolve comments — closes the review loop
- [ ] Sheets: append rows — safer incremental write pattern
- [ ] Sheets: add/rename/delete tabs — multi-sheet workbooks
- [ ] Slides: delete, duplicate, reorder slides — full presentation editing
- [ ] Slides: speaker notes — presentation delivery support
- [ ] Drive: binary file upload — real-world file management
- [ ] Drive: file download to local path — materialize files for processing

### Future Consideration (v2+)

- [ ] Docs: table insert and edit — high complexity, niche use
- [ ] Docs: insert image (URL and local) — requires Drive upload sub-step; extra API surface
- [ ] Docs: multi-tab support — modern Docs feature, low current demand
- [ ] Docs: bullet/list formatting — useful but not blocking core workflows
- [ ] Sheets: cell/text/number formatting — cosmetic; deferred per PROJECT.md
- [ ] Sheets: conditional formatting, data validation, borders — advanced formatting; deferred per PROJECT.md
- [ ] Slides: shape creation, text box creation, formatting — layout control; deferred per PROJECT.md
- [ ] Drive: file locking — niche; low demand
- [ ] Drive: shortcuts — niche organizational feature

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Auth (OAuth2 env vars + mutex) | HIGH | LOW | P1 |
| Drive: search | HIGH | LOW | P1 |
| Drive: list folder | HIGH | LOW | P1 |
| Drive: read file content | HIGH | LOW | P1 |
| Docs: create + read | HIGH | LOW | P1 |
| Docs: insert + delete text | HIGH | MEDIUM | P1 |
| Sheets: create + read + update | HIGH | LOW | P1 |
| Slides: create + read | HIGH | MEDIUM | P1 |
| Drive: create folder | HIGH | LOW | P1 |
| Drive: upload text file | HIGH | LOW | P1 |
| Drive: move/copy/rename/delete | MEDIUM | LOW | P1 |
| Drive: share file | MEDIUM | MEDIUM | P1 |
| Docs: list + add comments | MEDIUM | MEDIUM | P1 |
| Sheets: list sheets | MEDIUM | LOW | P1 |
| Slides: add slides + insert text | MEDIUM | MEDIUM | P1 |
| Error categorization | HIGH | LOW | P1 |
| Startup validation | MEDIUM | LOW | P1 |
| Structured logging | MEDIUM | LOW | P1 |
| Docs: formatting (text/paragraph) | MEDIUM | MEDIUM | P2 |
| Docs: find and replace | MEDIUM | LOW | P2 |
| Docs: reply/resolve comments | MEDIUM | MEDIUM | P2 |
| Sheets: append rows | MEDIUM | LOW | P2 |
| Sheets: add/rename/delete tabs | MEDIUM | LOW | P2 |
| Slides: delete/duplicate/reorder | LOW | LOW | P2 |
| Slides: speaker notes | LOW | LOW | P2 |
| Drive: binary upload/download | MEDIUM | MEDIUM | P2 |
| Drive: full permission management | LOW | MEDIUM | P2 |
| Docs: tables | LOW | HIGH | P3 |
| Docs: images | LOW | HIGH | P3 |
| Docs: multi-tab | LOW | MEDIUM | P3 |
| Docs: bullet lists | LOW | MEDIUM | P3 |
| Sheets: formatting (cells/text/numbers) | LOW | MEDIUM | P3 |
| Sheets: conditional format / validation | LOW | MEDIUM | P3 |
| Slides: shapes / text boxes / formatting | LOW | HIGH | P3 |
| Drive: locking / shortcuts | LOW | LOW | P3 |
| Drive: revisions | LOW | MEDIUM | P3 |

## Competitor Feature Analysis

The reference project piotr-agier/google-drive-mcp represents the most complete open-source implementation in this space.

| Feature Area | piotr-agier/google-drive-mcp | @franciscpd/drive-mcp-server (planned v1) |
|---|---|---|
| Drive CRUD | Full (search, list, create, upload, download, move, copy, rename, delete) | Full match — all in scope |
| Drive permissions | Full (list, add, update, remove, share convenience wrapper) | Share only in v1; full CRUD in v1.x |
| Drive binary upload | Yes (images, audio, video, PDF via local path) | v1.x |
| Drive file download | Yes (with export format) | v1.x |
| Drive locking | Yes | v3+ |
| Drive shortcuts | Yes | v3+ |
| Drive revisions | Yes (list + restore) | Out of scope v1 |
| Docs read | Yes (text, json, markdown, multi-tab) | text/markdown in v1; multi-tab in v2+ |
| Docs surgical edit | Yes (insertText, deleteRange) | Full in v1 |
| Docs rich formatting | Yes (text style, paragraph style, bullets) | v1.x |
| Docs tables | Yes (insert, edit cell) | v2+ |
| Docs images | Yes (URL + local file) | v2+ |
| Docs comments | Yes (list, get, add, reply, resolve, delete) | list + add in v1; reply/resolve in v1.x |
| Docs find+replace | Yes | v1.x |
| Docs tabs | Yes (list, add, rename) | v2+ |
| Sheets CRUD | Yes (create, read, update, append) | create + read + update in v1; append in v1.x |
| Sheets tab management | Yes (add, rename, delete, list) | list in v1; add/rename/delete in v1.x |
| Sheets formatting | Yes (cells, text, numbers, borders) | Deferred (v2+, per PROJECT.md) |
| Sheets data validation | Yes | Deferred (v2+) |
| Sheets conditional format | Yes | Deferred (v2+) |
| Slides CRUD | Yes (create, read, update) | Full in v1 |
| Slides slide management | Yes (add, delete, duplicate, reorder) | add in v1; delete/duplicate/reorder in v1.x |
| Slides speaker notes | Yes | v1.x |
| Slides formatting | Yes (text, paragraph, shape, background) | Deferred (v2+, per PROJECT.md) |
| Slides find+replace | Yes | v1.x |
| Slides thumbnail export | Yes | v1.x |
| Auth | File-based OAuth (browser flow, tokens.json) | Env var OAuth (no browser flow) — different model |
| Package | @piotr-agier/google-drive-mcp | @franciscpd/drive-mcp-server |

**Key differentiation of this project vs. reference:** Env-var-only auth (no browser flow, no token file) matches the companion gmail/calendar server pattern and is better suited for headless deployment in MCP client configs. The reference project uses a local OAuth file which is more convenient for personal use but harder to configure in automated setups.

## Sources

- Direct code analysis: `/tmp/google-drive-mcp/src/tools/drive.ts` — 30+ tool definitions
- Direct code analysis: `/tmp/google-drive-mcp/src/tools/docs.ts` — 25+ tool definitions
- Direct code analysis: `/tmp/google-drive-mcp/src/tools/sheets.ts` — 18+ tool definitions
- Direct code analysis: `/tmp/google-drive-mcp/src/tools/slides.ts` — 15+ tool definitions
- Reference README: `/tmp/google-drive-mcp/README.md`
- Project requirements: `/home/franciscpd/Projects/mcp-server-drive/.planning/PROJECT.md`

---
*Feature research for: Google Drive ecosystem MCP server*
*Researched: 2026-03-20*
