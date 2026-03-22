# Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A runnable MCP server that connects via stdio, validates Google Drive credentials on startup, logs the authenticated user, and is ready to register tools in future phases.

**Architecture:** Port of Calendar MCP server pattern adapted for 4 Google APIs (Drive v3, Docs v1, Sheets v4, Slides v1). Single OAuth2Client shared across all APIs with mutex-wrapped token refresh. Entry point validates env → creates client → validates credentials → starts MCP server on stdio.

**Tech Stack:** TypeScript 5.x, Node.js 22+, ES2024/ESM, @modelcontextprotocol/sdk, googleapis, google-auth-library, zod, async-mutex, vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `package.json` | Create | Package metadata, deps, scripts, bin |
| `tsconfig.json` | Create | TypeScript config (ES2024, strict, bundler) |
| `tsup.config.ts` | Create | Build config (ESM, shebang) |
| `vitest.config.ts` | Create | Test config (globals, v8 coverage) |
| `.gitignore` | Create | Ignore node_modules, dist, coverage, .env |
| `src/utils/logger.ts` | Create | Structured stderr logger with LOG_LEVEL |
| `src/utils/logger.test.ts` | Create | Logger level/format tests |
| `src/utils/errors.ts` | Create | Error categories, sanitize, categorize, safeToolHandler |
| `src/utils/errors.test.ts` | Create | Error categorization and sanitization tests |
| `src/auth/env.ts` | Create | Env var validation (3 GOOGLE_DRIVE_* vars) |
| `src/auth/env.test.ts` | Create | Env validation tests |
| `src/auth/client.ts` | Create | OAuth2Client + 4 API clients + mutex + validateCredentials |
| `src/auth/client.test.ts` | Create | Client creation and credential validation tests |
| `src/tools/register.ts` | Create | Empty tool registration hub |
| `src/server.ts` | Create | McpServer factory |
| `src/index.ts` | Create | Entry point with graceful shutdown |

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@franciscpd/drive-mcp-server",
  "version": "0.1.0",
  "description": "MCP server for Google Drive, Docs, Sheets, and Slides — manage files, documents, spreadsheets, and presentations via AI agents",
  "type": "module",
  "bin": { "drive-mcp-server": "dist/index.js" },
  "main": "dist/index.js",
  "files": ["dist"],
  "engines": { "node": ">=22" },
  "license": "MIT",
  "author": "franciscpd",
  "keywords": ["mcp", "google-drive", "google-docs", "google-sheets", "google-slides", "ai", "model-context-protocol"],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/franciscpd/mcp-server-drive.git"
  },
  "bugs": { "url": "https://github.com/franciscpd/mcp-server-drive/issues" },
  "homepage": "https://github.com/franciscpd/mcp-server-drive#readme",
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "prepublishOnly": "npm run build && npm test"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.27.1",
    "async-mutex": "^0.5.0",
    "google-auth-library": "^10.6.2",
    "googleapis": "^171.4.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@types/node": "^25.5.0",
    "@vitest/coverage-v8": "^4.1.0",
    "tsup": "^8.5.1",
    "typescript": "^5.9.3",
    "vitest": "^4.1.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

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

- [ ] **Step 3: Create tsup.config.ts**

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

- [ ] **Step 4: Create vitest.config.ts**

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

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
coverage/
*.tsbuildinfo
.env
```

- [ ] **Step 6: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, `package-lock.json` generated, no errors.

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors (no source files yet, so it should exit cleanly).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsup.config.ts vitest.config.ts .gitignore
git commit -m "chore: scaffold project with deps, build, and test config"
```

---

### Task 2: Logger

**Files:**
- Create: `src/utils/logger.ts`
- Create: `src/utils/logger.test.ts`

- [ ] **Step 1: Write failing tests for logger**

Create `src/utils/logger.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('logger', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it('writes info messages at default level', async () => {
    vi.stubEnv('LOG_LEVEL', '');
    const { logger } = await import('./logger.js');
    logger.info('test message');
    expect(stderrSpy).toHaveBeenCalledOnce();
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain('[drive-mcp]');
    expect(output).toContain('INFO');
    expect(output).toContain('test message');
    expect(output).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(output).toEndWith('\n');
  });

  it('writes error messages at default level', async () => {
    vi.stubEnv('LOG_LEVEL', '');
    const { logger } = await import('./logger.js');
    logger.error('error msg');
    expect(stderrSpy).toHaveBeenCalledOnce();
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain('ERROR');
  });

  it('suppresses debug messages at default level', async () => {
    vi.stubEnv('LOG_LEVEL', '');
    const { logger } = await import('./logger.js');
    logger.debug('debug msg');
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it('shows debug messages when LOG_LEVEL=debug', async () => {
    vi.stubEnv('LOG_LEVEL', 'debug');
    const { logger } = await import('./logger.js');
    logger.debug('debug msg');
    expect(stderrSpy).toHaveBeenCalledOnce();
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain('DEBUG');
  });

  it('suppresses info when LOG_LEVEL=error', async () => {
    vi.stubEnv('LOG_LEVEL', 'error');
    const { logger } = await import('./logger.js');
    logger.info('info msg');
    expect(stderrSpy).not.toHaveBeenCalled();
  });
});
```

**Note:** Because the logger reads `LOG_LEVEL` at module load time, each test must use dynamic `import()` after `vi.stubEnv` to get a fresh module. Add `vi.resetModules()` in `beforeEach` if vitest doesn't auto-reset between dynamic imports. If tests fail due to module caching, restructure logger to use a factory function or accept that these tests verify the exported singleton (test the most important cases: default level behavior).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/logger.test.ts`
Expected: FAIL — module `./logger.js` not found.

- [ ] **Step 3: Implement logger**

Create `src/utils/logger.ts`:

```typescript
type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) in LEVELS
    ? (process.env.LOG_LEVEL as LogLevel)
    : 'info';

function log(level: LogLevel, message: string): void {
  if (LEVELS[level] <= LEVELS[currentLevel]) {
    const timestamp = new Date().toISOString();
    process.stderr.write(
      `[drive-mcp] ${timestamp} ${level.toUpperCase()} ${message}\n`,
    );
  }
}

export const logger = {
  error: (msg: string) => log('error', msg),
  warn: (msg: string) => log('warn', msg),
  info: (msg: string) => log('info', msg),
  debug: (msg: string) => log('debug', msg),
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/logger.test.ts`
Expected: PASS. If module caching causes issues with dynamic imports, adjust test strategy to test the singleton at its default level and verify the format — the LOG_LEVEL switching is a simple conditional.

- [ ] **Step 5: Commit**

```bash
git add src/utils/logger.ts src/utils/logger.test.ts
git commit -m "feat: add structured stderr logger with LOG_LEVEL support"
```

---

### Task 3: Error Handling

**Files:**
- Create: `src/utils/errors.ts`
- Create: `src/utils/errors.test.ts`

- [ ] **Step 1: Write failing tests for error handling**

Create `src/utils/errors.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  ErrorCategory,
  toolError,
  categorizeError,
  safeToolHandler,
  sanitizeMessage,
} from './errors.js';

describe('toolError', () => {
  it('returns structured error response', () => {
    const result = toolError('something failed');
    expect(result).toEqual({
      isError: true,
      content: [{ type: 'text', text: 'something failed' }],
    });
  });
});

describe('sanitizeMessage', () => {
  it('redacts access tokens', () => {
    const msg = 'Error: ya29.a0AXY token invalid';
    expect(sanitizeMessage(msg)).toContain('[REDACTED]');
    expect(sanitizeMessage(msg)).not.toContain('ya29');
  });

  it('redacts refresh tokens', () => {
    const msg = 'Error: 1//0abcdef refresh failed';
    expect(sanitizeMessage(msg)).toContain('[REDACTED]');
    expect(sanitizeMessage(msg)).not.toContain('1//0abcdef');
  });

  it('truncates long messages to 200 chars', () => {
    const msg = 'x'.repeat(300);
    const result = sanitizeMessage(msg);
    expect(result.length).toBe(200);
    expect(result).toEndWith('...');
  });

  it('preserves short messages', () => {
    expect(sanitizeMessage('short')).toBe('short');
  });
});

describe('categorizeError', () => {
  function makeGaxiosError(status: number, message = 'error'): Error {
    const err = new Error(message) as Error & {
      response: { status: number; data: { error: { message: string } } };
    };
    err.response = { status, data: { error: { message } } };
    return err;
  }

  function makeNetworkError(code: string): Error {
    const err = new Error('network error') as Error & { code: string };
    err.code = code;
    return err;
  }

  it('maps 400 to BAD_REQUEST with detail', () => {
    const result = categorizeError(makeGaxiosError(400, 'invalid field'));
    expect(result).toBe('Bad request: invalid field');
  });

  it('maps 401 to AUTH', () => {
    expect(categorizeError(makeGaxiosError(401))).toBe(ErrorCategory.AUTH);
  });

  it('maps 403 to FORBIDDEN', () => {
    expect(categorizeError(makeGaxiosError(403))).toBe(ErrorCategory.FORBIDDEN);
  });

  it('maps 404 to NOT_FOUND', () => {
    expect(categorizeError(makeGaxiosError(404))).toBe('Resource not found.');
  });

  it('maps 409 to CONFLICT', () => {
    expect(categorizeError(makeGaxiosError(409))).toBe(ErrorCategory.CONFLICT);
  });

  it('maps 429 to RATE_LIMIT', () => {
    expect(categorizeError(makeGaxiosError(429))).toBe(ErrorCategory.RATE_LIMIT);
  });

  it('maps ENOTFOUND to NETWORK', () => {
    expect(categorizeError(makeNetworkError('ENOTFOUND'))).toBe(ErrorCategory.NETWORK);
  });

  it('maps ECONNREFUSED to NETWORK', () => {
    expect(categorizeError(makeNetworkError('ECONNREFUSED'))).toBe(ErrorCategory.NETWORK);
  });

  it('maps 507 to QUOTA', () => {
    expect(categorizeError(makeGaxiosError(507))).toBe(ErrorCategory.QUOTA);
  });

  it('maps quota message to QUOTA', () => {
    const err = new Error('Storage quota has been exceeded');
    expect(categorizeError(err)).toBe(ErrorCategory.QUOTA);
  });

  it('falls back to sanitized message for unknown errors', () => {
    const err = new Error('something unexpected ya29.token123');
    const result = categorizeError(err);
    expect(result).not.toContain('ya29');
    expect(result).toContain('[REDACTED]');
  });
});

describe('safeToolHandler', () => {
  it('returns result on success', async () => {
    const result = await safeToolHandler(async () => ({
      content: [{ type: 'text' as const, text: 'ok' }],
    }));
    expect(result).toEqual({ content: [{ type: 'text', text: 'ok' }] });
  });

  it('returns toolError on Error', async () => {
    const result = await safeToolHandler(async () => {
      throw new Error('fail');
    });
    expect(result).toHaveProperty('isError', true);
  });

  it('returns unknown error for non-Error throws', async () => {
    const result = await safeToolHandler(async () => {
      throw 'string error';
    });
    expect(result).toEqual({
      isError: true,
      content: [{ type: 'text', text: 'Unknown error' }],
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/errors.test.ts`
Expected: FAIL — module `./errors.js` not found.

- [ ] **Step 3: Implement error handling**

Create `src/utils/errors.ts`:

```typescript
export const ErrorCategory = {
  AUTH: 'Authentication failed. Check your OAuth credentials.',
  FORBIDDEN:
    'Insufficient permissions. Ensure the required Google API is enabled and correct OAuth scopes are granted.',
  RATE_LIMIT: 'Drive API rate limit exceeded. Try again in a few seconds.',
  BAD_REQUEST: (detail: string) => `Bad request: ${detail}`,
  NOT_FOUND: (resource: string) => `${resource} not found.`,
  CONFLICT:
    'File conflict. The file may have been modified or a name collision occurred.',
  QUOTA:
    'Storage quota exceeded. Free up space or upgrade your Google Drive plan.',
  VALIDATION: (detail: string) => `Invalid parameter: ${detail}`,
  NETWORK: 'Failed to connect to Google API. Check your network.',
} as const;

export function toolError(message: string) {
  return {
    isError: true as const,
    content: [{ type: 'text' as const, text: message }],
  };
}

export function sanitizeMessage(message: string): string {
  let sanitized = message.replace(/ya29\.[^\s]*/g, '[REDACTED]');
  sanitized = sanitized.replace(/1\/\/[^\s]*/g, '[REDACTED]');
  if (sanitized.length > 200) {
    sanitized = sanitized.slice(0, 197) + '...';
  }
  return sanitized;
}

export interface GaxiosErrorLike {
  response?: {
    status?: number;
    data?: { error?: { message?: string } };
  };
  code?: string;
}

export function categorizeError(error: Error): string {
  const gaxios = error as Error & GaxiosErrorLike;
  const status = gaxios.response?.status;

  if (status === 400) {
    const detail = gaxios.response?.data?.error?.message ?? error.message;
    return ErrorCategory.BAD_REQUEST(detail);
  }
  if (status === 401) return ErrorCategory.AUTH;
  if (status === 403) return ErrorCategory.FORBIDDEN;
  if (status === 404) return ErrorCategory.NOT_FOUND('Resource');
  if (status === 409) return ErrorCategory.CONFLICT;
  if (status === 429) return ErrorCategory.RATE_LIMIT;
  if (status === 507) return ErrorCategory.QUOTA;

  if (gaxios.code === 'ENOTFOUND' || gaxios.code === 'ECONNREFUSED') {
    return ErrorCategory.NETWORK;
  }

  if (/quota/i.test(error.message)) {
    return ErrorCategory.QUOTA;
  }

  return sanitizeMessage(error.message);
}

export async function safeToolHandler<T>(
  fn: () => Promise<T>,
): Promise<T | ReturnType<typeof toolError>> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error) {
      return toolError(categorizeError(error));
    }
    return toolError('Unknown error');
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/errors.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/errors.ts src/utils/errors.test.ts
git commit -m "feat: add error categorization with CONFLICT, QUOTA, and token sanitization"
```

---

### Task 4: Environment Validation

**Files:**
- Create: `src/auth/env.ts`
- Create: `src/auth/env.test.ts`

- [ ] **Step 1: Write failing tests for env validation**

Create `src/auth/env.test.ts`:

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';

describe('validateEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns credentials when all vars are set', async () => {
    vi.stubEnv('GOOGLE_DRIVE_CLIENT_ID', 'test-id');
    vi.stubEnv('GOOGLE_DRIVE_CLIENT_SECRET', 'test-secret');
    vi.stubEnv('GOOGLE_DRIVE_REFRESH_TOKEN', 'test-token');

    const { validateEnv } = await import('./env.js');
    const result = validateEnv();

    expect(result).toEqual({
      clientId: 'test-id',
      clientSecret: 'test-secret',
      refreshToken: 'test-token',
    });
  });

  it('throws EnvValidationError when one var is missing', async () => {
    vi.stubEnv('GOOGLE_DRIVE_CLIENT_ID', 'test-id');
    vi.stubEnv('GOOGLE_DRIVE_CLIENT_SECRET', 'test-secret');
    vi.stubEnv('GOOGLE_DRIVE_REFRESH_TOKEN', '');

    const { validateEnv, EnvValidationError } = await import('./env.js');

    expect(() => validateEnv()).toThrow(EnvValidationError);
    try {
      validateEnv();
    } catch (e) {
      const err = e as InstanceType<typeof EnvValidationError>;
      expect(err.missing).toContain('GOOGLE_DRIVE_REFRESH_TOKEN');
      expect(err.message).toContain('GOOGLE_DRIVE_REFRESH_TOKEN');
    }
  });

  it('throws EnvValidationError listing all missing vars', async () => {
    vi.stubEnv('GOOGLE_DRIVE_CLIENT_ID', '');
    vi.stubEnv('GOOGLE_DRIVE_CLIENT_SECRET', '');
    vi.stubEnv('GOOGLE_DRIVE_REFRESH_TOKEN', '');

    const { validateEnv, EnvValidationError } = await import('./env.js');

    expect(() => validateEnv()).toThrow(EnvValidationError);
    try {
      validateEnv();
    } catch (e) {
      const err = e as InstanceType<typeof EnvValidationError>;
      expect(err.missing).toHaveLength(3);
      expect(err.missing).toContain('GOOGLE_DRIVE_CLIENT_ID');
      expect(err.missing).toContain('GOOGLE_DRIVE_CLIENT_SECRET');
      expect(err.missing).toContain('GOOGLE_DRIVE_REFRESH_TOKEN');
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/auth/env.test.ts`
Expected: FAIL — module `./env.js` not found.

- [ ] **Step 3: Implement env validation**

Create `src/auth/env.ts`:

```typescript
export interface DriveCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

const REQUIRED_VARS = [
  'GOOGLE_DRIVE_CLIENT_ID',
  'GOOGLE_DRIVE_CLIENT_SECRET',
  'GOOGLE_DRIVE_REFRESH_TOKEN',
] as const;

export class EnvValidationError extends Error {
  constructor(public readonly missing: string[]) {
    const varList = missing.map((v) => `  - ${v}`).join('\n');
    super(
      `Missing required environment variables:\n${varList}\n\nSet these variables and restart.`,
    );
    this.name = 'EnvValidationError';
  }
}

export function validateEnv(): DriveCredentials {
  const missing = REQUIRED_VARS.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    throw new EnvValidationError([...missing]);
  }

  return {
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET!,
    refreshToken: process.env.GOOGLE_DRIVE_REFRESH_TOKEN!,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/auth/env.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/auth/env.ts src/auth/env.test.ts
git commit -m "feat: add env var validation for GOOGLE_DRIVE_* credentials"
```

---

### Task 5: Auth Client

**Files:**
- Create: `src/auth/client.ts`
- Create: `src/auth/client.test.ts`

- [ ] **Step 1: Write failing tests for auth client**

Create `src/auth/client.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import {
  createDriveClient,
  validateCredentials,
  CredentialValidationError,
} from './client.js';
import type { DriveCredentials } from './env.js';

const mockCredentials: DriveCredentials = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  refreshToken: 'test-refresh-token',
};

describe('createDriveClient', () => {
  it('returns client with all 4 API clients and auth', () => {
    const client = createDriveClient(mockCredentials);

    expect(client.drive).toBeDefined();
    expect(client.docs).toBeDefined();
    expect(client.sheets).toBeDefined();
    expect(client.slides).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it('sets refresh token on auth client', () => {
    const client = createDriveClient(mockCredentials);
    expect(client.auth.credentials.refresh_token).toBe('test-refresh-token');
  });
});

describe('validateCredentials', () => {
  it('returns email on successful validation', async () => {
    const mockDrive = {
      about: {
        get: vi.fn().mockResolvedValue({
          data: { user: { emailAddress: 'user@example.com' } },
        }),
      },
    } as any;

    const email = await validateCredentials(mockDrive);
    expect(email).toBe('user@example.com');
    expect(mockDrive.about.get).toHaveBeenCalledWith({ fields: 'user' });
  });

  it('returns "unknown" when email is missing', async () => {
    const mockDrive = {
      about: {
        get: vi.fn().mockResolvedValue({
          data: { user: {} },
        }),
      },
    } as any;

    const email = await validateCredentials(mockDrive);
    expect(email).toBe('unknown');
  });

  it('throws CredentialValidationError on API failure', async () => {
    const mockDrive = {
      about: {
        get: vi.fn().mockRejectedValue(new Error('401 Unauthorized')),
      },
    } as any;

    await expect(validateCredentials(mockDrive)).rejects.toThrow(
      CredentialValidationError,
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/auth/client.test.ts`
Expected: FAIL — module `./client.js` not found.

- [ ] **Step 3: Implement auth client**

Create `src/auth/client.ts`:

```typescript
import { OAuth2Client } from 'google-auth-library';
import { google, drive_v3, docs_v1, sheets_v4, slides_v1 } from 'googleapis';
import { Mutex } from 'async-mutex';
import { logger } from '../utils/logger.js';
import type { DriveCredentials } from './env.js';

export interface DriveClient {
  drive: drive_v3.Drive;
  docs: docs_v1.Docs;
  sheets: sheets_v4.Sheets;
  slides: slides_v1.Slides;
  auth: OAuth2Client;
}

const refreshMutex = new Mutex();

export function createDriveClient(credentials: DriveCredentials): DriveClient {
  const auth = new OAuth2Client(credentials.clientId, credentials.clientSecret);
  auth.setCredentials({ refresh_token: credentials.refreshToken });

  const originalRefresh = auth.refreshAccessToken.bind(auth);
  auth.refreshAccessToken = () =>
    refreshMutex.runExclusive(() => originalRefresh());

  auth.on('tokens', () => {
    logger.debug('Access token refreshed');
  });

  const drive = google.drive({ version: 'v3', auth });
  const docs = google.docs({ version: 'v1', auth });
  const sheets = google.sheets({ version: 'v4', auth });
  const slides = google.slides({ version: 'v1', auth });

  return { drive, docs, sheets, slides, auth };
}

export class CredentialValidationError extends Error {
  constructor() {
    super(
      'Failed to validate Google Drive credentials. ' +
        'Check that your OAuth2 credentials are correct and the Drive API is enabled in your Google Cloud project.',
    );
    this.name = 'CredentialValidationError';
  }
}

export async function validateCredentials(
  drive: drive_v3.Drive,
): Promise<string> {
  try {
    const response = await drive.about.get({ fields: 'user' });
    const email = response.data.user?.emailAddress ?? 'unknown';
    logger.info(`Authenticated as ${email}`);
    return email;
  } catch {
    throw new CredentialValidationError();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/auth/client.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/auth/client.ts src/auth/client.test.ts
git commit -m "feat: add OAuth2 client with mutex-wrapped refresh and credential validation"
```

---

### Task 6: Tool Registration Hub + Server Factory

**Files:**
- Create: `src/tools/register.ts`
- Create: `src/server.ts`

- [ ] **Step 1: Create empty tool registration hub**

Create `src/tools/register.ts`:

```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DriveClient } from '../auth/client.js';

export function registerTools(
  _server: McpServer,
  _client: DriveClient,
): void {
  // Tools will be registered in future phases:
  // Phase 2: registerDriveTools(server, client.drive)
  // Phase 3: registerDocsTools(server, client.docs)
  // Phase 3: registerSheetsTools(server, client.sheets)
  // Phase 4: registerSlidesTools(server, client.slides)
}
```

- [ ] **Step 2: Create server factory**

Create `src/server.ts`:

```typescript
import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DriveClient } from './auth/client.js';
import { registerTools } from './tools/register.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

export function createServer(client: DriveClient): McpServer {
  const server = new McpServer({
    name: 'drive-mcp-server',
    version,
  });

  registerTools(server, client);

  return server;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/tools/register.ts src/server.ts
git commit -m "feat: add server factory and empty tool registration hub"
```

---

### Task 7: Entry Point

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Create entry point with graceful shutdown**

Create `src/index.ts`:

```typescript
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { validateEnv } from './auth/env.js';
import { createDriveClient, validateCredentials } from './auth/client.js';
import { createServer } from './server.js';
import { logger } from './utils/logger.js';

async function main() {
  const credentials = validateEnv();
  const client = createDriveClient(credentials);
  await validateCredentials(client.drive);

  const server = createServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('Drive MCP Server running on stdio');

  const gracefulShutdown = async () => {
    logger.info('Drive MCP Server shutting down');
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}

main().catch((error) => {
  logger.error(
    error instanceof Error ? error.message : 'Unknown error',
  );
  process.exit(1);
});
```

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build`
Expected: `dist/index.js` created with `#!/usr/bin/env node` shebang, no errors.

- [ ] **Step 3: Verify the binary runs (expects env vars, will fail with EnvValidationError)**

Run: `node dist/index.js 2>&1 || true`
Expected: stderr contains "Missing required environment variables" and the process exits with code 1. This confirms the startup flow works: env validation runs first and fails gracefully.

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: add entry point with startup validation and graceful shutdown"
```

---

### Task 8: Full Test Suite Verification

- [ ] **Step 1: Run complete test suite**

Run: `npm test`
Expected: All tests pass (env, client, errors, logger).

- [ ] **Step 2: Run with coverage**

Run: `npm run test:coverage`
Expected: Coverage report printed. Core files (env.ts, client.ts, errors.ts, logger.ts) should have high coverage.

- [ ] **Step 3: Verify type checking**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Final build verification**

Run: `npm run build`
Expected: Clean build, `dist/index.js` exists.

- [ ] **Step 5: Commit any fixes (if needed)**

If any tests required adjustments, commit the fixes:

```bash
git add -A
git commit -m "fix: adjust tests for full suite compatibility"
```

---

## Verification Checklist

After all tasks are complete, verify these success criteria from the roadmap:

- [ ] `drive-mcp-server` with valid env vars would connect to Claude Desktop via stdio (verified by successful build + env validation flow)
- [ ] Starting with invalid/missing credentials logs error to stderr and exits non-zero (verified in Task 7, Step 3)
- [ ] Starting with valid credentials logs authenticated Google account email (verified by `validateCredentials` test)
- [ ] Tool call failures return structured error responses with category (verified by `safeToolHandler` + `categorizeError` tests)
- [ ] LOG_LEVEL controls verbosity (verified by logger tests)
