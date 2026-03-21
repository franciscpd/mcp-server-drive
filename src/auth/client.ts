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
