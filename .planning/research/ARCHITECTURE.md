# Architecture Patterns

**Domain:** Multi-service Google Drive MCP Server (Drive + Docs + Sheets + Slides)
**Researched:** 2026-03-20

---

## Recommended Architecture

Follow the companion gmail/calendar server structure exactly, extended to four API clients.
The single-server, multi-service model is the right call given all four services share one
OAuth2 credential set and the same auth scopes.

```
src/
  index.ts          Entry: validateEnv → createDriveClient → validateCredentials → createServer → connect stdio
  server.ts         McpServer factory: creates server, calls registerTools(server, clients)
  auth/
    env.ts          Validates GOOGLE_DRIVE_CLIENT_ID / _CLIENT_SECRET / _REFRESH_TOKEN
    client.ts       OAuth2Client + mutex refresh + four API client instances
  tools/
    register.ts     Hub: calls registerDriveTools, registerDocsTools, etc.
    drive/
      index.ts      Re-exports all Drive register functions (convenience)
      search.ts     drive_search_files
      list.ts       drive_list_folder
      get.ts        drive_get_file
      create-folder.ts  drive_create_folder
      upload.ts     drive_upload_file
      download.ts   drive_download_file
      delete.ts     drive_delete_file
      move.ts       drive_move_file
      copy.ts       drive_copy_file
      rename.ts     drive_rename_file
      share.ts      drive_share_file
      list-drives.ts  drive_list_shared_drives
    docs/
      index.ts
      create.ts     docs_create_document
      get.ts        docs_get_document
      insert-text.ts  docs_insert_text
      delete-text.ts  docs_delete_text
      list-comments.ts  docs_list_comments
      add-comment.ts  docs_add_comment
    sheets/
      index.ts
      create.ts     sheets_create_spreadsheet
      get-values.ts   sheets_get_values
      update-values.ts  sheets_update_values
      list-sheets.ts  sheets_list_sheets
    slides/
      index.ts
      create.ts     slides_create_presentation
      get.ts        slides_get_presentation
      add-slide.ts  slides_add_slide
      insert-text.ts  slides_insert_text
  utils/
    errors.ts       Error categorization + safeToolHandler + toolError (matches gmail)
    logger.ts       Stderr structured logger with LOG_LEVEL (matches gmail)
    format.ts       Shared response formatting helpers
    validation.ts   Input validators shared across services
```

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `auth/env.ts` | Validates 3 env vars, returns typed `DriveCredentials` | `index.ts` |
| `auth/client.ts` | Creates OAuth2Client with mutex refresh; instantiates drive, docs, sheets, slides API clients | `index.ts`, `server.ts` |
| `server.ts` | Creates `McpServer`, calls `registerTools` with all four clients | `index.ts` |
| `tools/register.ts` | Calls each service's registration hub in order | `server.ts` |
| `tools/drive/*.ts` | Registers individual Drive tools against `McpServer` | `tools/register.ts` |
| `tools/docs/*.ts` | Registers individual Docs tools against `McpServer` | `tools/register.ts` |
| `tools/sheets/*.ts` | Registers individual Sheets tools against `McpServer` | `tools/register.ts` |
| `tools/slides/*.ts` | Registers individual Slides tools against `McpServer` | `tools/register.ts` |
| `utils/errors.ts` | `safeToolHandler` wraps every tool handler; categorizes API errors | All tool files |
| `utils/logger.ts` | Stderr-only structured logging, LOG_LEVEL gated | All modules |

---

## Auth Pattern: Single OAuth2 Client, Four API Instances

The Gmail and Calendar servers each have one API client. This server has four but they all
share **one** `OAuth2Client` and **one** mutex. This is the correct design because:

- All four Google APIs accept the same `OAuth2Client` for auth
- A single shared `refreshMutex` prevents concurrent token refresh races regardless of
  which API triggers the refresh
- There is no need for four separate mutexes

```typescript
// auth/client.ts
export interface DriveClient {
  auth:    OAuth2Client;
  drive:   drive_v3.Drive;
  docs:    docs_v1.Docs;
  sheets:  sheets_v4.Sheets;
  slides:  slides_v1.Slides;
}

export function createDriveClient(credentials: DriveCredentials): DriveClient {
  const auth = new OAuth2Client(credentials.clientId, credentials.clientSecret);
  auth.setCredentials({ refresh_token: credentials.refreshToken });

  const originalRefresh = auth.refreshAccessToken.bind(auth);
  auth.refreshAccessToken = () => refreshMutex.runExclusive(() => originalRefresh());

  auth.on('tokens', () => logger.debug('Access token refreshed'));

  return {
    auth,
    drive:  google.drive({ version: 'v3', auth }),
    docs:   google.docs({ version: 'v1', auth }),
    sheets: google.sheets({ version: 'v4', auth }),
    slides: google.slides({ version: 'v1', auth }),
  };
}
```

Credential validation at startup should use `drive.files.list` (minimal fetch) to confirm
the auth token is valid and log the authenticated user identity.

---

## Tool Registration Pattern

The register hub signature expands from the single-API companion servers to pass all four
clients:

```typescript
// tools/register.ts
export function registerTools(server: McpServer, clients: DriveClient): void {
  registerDriveTools(server, clients.drive);
  registerDocsTools(server, clients.docs);
  registerSheetsTools(server, clients.sheets);
  registerSlidesTools(server, clients.slides);
}
```

Each service sub-hub (`registerDriveTools` etc.) lives in `tools/drive/index.ts` and calls
each individual tool's register function, mirroring exactly how the gmail register.ts works.

Each individual tool file exports a single `register*` function:

```typescript
// tools/drive/search.ts
export function registerDriveSearchFiles(server: McpServer, drive: drive_v3.Drive): void {
  server.tool(
    'drive_search_files',
    'Search files in Google Drive using query syntax ...',
    { query: z.string(), ... },
    (params) => safeToolHandler(async () => { ... }),
  );
}
```

---

## Tool Naming Conventions

Tools follow `{service}_{verb}_{noun}` naming. All names match the requirements in PROJECT.md:

| Service | Prefix | Example Tools |
|---------|--------|--------------|
| Drive API v3 | `drive_` | `drive_search_files`, `drive_list_folder`, `drive_get_file`, `drive_create_folder`, `drive_upload_file`, `drive_download_file`, `drive_delete_file`, `drive_move_file`, `drive_copy_file`, `drive_rename_file`, `drive_share_file`, `drive_list_shared_drives` |
| Docs API v1 | `docs_` | `docs_create_document`, `docs_get_document`, `docs_insert_text`, `docs_delete_text`, `docs_list_comments`, `docs_add_comment` |
| Sheets API v4 | `sheets_` | `sheets_create_spreadsheet`, `sheets_get_values`, `sheets_update_values`, `sheets_list_sheets` |
| Slides API v1 | `slides_` | `slides_create_presentation`, `slides_get_presentation`, `slides_add_slide`, `slides_insert_text` |

---

## Data Flow

```
MCP Client (Claude Desktop)
  |
  | stdio (StdioServerTransport)
  v
index.ts  ──validates env──>  auth/env.ts
          ──creates client──>  auth/client.ts  ──> OAuth2Client (googleapis)
          ──validates creds──> drive.files.list
          ──creates server──>  server.ts  ──> registerTools  ──> tools/**/*.ts
  |
  | tool call: drive_search_files { query: "..." }
  v
tools/drive/search.ts::registerDriveSearchFiles handler
  └─> safeToolHandler(async () => {
        drive.files.list({ q: params.query, ... })
        return { content: [{ type: "text", text: JSON.stringify(result) }] }
      })
```

---

## Patterns to Follow

### Pattern 1: Per-tool file, single register function export
**What:** Each tool lives in its own file; each file exports exactly one `register*` function.
**When:** Always. This is the proven companion pattern.
**Why:** Maximizes testability (each tool testable in isolation), keeps diffs small, makes
it easy to find the implementation of any tool.

### Pattern 2: safeToolHandler wrapping all tool handlers
**What:** Every tool body is wrapped in `safeToolHandler` from `utils/errors.ts`.
**When:** Always, no exceptions.
**Why:** Centralizes error categorization (401 → auth message, 429 → rate limit message)
and prevents unhandled rejections from crashing the server.

### Pattern 3: Zod schemas declared at module scope
**What:** Input schemas as `z.object(...)` in the `server.tool()` call directly (using the
SDK's native Zod support), not manually constructed JSON Schema.
**When:** Always — the `@modelcontextprotocol/sdk` McpServer accepts Zod schemas natively.
**Example:**
```typescript
server.tool('drive_search_files', 'description', {
  query: z.string().describe('Drive query string'),
  page_size: z.number().min(1).max(100).default(20),
}, (params) => safeToolHandler(async () => { ... }));
```

### Pattern 4: Sub-directory grouping for services with many tools
**What:** Each service gets `tools/{service}/` directory with `index.ts` hub.
**When:** Any service with 4+ tools.
**Why:** Drive has 12 tools, Docs has 6, Sheets has 4, Slides has 4. Flat files/ directory
with 26 tool files would be hard to navigate. Sub-directories mirror logical service
boundaries without adding abstraction overhead.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: ToolContext / context object passed to tools
**What:** The reference project (`/tmp/google-drive-mcp`) threads a `ToolContext` object
through a `handleTool` dispatcher, injecting helpers like `resolvePath`, `getDrive`, and
`log` at call time.
**Why bad:** Adds indirection. Makes each tool's dependencies implicit (hidden in the
context object). Makes unit testing harder because you must construct the full context.
The companion servers pass typed API clients directly — that is sufficient and explicit.
**Instead:** Pass the specific API client (`drive_v3.Drive`, `docs_v1.Docs`, etc.) directly
to each register function. Keep path-resolution helpers in `utils/` and import them
where needed.

### Anti-Pattern 2: Monolithic per-service tool file
**What:** The reference project puts all Drive tools in one 1793-line `tools/drive.ts` file.
**Why bad:** Hard to review diffs, hard to test individual tools, merge conflicts.
**Instead:** One file per tool as in the gmail server.

### Anti-Pattern 3: Lazy / on-demand auth
**What:** The reference project initializes auth lazily on the first tool call.
**Why bad:** Auth failures surface mid-operation rather than at startup. Users get confusing
errors. The companion servers validate credentials eagerly on startup and exit cleanly.
**Instead:** Validate credentials in `main()` before creating the server. Fail fast.

### Anti-Pattern 4: Global mutable auth state
**What:** The reference project uses module-level `let authClient: any = null` with a
`_setAuthClientForTesting` escape hatch.
**Why bad:** Global mutable state complicates testing and is unnecessary with dependency
injection. The gmail/calendar pattern creates the client once and threads it through
function calls.
**Instead:** Create the client in `main()`, pass it to `createServer()`, pass it to
`registerTools()`.

---

## Scalability Considerations

This is a local stdio MCP server — "scalability" means handling large Drive/Docs responses,
not horizontal scale.

| Concern | Approach |
|---------|----------|
| Large file lists | Expose `page_token` / `page_size` params on all list tools; never fetch all pages in a single call |
| Large document content | Truncate with configurable `max_length` param (mirror gmail's `max_body_length` pattern) |
| Sheets with many rows | Return requested range only; require explicit range input |
| Concurrent tool calls | Shared `refreshMutex` serializes token refresh; googleapis handles HTTP concurrency |
| Binary file downloads | Out of scope for v1; Drive `download` returns text content via export API |

---

## Key Trade-offs

### Sub-directory grouping vs flat tools directory

**Chosen:** Sub-directory grouping (`tools/drive/`, `tools/docs/`, etc.)

The project has 26 tools across 4 services. A flat directory would require a naming
convention like `drive-search.ts`, `drive-list.ts`, `docs-create.ts` to avoid collisions.
Sub-directories are cleaner, match natural service boundaries, and the register hub pattern
scales naturally: `registerDriveTools(server, drive)` calls files within `tools/drive/`.

Cost: slightly more `index.ts` files. Benefit: navigability and clear service ownership.

### Single DriveClient interface vs separate clients per service

**Chosen:** Single `DriveClient` interface bundling all four API instances.

This is consistent with how `GmailClient` and `CalendarClient` bundle `{ auth, gmail }` /
`{ auth, calendar }`. The `DriveClient` extends that pattern to `{ auth, drive, docs,
sheets, slides }`. Each tool registration function receives only the client it needs
(`drive_v3.Drive` or `docs_v1.Docs`) — they are never exposed to the full bundle.

---

## Sources

- Gmail companion server source (HIGH confidence — direct inspection):
  `/home/franciscpd/Projects/mcp-server-gmail/src/`
- Calendar companion server source (HIGH confidence — direct inspection):
  `/home/franciscpd/Projects/mcp-server-calendar/src/`
- Reference project patterns (MEDIUM confidence — inspiration, not to copy directly):
  `/tmp/google-drive-mcp/src/`
- PROJECT.md requirements (HIGH confidence — authoritative spec):
  `/home/franciscpd/Projects/mcp-server-drive/.planning/PROJECT.md`
