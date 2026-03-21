# Stack Research

**Domain:** Google Drive MCP Server (Drive + Docs + Sheets + Slides APIs)
**Researched:** 2026-03-20
**Confidence:** HIGH — all versions verified against npm registry and confirmed against two production companion projects

---

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

Note: `turndown` is only needed if we export Docs as HTML and convert to markdown. The Drive API `files.export` endpoint can export Google Docs as `text/plain` or `text/html`. If we export as plain text, we skip `turndown`. Recommend starting with plain text export and adding `turndown` only when markdown fidelity is needed (e.g., preserving heading structure).

### Development Tools

| Tool | Version | Purpose | Configuration |
|------|---------|---------|---------------|
| `tsup` | `^8.5.1` | Build bundler | Single entry `src/index.ts`, ESM output, `es2024` target, no DTS, `#!/usr/bin/env node` banner. See tsup config pattern below. |
| `vitest` | `^4.1.0` | Test runner | `globals: true`, v8 coverage provider. Tests co-located with source as `*.test.ts`. |
| `@vitest/coverage-v8` | `^4.1.0` | Coverage reporting | `text` + `lcov` reporters. Must match `vitest` version exactly. |
| `typescript` | `^5.9.3` | TypeScript compiler | Dev-only — tsup handles compilation for build. Used directly only for `tsc --noEmit` type checking. |
| `@types/node` | `^25.5.0` | Node.js type definitions | Must be `>=25` for Node.js 22 API coverage. |

---

## Installation

```bash
# Core dependencies
npm install @modelcontextprotocol/sdk googleapis google-auth-library zod async-mutex

# Dev dependencies
npm install -D typescript tsup vitest @vitest/coverage-v8 @types/node
```

Add `turndown` only if HTML-to-markdown conversion is needed for Docs export:

```bash
npm install turndown
npm install -D @types/turndown
```

---

## Project Configuration

### tsup.config.ts (exact pattern from companion projects)

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'es2024',
  dts: false,
  clean: true,
  sourcemap: false,
  banner: { js: '#!/usr/bin/env node' },
});
```

### tsconfig.json (exact pattern from companion projects)

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": false,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### vitest.config.ts (exact pattern from companion projects)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
});
```

### package.json scripts (exact pattern from companion projects)

```json
{
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "prepublishOnly": "npm run build && npm test"
  },
  "engines": { "node": ">=22" },
  "type": "module"
}
```

---

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

---

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

---

## Google API Surface

The four APIs this server needs, all from `googleapis`:

| API | Module | Version | OAuth Scope |
|-----|--------|---------|-------------|
| Drive | `drive_v3` | v3 | `https://www.googleapis.com/auth/drive` |
| Docs | `docs_v1` | v1 | `https://www.googleapis.com/auth/documents` |
| Sheets | `sheets_v4` | v4 | `https://www.googleapis.com/auth/spreadsheets` |
| Slides | `slides_v1` | v1 | `https://www.googleapis.com/auth/presentations` |

All four can share a single `OAuth2Client` instance. The `drive` scope is the broadest — it covers file metadata and binary content. The `documents`, `spreadsheets`, and `presentations` scopes cover structured content read/write for their respective formats.

```typescript
// Single auth client, four API instances — confirmed pattern from googleapis package
const auth = new OAuth2Client(clientId, clientSecret);
auth.setCredentials({ refresh_token: refreshToken });

const drive = google.drive({ version: 'v3', auth });
const docs = google.docs({ version: 'v1', auth });
const sheets = google.sheets({ version: 'v4', auth });
const slides = google.slides({ version: 'v1', auth });
```

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@modelcontextprotocol/sdk@1.27.1` | `zod@4.3.6` | SDK accepts zod v4 schemas in `server.tool()` calls — confirmed by calendar server in production |
| `typescript@5.9.3` | `@types/node@25.5.0` | Node 22 types require `@types/node >=22`; `^25.5.0` is current and compatible |
| `googleapis@171.4.0` | `google-auth-library@10.6.2` | Same minor versions used in gmail/calendar — confirmed working |
| `vitest@4.1.0` | `@vitest/coverage-v8@4.1.0` | Must be same version to avoid incompatibility at coverage report time |
| `tsup@8.5.1` | `typescript@5.9.3` | tsup bundles via esbuild internally; TypeScript is used only for type-checking, not compilation |

---

## Sources

- `/home/franciscpd/Projects/mcp-server-gmail/package.json` — Gmail server production deps (HIGH confidence, verified from disk)
- `/home/franciscpd/Projects/mcp-server-calendar/package.json` — Calendar server production deps (HIGH confidence, verified from disk)
- `/tmp/google-drive-mcp/package.json` — Reference project deps (HIGH confidence, verified from disk)
- `npm view` — Live registry queries for all packages, confirmed all companion-project versions are current latest (2026-03-20)
- `tsup.config.ts`, `tsconfig.json`, `vitest.config.ts` from gmail server — Exact configuration patterns (HIGH confidence, verified from disk)
- `src/auth/client.ts`, `src/auth/env.ts`, `src/utils/errors.ts`, `src/utils/logger.ts` from gmail server — Auth pattern, error handling, logging patterns (HIGH confidence, verified from disk)

---

*Stack research for: Google Drive MCP Server*
*Researched: 2026-03-20*
