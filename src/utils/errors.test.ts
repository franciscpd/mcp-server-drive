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
    expect(result.endsWith('...')).toBe(true);
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
