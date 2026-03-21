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
