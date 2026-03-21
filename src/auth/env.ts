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
