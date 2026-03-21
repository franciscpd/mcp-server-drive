import type { drive_v3 } from 'googleapis';
import TurndownService from 'turndown';

const turndown = new TurndownService();

const WORKSPACE_EXPORT: Record<string, { exportMime: string; transform?: 'html-to-markdown' }> = {
  'application/vnd.google-apps.document': { exportMime: 'text/html', transform: 'html-to-markdown' },
  'application/vnd.google-apps.spreadsheet': { exportMime: 'text/csv' },
  'application/vnd.google-apps.presentation': { exportMime: 'text/plain' },
};

export async function readFileContent(
  drive: drive_v3.Drive,
  fileId: string,
  mimeType: string,
): Promise<string> {
  const config = WORKSPACE_EXPORT[mimeType];

  if (config) {
    const response = await drive.files.export({ fileId, mimeType: config.exportMime });
    const content = String(response.data);
    return config.transform === 'html-to-markdown' ? turndown.turndown(content) : content;
  }

  const response = await drive.files.get({ fileId, alt: 'media' });
  return String(response.data);
}
