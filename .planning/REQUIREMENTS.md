# Requirements: MCP Server Drive

**Defined:** 2026-03-20
**Core Value:** AI agents can seamlessly interact with the full Google Drive ecosystem through a consistent, well-typed MCP interface

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation

- [ ] **FOUN-01**: Server connects via StdioServerTransport and is discoverable by Claude Desktop
- [ ] **FOUN-02**: OAuth2 authentication via 3 env vars (GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN)
- [ ] **FOUN-03**: Token refresh serialized with async-mutex to prevent race conditions
- [ ] **FOUN-04**: Credential validation on startup (test Drive API access, log authenticated user email)
- [ ] **FOUN-05**: Structured logging via stderr with configurable LOG_LEVEL
- [ ] **FOUN-06**: Error categorization (auth, rate_limit, validation, network, not_found, forbidden) with safeToolHandler wrapper
- [ ] **FOUN-07**: All four Google API clients initialized (Drive v3, Docs v1, Sheets v4, Slides v1)

### Drive

- [ ] **DRIV-01**: Search files across Drive with query syntax and pagination
- [ ] **DRIV-02**: List folder contents with pagination (default to root)
- [ ] **DRIV-03**: Create folders with optional parent
- [ ] **DRIV-04**: Upload text files with content and optional parent folder
- [ ] **DRIV-05**: Read/download file content (text files as-is, Workspace files exported to text/csv)
- [ ] **DRIV-06**: Delete files/folders (soft delete via trash, not permanent)
- [ ] **DRIV-07**: Move files between folders
- [ ] **DRIV-08**: Copy files
- [ ] **DRIV-09**: Rename files
- [ ] **DRIV-10**: Share files (add permissions: reader, writer, commenter roles)
- [ ] **DRIV-11**: List shared drives with pagination
- [ ] **DRIV-12**: All Drive API calls include supportsAllDrives: true

### Docs

- [ ] **DOCS-01**: Create new Google Doc with optional title and initial content
- [ ] **DOCS-02**: Read document content as plain text with index information
- [ ] **DOCS-03**: Insert text at specific position (1-based index)
- [ ] **DOCS-04**: Delete text range by start/end index
- [ ] **DOCS-05**: List comments on a document
- [ ] **DOCS-06**: Add comment to a document

### Sheets

- [ ] **SHTS-01**: Create new spreadsheet with title and initial data (2D array)
- [ ] **SHTS-02**: Read cell range values (A1 notation)
- [ ] **SHTS-03**: Update cell range values (default valueInputOption: RAW to prevent formula injection)
- [ ] **SHTS-04**: List sheets/tabs in a spreadsheet

### Slides

- [ ] **SLDS-01**: Create new presentation with title
- [ ] **SLDS-02**: Read presentation content (slides, titles, text, objectIds)
- [ ] **SLDS-03**: Add new slides to existing presentation
- [ ] **SLDS-04**: Insert/update text in slide placeholders

### Package

- [ ] **PACK-01**: Published as @franciscpd/drive-mcp-server on npm
- [ ] **PACK-02**: Binary registered as drive-mcp-server
- [ ] **PACK-03**: GitHub Actions CI workflow (test on push)
- [ ] **PACK-04**: GitHub Actions publish workflow (publish on tag)
- [ ] **PACK-05**: README with setup instructions, tool reference, and usage examples

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Docs Formatting

- **DOCS-07**: Rich text formatting (bold, italic, headings, color, links)
- **DOCS-08**: Find and replace across document
- **DOCS-09**: Reply to and resolve comments
- **DOCS-10**: Bullet/numbered list creation
- **DOCS-11**: Table creation and cell editing
- **DOCS-12**: Image insertion (URL-based)
- **DOCS-13**: Multi-tab document support

### Sheets Formatting

- **SHTS-05**: Append rows to spreadsheet
- **SHTS-06**: Add, rename, delete sheet tabs
- **SHTS-07**: Cell formatting (background color, alignment, wrap)
- **SHTS-08**: Text formatting (bold, italic, font, color)
- **SHTS-09**: Number formatting (currency, percent, date)
- **SHTS-10**: Conditional formatting
- **SHTS-11**: Data validation (dropdowns, rules)

### Slides Enhancements

- **SLDS-05**: Delete, duplicate, reorder slides
- **SLDS-06**: Speaker notes (read/write)
- **SLDS-07**: Find and replace text across presentation
- **SLDS-08**: Thumbnail export
- **SLDS-09**: Shape/text box creation and layout control

### Drive Enhancements

- **DRIV-13**: Binary file upload (images, PDFs, etc.)
- **DRIV-14**: File download to local path
- **DRIV-15**: Full permission CRUD (list, add, update, remove)
- **DRIV-16**: File locking / content restrictions
- **DRIV-17**: Create shortcuts
- **DRIV-18**: File revision history (read-only)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Google Calendar integration | Already covered by @franciscpd/calendar-mcp-server |
| Real-time change watching / webhooks | Incompatible with MCP stdio transport model |
| Batch operations across multiple files | Drive API has no true batch mutation; agent loops are clearer |
| Google Forms integration | Separate API, rarely needed in agent workflows |
| Docker containerization | MCP servers run as local child processes; npm package is sufficient |
| Interactive OAuth browser flow | Incompatible with headless MCP pattern; env vars match companion servers |
| PDF OCR conversion | Unpredictable quality; adds complexity |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUN-01 | Phase 1 | Pending |
| FOUN-02 | Phase 1 | Pending |
| FOUN-03 | Phase 1 | Pending |
| FOUN-04 | Phase 1 | Pending |
| FOUN-05 | Phase 1 | Pending |
| FOUN-06 | Phase 1 | Pending |
| FOUN-07 | Phase 1 | Pending |
| DRIV-01 | Phase 2 | Pending |
| DRIV-02 | Phase 2 | Pending |
| DRIV-03 | Phase 2 | Pending |
| DRIV-04 | Phase 2 | Pending |
| DRIV-05 | Phase 2 | Pending |
| DRIV-06 | Phase 2 | Pending |
| DRIV-07 | Phase 2 | Pending |
| DRIV-08 | Phase 2 | Pending |
| DRIV-09 | Phase 2 | Pending |
| DRIV-10 | Phase 2 | Pending |
| DRIV-11 | Phase 2 | Pending |
| DRIV-12 | Phase 2 | Pending |
| DOCS-01 | Phase 3 | Pending |
| DOCS-02 | Phase 3 | Pending |
| DOCS-03 | Phase 3 | Pending |
| DOCS-04 | Phase 3 | Pending |
| DOCS-05 | Phase 3 | Pending |
| DOCS-06 | Phase 3 | Pending |
| SHTS-01 | Phase 3 | Pending |
| SHTS-02 | Phase 3 | Pending |
| SHTS-03 | Phase 3 | Pending |
| SHTS-04 | Phase 3 | Pending |
| SLDS-01 | Phase 4 | Pending |
| SLDS-02 | Phase 4 | Pending |
| SLDS-03 | Phase 4 | Pending |
| SLDS-04 | Phase 4 | Pending |
| PACK-01 | Phase 5 | Pending |
| PACK-02 | Phase 5 | Pending |
| PACK-03 | Phase 5 | Pending |
| PACK-04 | Phase 5 | Pending |
| PACK-05 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 36 total
- Mapped to phases: 36
- Unmapped: 0

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after roadmap creation (coarse granularity: Docs+Sheets merged into Phase 3, Slides Phase 4, Package Phase 5)*
