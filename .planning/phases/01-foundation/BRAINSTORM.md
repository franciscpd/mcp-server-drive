# Phase 1: Foundation — Design Spec

**Date:** 2026-03-21
**Approach:** Port direto do Calendar server, adaptado para 4 Google APIs
**Status:** Approved

## Overview

Build the foundation infrastructure for `@franciscpd/drive-mcp-server`: project scaffold, OAuth2 authentication with mutex-wrapped token refresh, credential validation via Drive API, structured logging, error categorization (9 categories including Drive-specific CONFLICT and QUOTA), and graceful shutdown. No tools are implemented — the server starts, validates credentials, logs the authenticated user, and waits for tool calls via stdio.

## File Structure

```
src/
├── index.ts              # Entry point: validate → client → server → stdio
├── server.ts             # McpServer factory, version from package.json
├── auth/
│   ├── client.ts         # OAuth2Client + 4 API clients + mutex + validateCredentials
│   ├── client.test.ts    # Tests: mutex wrapping, credential validation
│   ├── env.ts            # Validates GOOGLE_DRIVE_* env vars
│   └── env.test.ts       # Tests: present/missing vars
├── tools/
│   └── register.ts       # Empty hub — registerTools(server, client) placeholder
└── utils/
    ├── errors.ts         # ErrorCategory + sanitizeMessage + categorizeError + safeToolHandler
    ├── errors.test.ts    # Tests: status→category mapping, token redaction
    ├── logger.ts         # stderr logger with [drive-mcp] prefix and LOG_LEVEL
    └── logger.test.ts    # Tests: log levels, stderr output
```

Root config files (copied from Calendar server with Drive adaptations):
- `package.json` — `@franciscpd/drive-mcp-server`, bin: `drive-mcp-server`
- `tsconfig.json` — ES2024, strict, bundler resolution
- `tsup.config.ts` — ESM, es2024, shebang banner
- `vitest.config.ts` — globals: true, v8 coverage
- `.gitignore` — node_modules, dist, coverage, .env

## Components

### 1. Environment Validation (`src/auth/env.ts`)

**Interface:**
```typescript
interface DriveCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}
```

**Constants:**
```typescript
const REQUIRED_VARS = [
  'GOOGLE_DRIVE_CLIENT_ID',
  'GOOGLE_DRIVE_CLIENT_SECRET',
  'GOOGLE_DRIVE_REFRESH_TOKEN',
] as const;
```

**Functions:**
- `validateEnv(): DriveCredentials` — checks all 3 vars present, throws `EnvValidationError` with multi-line listing if any missing
- `EnvValidationError` — custom error with `missing: string[]` property

### 2. Auth Client (`src/auth/client.ts`)

**Interface:**
```typescript
interface DriveClient {
  drive: drive_v3.Drive;
  docs: docs_v1.Docs;
  sheets: sheets_v4.Sheets;
  slides: slides_v1.Slides;
  auth: OAuth2Client;
}
```

**`createDriveClient(credentials: DriveCredentials): DriveClient`**
1. Create `OAuth2Client(clientId, clientSecret)`
2. Set refresh_token credential
3. Wrap `refreshAccessToken` with `Mutex` from async-mutex (prevents concurrent refresh race conditions)
4. Listen for `tokens` event → `logger.debug('Access token refreshed')`
5. Initialize all 4 API clients: `google.drive({ version: 'v3', auth })`, `google.docs({ version: 'v1', auth })`, `google.sheets({ version: 'v4', auth })`, `google.slides({ version: 'v1', auth })`
6. Return `{ drive, docs, sheets, slides, auth }`

**`validateCredentials(drive: drive_v3.Drive): Promise<string>`**
1. Call `drive.about.get({ fields: 'user' })`
2. Extract `response.data.user?.emailAddress ?? 'unknown'`
3. Log `Authenticated as {email}`
4. Return email
5. On error: throw `CredentialValidationError`

**`CredentialValidationError`** — custom error with descriptive message about checking OAuth2 credentials and Drive API enablement.

### 3. Error Handling (`src/utils/errors.ts`)

**Error Categories:**
```typescript
const ErrorCategory = {
  AUTH: 'Authentication failed. Check your OAuth credentials.',
  FORBIDDEN: 'Insufficient permissions. Ensure the required Google API is enabled and correct OAuth scopes are granted.',
  RATE_LIMIT: 'Drive API rate limit exceeded. Try again in a few seconds.',
  BAD_REQUEST: (detail: string) => `Bad request: ${detail}`,
  NOT_FOUND: (resource: string) => `${resource} not found.`,
  CONFLICT: 'File conflict. The file may have been modified or a name collision occurred.',
  QUOTA: 'Storage quota exceeded. Free up space or upgrade your Google Drive plan.',
  VALIDATION: (detail: string) => `Invalid parameter: ${detail}`,
  NETWORK: 'Failed to connect to Google API. Check your network.',
};
```

**`sanitizeMessage(message: string): string`**
- Redact `ya29.*` access tokens → `[REDACTED]`
- Redact `1//*` refresh tokens → `[REDACTED]`
- Truncate to 200 chars if longer

**`categorizeError(error: Error): string`**
- Uses `GaxiosErrorLike` interface to safely access `response.status` and `response.data.error.message`
- Status mapping: 400→BAD_REQUEST, 401→AUTH, 403→FORBIDDEN, 404→NOT_FOUND, 409→CONFLICT, 429→RATE_LIMIT
- Network codes: ENOTFOUND/ECONNREFUSED→NETWORK
- Quota: status 507 or message containing "quota"→QUOTA
- Fallback: `sanitizeMessage(error.message)`

**`toolError(message: string)`** — returns `{ isError: true, content: [{ type: 'text', text: message }] }`

**`safeToolHandler<T>(fn: () => Promise<T>)`** — try/catch wrapper returning `toolError(categorizeError(error))` on exception

### 4. Logger (`src/utils/logger.ts`)

- Levels: `error(0)`, `warn(1)`, `info(2)`, `debug(3)`
- Default level: `info`
- Configurable via `LOG_LEVEL` env var
- Format: `[drive-mcp] {ISO timestamp} {LEVEL} {message}`
- Output: `process.stderr.write()`
- Export: `logger.error()`, `logger.warn()`, `logger.info()`, `logger.debug()`

### 5. Server Factory (`src/server.ts`)

**`createServer(client: DriveClient): McpServer`**
1. Read version from `package.json` via `createRequire(import.meta.url)`
2. Create `McpServer({ name: 'drive-mcp-server', version })`
3. Call `registerTools(server, client)`
4. Return server

### 6. Tool Registration Hub (`src/tools/register.ts`)

**`registerTools(server: McpServer, client: DriveClient): void`**
- Empty body in Phase 1
- Will be populated in Phases 2-4 with:
  - `registerDriveTools(server, client.drive)` — Phase 2
  - `registerDocsTools(server, client.docs)` — Phase 3
  - `registerSheetsTools(server, client.sheets)` — Phase 3
  - `registerSlidesTools(server, client.slides)` — Phase 4

### 7. Entry Point (`src/index.ts`)

```
async function main():
  1. credentials = validateEnv()
  2. client = createDriveClient(credentials)
  3. await validateCredentials(client.drive)
  4. server = createServer(client)
  5. transport = new StdioServerTransport()
  6. await server.connect(transport)
  7. logger.info('Drive MCP Server running on stdio')
  8. Register SIGINT/SIGTERM → gracefulShutdown(server.close + exit 0)

main().catch(error => logger.error(message) + exit 1)
```

## Data Flow

```
ENV VARS → validateEnv() → DriveCredentials
  → createDriveClient() → DriveClient { drive, docs, sheets, slides, auth }
    → validateCredentials(client.drive) → email (logged)
      → createServer(client) → McpServer (tools registered)
        → StdioServerTransport → server.connect()
          → Running (awaiting tool calls)
```

## Testing Strategy

### `env.test.ts`
- All 3 vars present → returns DriveCredentials with correct values
- One var missing → throws EnvValidationError listing the missing var
- All vars missing → throws EnvValidationError listing all 3

### `client.test.ts`
- `createDriveClient`: verify mutex wrapping by mocking refreshAccessToken and confirming serialized execution
- `validateCredentials` success: mock `drive.about.get` → returns email
- `validateCredentials` failure: mock `drive.about.get` → throws → CredentialValidationError

### `errors.test.ts`
- Each HTTP status code maps to correct category (400→BAD_REQUEST, 401→AUTH, 403→FORBIDDEN, 404→NOT_FOUND, 409→CONFLICT, 429→RATE_LIMIT)
- Network error codes (ENOTFOUND, ECONNREFUSED) map to NETWORK
- Quota detection (507, "quota" in message) maps to QUOTA
- `sanitizeMessage` redacts `ya29.*` tokens
- `sanitizeMessage` redacts `1//*` tokens
- `sanitizeMessage` truncates at 200 chars
- `safeToolHandler` catches error and returns `toolError`
- `safeToolHandler` passes through successful result

### `logger.test.ts`
- Default level (info): info and error visible, debug not
- LOG_LEVEL=debug: debug messages visible
- LOG_LEVEL=error: only error visible
- Output format includes `[drive-mcp]`, timestamp, level, message
- Writes to stderr (not stdout)

## Dependencies

### Production
- `@modelcontextprotocol/sdk` ^1.27.1
- `googleapis` ^171.4.0
- `google-auth-library` ^10.6.2
- `zod` ^4.3.6
- `async-mutex` ^0.5.0

### Development
- `typescript` ^5.9.3
- `tsup` ^8.5.1
- `vitest` ^4.1.0
- `@vitest/coverage-v8` ^4.1.0
- `@types/node` ^25.5.0

## Requirements Coverage

| Requirement | Component | How |
|-------------|-----------|-----|
| FOUN-01 | index.ts + server.ts | StdioServerTransport, McpServer with name/version |
| FOUN-02 | auth/env.ts | 3 env vars validated |
| FOUN-03 | auth/client.ts | Mutex-wrapped refreshAccessToken |
| FOUN-04 | auth/client.ts | validateCredentials via drive.about.get, logs email |
| FOUN-05 | utils/logger.ts | stderr, LOG_LEVEL, structured format |
| FOUN-06 | utils/errors.ts | 9 categories + sanitizeMessage + safeToolHandler |
| FOUN-07 | auth/client.ts | All 4 API clients initialized in createDriveClient |

## Canonical References

Implementation MUST follow these companion files:
- Calendar `src/auth/client.ts` — mutex pattern, validation pattern
- Calendar `src/auth/env.ts` — multi-line error message
- Calendar `src/utils/errors.ts` — categorizeError, sanitizeMessage, GaxiosErrorLike
- Calendar `src/index.ts` — graceful shutdown
- Calendar `src/server.ts` — createRequire version loading
- Gmail `src/test-helpers.ts` — captureToolHandler pattern (adapt for Drive)

---

*Phase: 01-foundation*
*Design approved: 2026-03-21*
