# Phase 1: Foundation - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

A runnable MCP server connects to Claude Desktop via StdioServerTransport, validates Google credentials on startup, and is ready to register tools. Initializes all four Google API clients (Drive v3, Docs v1, Sheets v4, Slides v1). Includes structured logging, error categorization, and graceful shutdown. No tools are implemented in this phase.

</domain>

<decisions>
## Implementation Decisions

### Credential validation
- **D-01:** Validate credentials at startup via `drive.about.get({ fields: 'user' })` — confirms OAuth2 works and logs the authenticated user's email address
- **D-02:** Secondary APIs (Docs, Sheets, Slides) are NOT tested at startup — if a secondary API is not enabled in the Google Cloud project, a warning is logged when a tool from that API is first called, but the server continues running normally

### Client interface
- **D-03:** Flat interface `DriveClient { drive, docs, sheets, slides, auth }` — all 4 API clients + OAuth2Client exposed at the same level, no nesting
- **D-04:** `registerTools(server, client)` receives the full `DriveClient` object and distributes each API to domain-specific sub-registrars: `registerDriveTools(server, client.drive)`, `registerDocsTools(server, client.docs)`, etc.

### Error categories
- **D-05:** Start with Calendar server categories (AUTH, FORBIDDEN, RATE_LIMIT, BAD_REQUEST, NOT_FOUND, VALIDATION, NETWORK) and add two Drive-specific categories: CONFLICT (HTTP 409 — file name collision or edit conflict) and QUOTA (storage quota exceeded)
- **D-06:** FORBIDDEN message is generic: "Insufficient permissions. Ensure the required Google API is enabled and correct OAuth scopes are granted." — no per-API scope detection
- **D-07:** Include `sanitizeMessage()` from Calendar pattern — redacts OAuth tokens (`ya29.*`, `1//*`) and truncates long messages to 200 chars

### Claude's Discretion
- Exact file structure within `src/` (expected to follow gmail/calendar patterns: `src/auth/`, `src/tools/`, `src/utils/`)
- Logger prefix string and format (expected: `[drive-mcp]`)
- Graceful shutdown signal handling implementation
- `package.json` metadata (keywords, repository URL, etc.)
- Test helper structure and mock factory patterns
- Build/config files (tsup, tsconfig, vitest — copy from Calendar server with Drive adaptations)

</decisions>

<specifics>
## Specific Ideas

- Follow the Calendar server patterns preferentially over Gmail where they differ (Calendar has better error messages, graceful shutdown, vitest coverage config, and gitignore)
- Use `createRequire(import.meta.url)` to load package.json version at runtime (established pattern)
- Env var prefix: `GOOGLE_DRIVE_*` (GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN)

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auth pattern
- `/home/franciscpd/Projects/mcp-server-calendar/src/auth/client.ts` — Mutex-wrapped OAuth2Client, credential validation, CredentialValidationError class
- `/home/franciscpd/Projects/mcp-server-calendar/src/auth/env.ts` — Env var validation pattern with multi-line error message

### Error handling
- `/home/franciscpd/Projects/mcp-server-calendar/src/utils/errors.ts` — ErrorCategory, sanitizeMessage, categorizeError with GaxiosErrorLike typing, safeToolHandler wrapper

### Server structure
- `/home/franciscpd/Projects/mcp-server-calendar/src/index.ts` — Entry point with graceful shutdown (SIGINT/SIGTERM)
- `/home/franciscpd/Projects/mcp-server-calendar/src/server.ts` — Server factory with createRequire for version
- `/home/franciscpd/Projects/mcp-server-calendar/src/tools/register.ts` — Tool registration hub pattern

### Build/config
- `/home/franciscpd/Projects/mcp-server-calendar/tsup.config.ts` — ESM build with shebang banner
- `/home/franciscpd/Projects/mcp-server-calendar/tsconfig.json` — Strict mode, ES2024, bundler resolution
- `/home/franciscpd/Projects/mcp-server-calendar/vitest.config.ts` — globals: true, v8 coverage
- `/home/franciscpd/Projects/mcp-server-calendar/package.json` — Scripts, deps, engines, bin config

### Logging
- `/home/franciscpd/Projects/mcp-server-calendar/src/utils/logger.ts` — stderr logger with LOG_LEVEL, timestamp, branded prefix

### Testing
- `/home/franciscpd/Projects/mcp-server-gmail/src/test-helpers.ts` — captureToolHandler pattern, mock factory functions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No existing code in this project — greenfield Phase 1

### Established Patterns
- Calendar server is the **preferred reference** (newer, more complete error handling, graceful shutdown, better vitest config)
- Gmail server provides the `captureToolHandler` test pattern and `turndown` usage (needed later for Docs export)
- All companion projects use identical: tsup config, tsconfig, package.json scripts structure

### Integration Points
- `src/index.ts` → `src/auth/env.ts` (validate env) → `src/auth/client.ts` (create client) → `src/server.ts` (create MCP server) → stdio transport
- `src/auth/client.ts` must initialize all 4 Google API clients using same `auth` instance
- `src/tools/register.ts` will be the hub — empty in Phase 1, populated in Phases 2-4

</code_context>

<deferred>
## Deferred Ideas

- `turndown` dependency for HTML→Markdown conversion — needed in Phase 3 for Docs content export, not Phase 1
- Format utilities (`src/utils/format.ts`) — will emerge in Phase 2 when Drive tools need response formatting

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-21*
