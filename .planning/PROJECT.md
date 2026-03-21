# MCP Server Drive

## What This Is

A Model Context Protocol (MCP) server that provides secure integration with Google Drive, Docs, Sheets, and Slides. It allows Claude Desktop and other MCP clients to manage files, documents, spreadsheets, and presentations through a standardized interface. Follows the same architecture and patterns established in the companion `@franciscpd/gmail-mcp-server` and `@franciscpd/calendar-mcp-server` projects.

## Core Value

AI agents can seamlessly interact with the full Google Drive ecosystem — searching files, reading/writing documents, manipulating spreadsheets, and managing presentations — through a consistent, well-typed MCP interface.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] OAuth2 authentication via env vars (GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN)
- [ ] Credential validation on startup (test API access, log authenticated user)
- [ ] Structured logging via stderr with configurable LOG_LEVEL
- [ ] Error categorization and safe error responses (auth, rate limit, validation, network)
- [ ] Drive: Search files across Drive with query syntax
- [ ] Drive: List folder contents with pagination
- [ ] Drive: Create folders
- [ ] Drive: Upload text files
- [ ] Drive: Download/read file content (text + export Google Workspace formats)
- [ ] Drive: Delete files/folders
- [ ] Drive: Move files between folders
- [ ] Drive: Copy files
- [ ] Drive: Rename files
- [ ] Drive: Share files (set permissions)
- [ ] Drive: List shared drives
- [ ] Docs: Create new Google Docs
- [ ] Docs: Read document content (as plain text/markdown)
- [ ] Docs: Insert text at position
- [ ] Docs: Delete text range
- [ ] Docs: List comments
- [ ] Docs: Add comments
- [ ] Sheets: Create new spreadsheets with initial data
- [ ] Sheets: Read cell ranges
- [ ] Sheets: Update cell ranges
- [ ] Sheets: List sheets (tabs) in a spreadsheet
- [ ] Slides: Create new presentations
- [ ] Slides: Read slide content
- [ ] Slides: Add new slides
- [ ] Slides: Insert text into slides
- [ ] NPM package: `@franciscpd/drive-mcp-server`
- [ ] CI/CD: GitHub Actions for test + publish

### Out of Scope

- Google Calendar integration — already covered by `@franciscpd/calendar-mcp-server`
- Advanced Sheets formatting (borders, colors, number formats) — v2 feature
- Advanced Docs formatting (bold, italic, headings, tables) — v2 feature
- Slides formatting and layout control — v2 feature
- Real-time collaboration / watching for changes
- File revision history management
- Batch operations across multiple files
- Google Forms integration
- Docker containerization

## Context

- Companion to `@franciscpd/gmail-mcp-server` and `@franciscpd/calendar-mcp-server`
- Must follow identical patterns: project structure (`src/auth/`, `src/tools/`, `src/utils/`), auth flow (env vars + OAuth2 + async-mutex), tool registration, error handling, build/test tooling
- Reference project `piotr-agier/google-drive-mcp` provides inspiration for tool scope, especially Drive file management, Docs editing, Sheets CRUD, and Slides basics
- Google APIs required: Drive API v3, Docs API v1, Sheets API v4, Slides API v1
- OAuth2 scopes needed: `drive`, `documents`, `spreadsheets`, `presentations`

## Constraints

- **Tech stack**: TypeScript 5.x, Node.js 22+, ES2024, ESM, `@modelcontextprotocol/sdk`, `googleapis`, `google-auth-library`, `zod`, `async-mutex`
- **Build**: tsup (same config as gmail/calendar servers)
- **Test**: vitest with v8 coverage
- **Auth pattern**: 3 env vars (GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN), OAuth2Client with mutex-wrapped refresh
- **Package naming**: `@franciscpd/drive-mcp-server`, binary `drive-mcp-server`
- **Tool naming**: `drive_*` prefix for Drive tools, `docs_*` for Docs, `sheets_*` for Sheets, `slides_*` for Slides

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Follow gmail/calendar patterns exactly | Consistency across MCP server family, proven architecture | -- Pending |
| Single server for Drive + Docs + Sheets + Slides | All use same Drive API auth scopes, logically grouped as "Drive ecosystem" | -- Pending |
| Exclude Calendar | Already separate server, avoids duplication | -- Pending |
| Env var auth (not local auth server) | Matches existing servers, simpler deployment for MCP clients | -- Pending |
| Skip advanced formatting in v1 | Focus on core CRUD operations, formatting adds significant complexity | -- Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-20 after initialization*
