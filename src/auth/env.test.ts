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
