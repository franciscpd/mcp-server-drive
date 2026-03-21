import type { drive_v3 } from 'googleapis';

export const FILE_FIELDS =
  'id, name, mimeType, size, createdTime, modifiedTime, owners(emailAddress), parents, webViewLink, shared, trashed';

export interface FormattedFile {
  id: string;
  name: string;
  mimeType: string;
  size: string | null;
  createdTime: string | null;
  modifiedTime: string | null;
  owners: string[];
  parents: string[];
  webViewLink: string | null;
  shared: boolean;
  trashed: boolean;
}

export function formatFile(file: drive_v3.Schema$File): FormattedFile {
  return {
    id: file.id ?? '',
    name: file.name ?? '',
    mimeType: file.mimeType ?? '',
    size: file.size ?? null,
    createdTime: file.createdTime ?? null,
    modifiedTime: file.modifiedTime ?? null,
    owners: (file.owners ?? [])
      .map((o) => o.emailAddress)
      .filter((e): e is string => !!e),
    parents: file.parents ?? [],
    webViewLink: file.webViewLink ?? null,
    shared: file.shared ?? false,
    trashed: file.trashed ?? false,
  };
}

export function buildPagination(nextPageToken?: string | null): {
  next_page_token: string | null;
  has_more: boolean;
} {
  return {
    next_page_token: nextPageToken ?? null,
    has_more: !!nextPageToken,
  };
}
