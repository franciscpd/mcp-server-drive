# Roadmap: MCP Server Drive

## Overview

Build the third server in the franciscpd MCP family: a Google Drive ecosystem server covering Drive, Docs, Sheets, and Slides. The project follows established patterns from the companion gmail and calendar servers exactly. Phases flow from hard infrastructure prerequisites (auth, project scaffold) through the four Google service layers, and conclude with npm packaging and CI/CD automation.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Project scaffold, auth infrastructure, startup validation, logging, and error handling
- [ ] **Phase 2: Drive Tools** - All 12 Drive file management tools covering search, CRUD, sharing, and Shared Drive support
- [ ] **Phase 3: Docs + Sheets Tools** - 6 Docs editing tools and 4 Sheets CRUD tools delivered as one phase
- [ ] **Phase 4: Slides Tools** - 4 Slides tools covering presentation creation, reading, slide addition, and text insertion
- [ ] **Phase 5: Package + CI/CD** - npm publish, GitHub Actions test and release workflows, and README

## Phase Details

### Phase 1: Foundation
**Goal**: A runnable MCP server connects to Claude Desktop, validates Google credentials on startup, and is ready to register tools
**Depends on**: Nothing (first phase)
**Requirements**: FOUN-01, FOUN-02, FOUN-03, FOUN-04, FOUN-05, FOUN-06, FOUN-07
**Success Criteria** (what must be TRUE):
  1. Running `drive-mcp-server` with valid env vars connects to Claude Desktop via stdio and the server appears in the tools list
  2. Starting the server with invalid or missing credentials logs an error to stderr and exits with a non-zero code before accepting any tool calls
  3. Starting with valid credentials logs the authenticated Google account email to stderr at startup
  4. Any tool call that fails due to auth, rate limit, validation, or network error returns a structured error response (not a raw exception) with the error category set
  5. LOG_LEVEL env var controls verbosity — setting LOG_LEVEL=debug produces detailed request logs; default produces only startup and error messages
**Plans**: TBD

### Phase 2: Drive Tools
**Goal**: Claude can manage files and folders in Google Drive — including personal Drive and Shared Drives — through 12 purpose-built tools
**Depends on**: Phase 1
**Requirements**: DRIV-01, DRIV-02, DRIV-03, DRIV-04, DRIV-05, DRIV-06, DRIV-07, DRIV-08, DRIV-09, DRIV-10, DRIV-11, DRIV-12
**Success Criteria** (what must be TRUE):
  1. Claude can search Drive files using Drive query syntax (e.g., `name contains 'report'`) and receive paginated results including files in Shared Drives
  2. Claude can upload a text file to a specified folder, read it back by file ID, move it to another folder, copy it, rename it, and soft-delete it (verify file lands in Trash, not permanently removed)
  3. Claude can create a folder, list its contents, share the folder with an email address at a specified role (reader/writer/commenter), and list available Shared Drives
  4. All Drive tool calls succeed for files in Shared Drives (supportsAllDrives behavior is transparent to the caller)
**Plans**: TBD

### Phase 3: Docs + Sheets Tools
**Goal**: Claude can create, read, and surgically edit Google Docs documents, and create and read/write Google Sheets spreadsheets
**Depends on**: Phase 2
**Requirements**: DOCS-01, DOCS-02, DOCS-03, DOCS-04, DOCS-05, DOCS-06, SHTS-01, SHTS-02, SHTS-03, SHTS-04
**Success Criteria** (what must be TRUE):
  1. Claude can create a new Google Doc with a title and initial content, read its full text back with character index information, insert text at a specific position, and delete a text range — document content matches expected state after each operation
  2. Claude can list and add comments on a Google Doc, with comments visible in the Google Docs UI
  3. Claude can create a new spreadsheet with a title and 2D array of initial data, read a cell range back in A1 notation, update a cell range, and list the sheet tabs — formula strings written with sheets_update_values appear as literal text (not executed formulas)
**Plans**: TBD

### Phase 4: Slides Tools
**Goal**: Claude can create Google Slides presentations, read their content, add new slides, and insert text into slide placeholders
**Depends on**: Phase 3
**Requirements**: SLDS-01, SLDS-02, SLDS-03, SLDS-04
**Success Criteria** (what must be TRUE):
  1. Claude can create a new presentation with a title and read back its slides, including slide titles, body text, and object IDs
  2. Claude can add a new slide to an existing presentation and insert text into a placeholder by object ID — changes are visible in Google Slides UI
**Plans**: TBD

### Phase 5: Package + CI/CD
**Goal**: The server is published as @franciscpd/drive-mcp-server on npm and releases are automated via GitHub Actions
**Depends on**: Phase 4
**Requirements**: PACK-01, PACK-02, PACK-03, PACK-04, PACK-05
**Success Criteria** (what must be TRUE):
  1. `npx @franciscpd/drive-mcp-server` runs the server binary from npm without a local install
  2. Pushing a git tag triggers the GitHub Actions publish workflow and a new version appears on npm within the workflow run
  3. Opening a pull request triggers the CI test workflow and test results are visible on the PR
  4. The README contains working setup instructions, a complete tool reference, and a Claude Desktop config example that a new user can follow without additional research
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/TBD | Not started | - |
| 2. Drive Tools | 0/TBD | Not started | - |
| 3. Docs + Sheets Tools | 0/TBD | Not started | - |
| 4. Slides Tools | 0/TBD | Not started | - |
| 5. Package + CI/CD | 0/TBD | Not started | - |
