# Project Research Summary

**Project:** @franciscpd/drive-mcp-server
**Domain:** Google Drive ecosystem MCP server (Drive + Docs + Sheets + Slides)
**Researched:** 2026-03-20
**Confidence:** HIGH

## Executive Summary

This project is the third server in a companion family (`gmail-mcp-server`, `calendar-mcp-server`, `drive-mcp-server`). The core constraint shaping every decision is that two production siblings already exist and must be matched exactly in structure, tooling, and auth patterns. This is not a green-field project — it is an extension of an established family. Experts building in this space (confirmed by direct inspection of the companion sources) use a single `McpServer` with stdio transport, a single `OAuth2Client` shared across all four Google API clients, one `async-mutex` for token refresh serialization, and one tool file per tool. Following that template is the lowest-risk path and the fastest path to a working server.

The recommended approach is to implement in four sequential service phases following dependencies: auth infrastructure first, then Drive (the foundational file layer), then Docs and Sheets in parallel (both depend on Drive read but not on each other), and finally Slides. Each phase delivers a fully functional slice that can be tested end-to-end with real credentials before the next phase begins. V1 deliberately defers all formatting operations (rich text, cell colors, slide layouts) to keep scope tractable and match the PROJECT.md constraint that formatting is out of scope for v1.

The most critical risks cluster around four areas. First, several Google API behaviors are non-obvious and will silently fail without the right flags: Workspace files require `files.export` not `files.get`, every Drive call needs `supportsAllDrives: true`, and `files.list` needs `corpora: 'allDrives'`. Second, the Docs API uses 1-based indices that shift after every mutation — multi-step batch operations must process in reverse index order. Third, Sheets writes must default to `valueInputOption: 'RAW'` to prevent formula injection. Fourth, the soft-delete pattern (`trashed: true`) is non-negotiable for the delete tool. All 15 identified pitfalls have known prevention strategies documented in PITFALLS.md and should be applied at implementation time, not retrofitted.

---

## Key Findings

### Recommended Stack

The stack is already determined by the companion servers. Every version has been verified against the npm registry (2026-03-20) and confirmed against the gmail/calendar production `package.json` files. There are no open questions about tooling.

The one active decision is whether to use `turndown` for HTML-to-Markdown conversion of Docs exports. Research recommends starting with `text/plain` export from the Drive API and only adding `turndown` if heading structure fidelity becomes necessary. This avoids an extra dependency for v1.

**Core technologies:**
- `@modelcontextprotocol/sdk ^1.27.1`: MCP protocol — `McpServer` + `StdioServerTransport` is the only supported pattern for Claude Desktop
- `googleapis ^171.4.0`: All four Google APIs (Drive v3, Docs v1, Sheets v4, Slides v1) in one package
- `google-auth-library ^10.6.2`: Direct `OAuth2Client` control needed for mutex-wrapping token refresh
- `zod ^4.3.6`: Input schema validation in `server.tool()` calls — use v4, not v3
- `async-mutex ^0.5.0`: Serialize token refresh to prevent race conditions on parallel tool calls
- `typescript ^5.9.3` + `tsup ^8.5.1` + `vitest ^4.1.0`: Exact build/test toolchain from companion servers
- Node.js `>=22`: Native ESM, stable test runner, no polyfills

See STACK.md for full configuration files (tsup, tsconfig, vitest).

### Expected Features

V1 scope is well-defined by PROJECT.md and confirmed by cross-referencing the reference implementation. The 26 tools span four services and are all low-to-medium complexity individually. The feature dependency graph reveals three hard ordering constraints: auth before everything, Drive read before Docs surgical edits, and `getSpreadsheetInfo`/`listSheets` before sheet tab mutations.

**Must have (table stakes — v1):**
- Drive: search, list folder, create folder, upload text, read file (with Workspace export), delete (soft), move, copy, rename, share, list shared drives
- Docs: create, read as text/markdown, insert text at position, delete text range, list comments, add comment
- Sheets: create with initial data, read cell ranges, update cell ranges, list sheets/tabs
- Slides: create presentation, read slide content, add slides, insert text into slides
- Infrastructure: OAuth2 env vars + mutex, startup validation, stderr logging, error categorization, npm package, CI/CD

**Should have (v1.x after validation):**
- Docs: rich text formatting, find/replace, reply/resolve comments
- Sheets: append rows, add/rename/delete tabs
- Slides: delete/duplicate/reorder slides, speaker notes, find/replace, thumbnail export
- Drive: binary file upload/download, full permission CRUD

**Defer (v2+):**
- Docs: tables, image insertion, multi-tab, bullet/list formatting
- Sheets: cell/text/number formatting, conditional formatting, data validation
- Slides: shape/text box creation, layout control, formatting
- Drive: file locking, shortcuts, revision history

See FEATURES.md for the full prioritization matrix and competitor analysis.

### Architecture Approach

Follow the gmail/calendar companion server structure exactly, extended to four API clients. The single-server, multi-service model is correct because all four APIs share one OAuth2 credential set. The key architectural extension beyond the single-API companions is the `DriveClient` interface that bundles `{ auth, drive, docs, sheets, slides }` behind a single creation function, with each tool registration function receiving only the specific client it needs.

**Major components:**
1. `auth/env.ts` + `auth/client.ts` — validates 3 env vars, creates `OAuth2Client` with mutex-wrapped refresh, instantiates all four API clients
2. `server.ts` + `tools/register.ts` — creates `McpServer`, calls service-level registration hubs in order
3. `tools/{drive,docs,sheets,slides}/` — one file per tool, each exporting a single `register*` function that calls `server.tool()` with a Zod schema and a `safeToolHandler`-wrapped handler
4. `utils/errors.ts` + `utils/logger.ts` + `utils/format.ts` — `safeToolHandler` wraps every tool handler; all logging goes to stderr only

Four explicit anti-patterns to avoid (taken from reference project failures): ToolContext indirection, monolithic per-service tool files, lazy/on-demand auth initialization, and global mutable auth state.

See ARCHITECTURE.md for the full component diagram, data flow, and TypeScript patterns.

### Critical Pitfalls

Fifteen pitfalls were identified with prevention strategies. The five most likely to cause hours of lost debugging time:

1. **Workspace files require `files.export`, not `files.get(alt=media)`** — Branch on `mimeType.startsWith('application/vnd.google-apps')` and route to the correct endpoint. Missing this returns a silent 403. Must be in the initial Drive read implementation, not a follow-up.

2. **Docs batchUpdate indices shift after every insert — reverse-order batching is required** — When batching multiple insertions, order requests from highest to lowest index. For full-document replacement, use two separate `batchUpdate` calls (delete pass, then insert pass). Wrong order silently corrupts document content.

3. **`supportsAllDrives: true` required on every Drive API call** — Any `files.*` call without this flag returns 404 for Shared Drive files. Standardize it as a `driveCallDefaults` constant and apply everywhere without exception.

4. **Sheets writes must default to `valueInputOption: 'RAW'`** — `USER_ENTERED` mode executes formulas, enabling `=IMPORTDATA()` injection attacks. Default to `RAW`; document the security implication in tool descriptions.

5. **`drive.files.delete` permanently deletes — use `trashed: true` instead** — Implement delete as `files.update({ requestBody: { trashed: true } })`. Hard delete via `files.delete` is irreversible. The tool description must state the file is moved to trash and is restorable.

Additional pitfalls documented in PITFALLS.md: Docs index-0 reservation, OAuth refresh token persistence, `allDrives` corpus for search, Drive query escaping, cross-drive move limitation, Sheets A1 notation with spaces in sheet names, API rate limiting with path cache, Slides UUID object ID requirement, empty document update guard, and Docs image insertion needing public URLs.

---

## Implications for Roadmap

Based on dependency analysis and pitfall phase mappings, four implementation phases are recommended.

### Phase 1: Project Foundation + Auth

**Rationale:** Auth is a hard dependency for every other phase. The project scaffold (tsconfig, tsup, vitest, package.json, eslint) must exist before any tool code can be written or tested. This phase has no ambiguity — it copies the companion server structure exactly.

**Delivers:** A runnable MCP server that connects to Claude Desktop, validates credentials on startup, logs the authenticated user identity, and exits cleanly on auth failure. No tools yet, but the full infrastructure is in place.

**Addresses:** OAuth2 env vars, startup validation, stderr logging, error categorization infrastructure.

**Avoids:** Pitfall 4 (OAuth refresh token not stored), lazy auth anti-pattern.

**Research flag:** None needed — this phase is a direct copy of the gmail/calendar auth pattern. Skip `/gsd:research-phase`.

### Phase 2: Drive Tools

**Rationale:** Drive is the foundational layer. Docs and Sheets both depend on the Drive read path for Workspace file export. The Drive tools are also the densest with API-specific pitfalls (Shared Drive flags, query escaping, soft delete, path caching) — getting these right early prevents compounding debt.

**Delivers:** 12 Drive tools: `drive_search_files`, `drive_list_folder`, `drive_get_file`, `drive_create_folder`, `drive_upload_file`, `drive_download_file`, `drive_delete_file`, `drive_move_file`, `drive_copy_file`, `drive_rename_file`, `drive_share_file`, `drive_list_shared_drives`.

**Avoids:** Pitfalls 1 (Workspace export), 5 (supportsAllDrives), 6 (allDrives corpus), 7 (query escaping), 9 (cross-drive move), 12 (rate limits + path cache), 15 (soft delete).

**Research flag:** None needed — all pitfalls documented, reference implementation available.

### Phase 3: Docs Tools

**Rationale:** Docs builds on Drive read (Workspace file export is already implemented). The Docs API has the most API-specific complexity (1-based indices, batchUpdate index shifting, empty document guard) — isolating it in its own phase makes it easier to validate. Docs tools are independent of Sheets and Slides, so this phase can proceed without them.

**Delivers:** 6 Docs tools: `docs_create_document`, `docs_get_document`, `docs_insert_text`, `docs_delete_text`, `docs_list_comments`, `docs_add_comment`.

**Avoids:** Pitfalls 2 (batchUpdate index ordering), 3 (index starts at 1), 10 (image insertion needs public URL), 14 (empty document update guard).

**Research flag:** None needed — pitfalls are documented with exact prevention strategies and test cases.

### Phase 4: Sheets Tools

**Rationale:** Sheets tools are independent of Docs and Slides. The formula injection risk (Pitfall 8) and A1 notation quoting (Pitfall 11) must be addressed from day one, not retrofitted. Four tools with clear, low-complexity implementations.

**Delivers:** 4 Sheets tools: `sheets_create_spreadsheet`, `sheets_get_values`, `sheets_update_values`, `sheets_list_sheets`.

**Avoids:** Pitfalls 8 (formula injection via USER_ENTERED), 11 (A1 notation with special characters in sheet names).

**Research flag:** None needed — all patterns are documented.

### Phase 5: Slides Tools

**Rationale:** Slides is last because it is the most self-contained (no dependencies on Docs or Sheets) and has the most Slides-specific API nuances (UUID object IDs, `batchUpdate` for text insertion into placeholders). Placing it last means the team has full familiarity with the `batchUpdate` pattern from Docs before tackling Slides.

**Delivers:** 4 Slides tools: `slides_create_presentation`, `slides_get_presentation`, `slides_add_slide`, `slides_insert_text`.

**Avoids:** Pitfall 13 (Slides UUID object IDs must be caller-supplied and globally unique).

**Research flag:** None needed — reference implementation provides clear patterns.

### Phase 6: Package + CI/CD

**Rationale:** NPM publish and GitHub Actions CI/CD are a known, repeatable pattern from the companion servers. This phase is last so it can be validated against a complete, working server.

**Delivers:** Published `@franciscpd/drive-mcp-server` on npm, GitHub Actions workflow for test + publish on tag push.

**Research flag:** None needed — direct copy of gmail/calendar CI/CD configuration.

### Phase Ordering Rationale

- Auth before everything: all 26 tools require a valid `OAuth2Client` — there is no partial skip possible.
- Drive before Docs: `docs_get_document` internally uses Drive's `files.export` path for Google Workspace MIME types; the export logic is defined in the Drive layer.
- Docs, Sheets, and Slides are mutually independent and could be parallelized by separate engineers, but in a single-engineer context, the serial order (Docs → Sheets → Slides) is recommended because batchUpdate complexity descends in that order.
- CI/CD last: no value in configuring publish automation before there is something to publish.

### Research Flags

Phases with well-documented patterns (skip `/gsd:research-phase`):
- **Phase 1 (Auth):** Direct copy of gmail/calendar auth module. No unknowns.
- **Phase 2 (Drive):** All 15 pitfalls documented with prevention strategies.
- **Phase 3 (Docs):** batchUpdate semantics fully documented.
- **Phase 4 (Sheets):** Formula injection and A1 quoting fully documented.
- **Phase 5 (Slides):** UUID pattern documented.
- **Phase 6 (CI/CD):** Companion server workflows are available for direct reference.

No phases are flagged as needing deeper research. The research corpus (companion server source + reference implementation + live npm registry queries) is sufficient to proceed directly to implementation planning.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified from live npm registry on 2026-03-20 and cross-checked against two companion server production `package.json` files |
| Features | HIGH | Derived from direct code analysis of the reference implementation (100+ tool definitions) and cross-referenced against PROJECT.md requirements |
| Architecture | HIGH | Companion gmail/calendar server source inspected directly; patterns are proven in production |
| Pitfalls | HIGH | 15 pitfalls identified from reference implementation code, Google API documentation, and companion error patterns; each has a specific prevention strategy |

**Overall confidence:** HIGH

### Gaps to Address

Three areas were intentionally left as v1.x or v2+ scope and will need targeted research when the time comes:

- **Binary file upload/download (Drive v1.x):** The reference implementation handles this, but MIME type auto-detection and large-file streaming semantics need validation against Node.js 22 stream APIs before implementation.
- **Docs rich text formatting (v1.x):** `applyTextStyle` and `applyParagraphStyle` in the Docs API require understanding of the `textStyle` and `paragraphStyle` object shapes — the reference implementation has working code but the schemas are complex. Requires targeted research before the v1.x phase.
- **Turndown adoption decision (open):** The decision to use plain text export vs. HTML + turndown for Docs content is deferred to when the first real agent workflow hits a limitation with plain text. No action needed now.

---

## Sources

### Primary (HIGH confidence)

- `/home/franciscpd/Projects/mcp-server-gmail/src/` — Direct inspection of companion server source: auth pattern, error handling, tool registration structure
- `/home/franciscpd/Projects/mcp-server-calendar/src/` — Direct inspection of companion server source: confirms gmail patterns are consistent across the family
- `/home/franciscpd/Projects/mcp-server-gmail/package.json` + `/home/franciscpd/Projects/mcp-server-calendar/package.json` — Production dependency versions
- `/tmp/google-drive-mcp/src/tools/` — Reference implementation: 100+ tool definitions across drive.ts, docs.ts, sheets.ts, slides.ts
- `/tmp/google-drive-mcp/src/utils.ts` — A1 range parsing, Drive query escaping utilities
- `npm view` (2026-03-20) — Live registry queries confirming all companion-project versions are current latest

### Secondary (MEDIUM confidence)

- Google Drive API v3 documentation (training knowledge) — Shared Drive flags, query syntax, export MIME types
- Google Docs API v1 documentation (training knowledge) — batchUpdate semantics, 1-based indexing, structural paragraph rules
- Google Sheets API v4 documentation (training knowledge) — `valueInputOption` behavior, A1 notation rules
- Google Slides API v1 documentation (training knowledge) — `batchUpdate` object ID requirements

---
*Research completed: 2026-03-20*
*Ready for roadmap: yes*
