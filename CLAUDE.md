# CLAUDE.md

## .planning/ — Single Source of Truth

All planning artifacts MUST go in `.planning/`. Never outside it.

```
.planning/
└── phases/
    └── {N}-{slug}/          ← one folder per GSD phase (e.g. 01-auth)
        ├── DISCUSS.md        ← gsd:discuss output
        ├── BRAINSTORM.md     ← superpowers:brainstorm output
        ├── PLAN.md           ← superpowers:write-plan output
        ├── PROGRESS.md       ← superpowers:execute-plan tracking
        └── VERIFY.md         ← superpowers:requesting-code-review output
```

Before writing any artifact, MUST identify the active GSD phase and resolve its folder: `.planning/phases/{N}-{slug}/`. Create the folder if it does not exist. All Superpowers outputs for that phase go inside it.

---

## Workflow — Follow This Order Exactly

```
gsd:discuss → brainstorm → write-plan → execute-plan → gsd:verify
```

> `$PHASE` = active GSD phase folder, e.g. `.planning/phases/01-auth`

### Phase 1 — discuss
- Trigger: any new feature, task or bug with unclear scope
- MUST capture: requirements, scope, what's out of scope, priority
- MUST save output to `$PHASE/DISCUSS.md`
- MUST NOT proceed without explicit user approval

### Phase 2 — brainstorm
- Trigger: automatically after discuss approval
- MUST invoke `/superpowers:brainstorm` using `$PHASE/DISCUSS.md` or `$PHASE/{N}-CONTEXT.md` as context
- Focus: technical approach, architecture, trade-offs, Laravel patterns
- MUST save output to `$PHASE/BRAINSTORM.md`
- MUST NOT proceed without explicit user approval

### Phase 3 — write-plan
- Trigger: automatically after brainstorm approval
- MUST invoke `/superpowers:write-plan` using `$PHASE/DISCUSS.md` or `$PHASE/{N}-CONTEXT.md` + `$PHASE/BRAINSTORM.md` as input
- Output MUST include: affected files, atomic tasks, verify commands, commit messages
- MUST save output to `$PHASE/PLAN.md`
- MUST NOT proceed without explicit user approval

### Phase 4 — execute-plan
- Trigger: automatically after plan approval
- MUST invoke `/superpowers:execute-plan` using `$PHASE/PLAN.md`
- MUST follow TDD: write failing test → implement → pass (RED → GREEN → REFACTOR)
- MUST track progress in `$PHASE/PROGRESS.md`
- MUST commit atomically per logical task immediately after verify passes

### Phase 5 — verify
- Trigger: automatically after execute-plan completes
- MUST invoke `/superpowers:requesting-code-review`
- MUST run `php artisan test && php artisan pint` — nothing is done without passing evidence
- MUST save output to `$PHASE/VERIFY.md`


## Skip Rules

| Situation | Skip |
|---|---|
| Scope is already clear | Skip discuss, start at brainstorm |
| Approach is already clear | Skip brainstorm, start at write-plan |
| Small well-defined task | Skip discuss + brainstorm, start at write-plan |
| Known bug with clear fix | Use `/superpowers:systematic-debugging` directly |

---

## Commits

```
type(scope): description
```
Types: `feat | fix | refactor | test | docs | style | chore`
One commit per logical task. Never commit broken code.

---

## Rules

- Bugs before features. Max 2–3 WIP tasks.
- Never deploy without explicit approval.
- Never skip phases without a skip rule justifying it.
- Always ask when scope or approach is unclear.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**MCP Server Drive**

A Model Context Protocol (MCP) server that provides secure integration with Google Drive, Docs, Sheets, and Slides. It allows Claude Desktop and other MCP clients to manage files, documents, spreadsheets, and presentations through a standardized interface. Follows the same architecture and patterns established in the companion `@franciscpd/gmail-mcp-server` and `@franciscpd/calendar-mcp-server` projects.

**Core Value:** AI agents can seamlessly interact with the full Google Drive ecosystem — searching files, reading/writing documents, manipulating spreadsheets, and managing presentations — through a consistent, well-typed MCP interface.

### Constraints

- **Tech stack**: TypeScript 5.x, Node.js 22+, ES2024, ESM, `@modelcontextprotocol/sdk`, `googleapis`, `google-auth-library`, `zod`, `async-mutex`
- **Build**: tsup (same config as gmail/calendar servers)
- **Test**: vitest with v8 coverage
- **Auth pattern**: 3 env vars (GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN), OAuth2Client with mutex-wrapped refresh
- **Package naming**: `@franciscpd/drive-mcp-server`, binary `drive-mcp-server`
- **Tool naming**: `drive_*` prefix for Drive tools, `docs_*` for Docs, `sheets_*` for Sheets, `slides_*` for Slides
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TypeScript | `^5.9.3` | Language | Exact version used in gmail/calendar servers. ES2024 target gives native async, `using`, and other modern features. Strict mode enforced. |
| Node.js | `>=22` | Runtime | Native ESM, stable `--test` runner, no polyfills needed. Matches engines constraint of companion projects. |
| `@modelcontextprotocol/sdk` | `^1.27.1` | MCP protocol | Official Anthropic SDK. `McpServer` + `StdioServerTransport` is the only supported pattern for Claude Desktop. `server.tool()` handles registration, schema validation, and response serialization. |
| `googleapis` | `^171.4.0` | Google API client | Official Google TypeScript client. Provides typed wrappers for `drive_v3`, `docs_v1`, `sheets_v4`, `slides_v1` — all needed for this project. Bundles all Google APIs in one package. Latest as of 2026-03-20. |
| `google-auth-library` | `^10.6.2` | OAuth2 | Provides `OAuth2Client` for refresh-token auth flow. Used directly rather than through `googleapis` convenience wrapper because we need direct control over token refresh for mutex wrapping. Latest as of 2026-03-20. |
| `zod` | `^4.3.6` | Schema validation | Used in `server.tool()` call signatures for input schema definition. v4 is current (calendar server already on v4). Do NOT use v3 — reference project uses v3, but our pattern is v4. |
| `async-mutex` | `^0.5.0` | Token refresh serialization | Prevents concurrent OAuth2 token refresh calls. Pattern: mutex-wrap `auth.refreshAccessToken` at client creation time. Without this, parallel tool calls can cause refresh race conditions. |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `turndown` | `^7.2.2` | HTML to Markdown conversion | For Docs content export — Google Docs can be exported as HTML via Drive export endpoint; convert to readable markdown for AI agents. Established in gmail server for email body conversion. |
### Development Tools
| Tool | Version | Purpose | Configuration |
|------|---------|---------|---------------|
| `tsup` | `^8.5.1` | Build bundler | Single entry `src/index.ts`, ESM output, `es2024` target, no DTS, `#!/usr/bin/env node` banner. See tsup config pattern below. |
| `vitest` | `^4.1.0` | Test runner | `globals: true`, v8 coverage provider. Tests co-located with source as `*.test.ts`. |
| `@vitest/coverage-v8` | `^4.1.0` | Coverage reporting | `text` + `lcov` reporters. Must match `vitest` version exactly. |
| `typescript` | `^5.9.3` | TypeScript compiler | Dev-only — tsup handles compilation for build. Used directly only for `tsc --noEmit` type checking. |
| `@types/node` | `^25.5.0` | Node.js type definitions | Must be `>=25` for Node.js 22 API coverage. |
## Installation
# Core dependencies
# Dev dependencies
## Project Configuration
### tsup.config.ts (exact pattern from companion projects)
### tsconfig.json (exact pattern from companion projects)
### vitest.config.ts (exact pattern from companion projects)
### package.json scripts (exact pattern from companion projects)
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `tsup` | `esbuild` (direct) | Only if you need custom esbuild plugins not supported by tsup. Reference project uses raw esbuild, but tsup wraps esbuild with sensible defaults and avoids manual build scripts. |
| `zod v4` | `zod v3` | Never — v3 is legacy. Reference project uses v3 but it's on an older `@modelcontextprotocol/sdk` version. Our sdk `^1.27.1` works with v4. |
| `vitest` | Node.js `--test` runner | Only for projects that cannot add devDependencies. Reference project uses the built-in `node --test`, which requires compiling to JS first. Vitest runs TypeScript directly and is the established pattern in this project family. |
| `async-mutex` | Manual promise-chaining | Never — mutex is cleaner, already a dependency, and explicitly prevents the refresh race condition without coupling refresh calls together. |
| `StdioServerTransport` | HTTP/SSE transport | Only for web-hosted MCP servers. Claude Desktop and all MCP clients in this project family use stdio. |
| Env-var auth (3 vars) | `@google-cloud/local-auth` + express | Only for interactive CLI tools where the user hasn't pre-obtained a refresh token. Reference project uses local-auth + express + open for browser-based OAuth flow. Our pattern assumes a refresh token already exists (matches gmail/calendar servers). |
| Plain text export | `jszip` for OOXML | Only if binary format fidelity is required. Drive API can export Docs/Sheets/Slides as text/csv/plain without any zip parsing. |
| Plain text export | `pdf-lib` | Only if generating or parsing PDFs. Out of scope for v1 — Drive API does not natively produce PDFs from Docs programmatically via the MCP pattern. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@google-cloud/local-auth` | Launches a local HTTP server and browser window for OAuth. Incompatible with MCP stdio transport — the server has no user-facing UI. Requires user interaction. | Direct `OAuth2Client` from `google-auth-library` with refresh token from env vars |
| `express` + `open` | Same reason as `@google-cloud/local-auth` — reference project uses these only for its browser auth flow, which we explicitly reject. Adds >2MB of dependencies for a pattern we do not follow. | `StdioServerTransport` from `@modelcontextprotocol/sdk` |
| `jszip` | Overkill for v1 — needed only if parsing Office XML formats (`.docx`, `.xlsx`). Drive API exports Google Workspace files as plain text/CSV natively, which is sufficient for AI agent use cases. | Drive API `files.export` with `text/plain` or `text/csv` MIME type |
| `pdf-lib` | PDF generation/parsing is not in v1 scope. Significant complexity and bundle size cost. | Defer to v2 if needed |
| `uuid` | Reference project uses it for generating unique IDs. The MCP SDK generates tool call IDs internally. If we need unique IDs (e.g., temp file names), `crypto.randomUUID()` is built into Node.js 22 natively. | `crypto.randomUUID()` (Node.js built-in) |
| `zod v3` | v3 is the legacy major — `zod` v4 is current (released 2025), has smaller bundle, faster parsing, better TypeScript inference. Calendar server already on v4. | `zod ^4.3.6` |
| `punycode` (npm package) | Reference project includes it as a workaround for Node.js deprecation warnings. Node.js 22 has its own `punycode` via `node:punycode` (deprecated but still present). We don't use it directly. | Do not include |
| CommonJS (`"type": "commonjs"`) | All companion projects use `"type": "module"` with ESM. MCP SDK is ESM-first. Mixing would require `.cjs` extensions and breaks `import.meta.url`. | `"type": "module"` + `.js` extensions on all imports |
## Google API Surface
| API | Module | Version | OAuth Scope |
|-----|--------|---------|-------------|
| Drive | `drive_v3` | v3 | `https://www.googleapis.com/auth/drive` |
| Docs | `docs_v1` | v1 | `https://www.googleapis.com/auth/documents` |
| Sheets | `sheets_v4` | v4 | `https://www.googleapis.com/auth/spreadsheets` |
| Slides | `slides_v1` | v1 | `https://www.googleapis.com/auth/presentations` |
## Version Compatibility
| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@modelcontextprotocol/sdk@1.27.1` | `zod@4.3.6` | SDK accepts zod v4 schemas in `server.tool()` calls — confirmed by calendar server in production |
| `typescript@5.9.3` | `@types/node@25.5.0` | Node 22 types require `@types/node >=22`; `^25.5.0` is current and compatible |
| `googleapis@171.4.0` | `google-auth-library@10.6.2` | Same minor versions used in gmail/calendar — confirmed working |
| `vitest@4.1.0` | `@vitest/coverage-v8@4.1.0` | Must be same version to avoid incompatibility at coverage report time |
| `tsup@8.5.1` | `typescript@5.9.3` | tsup bundles via esbuild internally; TypeScript is used only for type-checking, not compilation |
## Sources
- `/home/franciscpd/Projects/mcp-server-gmail/package.json` — Gmail server production deps (HIGH confidence, verified from disk)
- `/home/franciscpd/Projects/mcp-server-calendar/package.json` — Calendar server production deps (HIGH confidence, verified from disk)
- `/tmp/google-drive-mcp/package.json` — Reference project deps (HIGH confidence, verified from disk)
- `npm view` — Live registry queries for all packages, confirmed all companion-project versions are current latest (2026-03-20)
- `tsup.config.ts`, `tsconfig.json`, `vitest.config.ts` from gmail server — Exact configuration patterns (HIGH confidence, verified from disk)
- `src/auth/client.ts`, `src/auth/env.ts`, `src/utils/errors.ts`, `src/utils/logger.ts` from gmail server — Auth pattern, error handling, logging patterns (HIGH confidence, verified from disk)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
