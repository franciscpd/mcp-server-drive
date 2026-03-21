import { describe, it, expect } from 'vitest';
import { formatFile, buildPagination, FILE_FIELDS } from './format.js';

describe('FILE_FIELDS', () => {
  it('contains all required fields', () => {
    for (const f of ['id', 'name', 'mimeType', 'size', 'createdTime', 'modifiedTime', 'owners', 'parents', 'webViewLink', 'shared', 'trashed']) {
      expect(FILE_FIELDS).toContain(f);
    }
  });
});

describe('formatFile', () => {
  it('maps all fields from Drive API response', () => {
    const result = formatFile({
      id: 'file-1', name: 'test.txt', mimeType: 'text/plain', size: '1024',
      createdTime: '2026-01-01T00:00:00Z', modifiedTime: '2026-03-20T10:00:00Z',
      owners: [{ emailAddress: 'user@example.com' }], parents: ['folder-1'],
      webViewLink: 'https://drive.google.com/file/d/file-1', shared: true, trashed: false,
    });
    expect(result).toEqual({
      id: 'file-1', name: 'test.txt', mimeType: 'text/plain', size: '1024',
      createdTime: '2026-01-01T00:00:00Z', modifiedTime: '2026-03-20T10:00:00Z',
      owners: ['user@example.com'], parents: ['folder-1'],
      webViewLink: 'https://drive.google.com/file/d/file-1', shared: true, trashed: false,
    });
  });

  it('handles null and undefined fields gracefully', () => {
    const result = formatFile({ id: 'file-2' });
    expect(result.id).toBe('file-2');
    expect(result.name).toBe('');
    expect(result.size).toBeNull();
    expect(result.owners).toEqual([]);
    expect(result.parents).toEqual([]);
    expect(result.shared).toBe(false);
    expect(result.trashed).toBe(false);
  });

  it('extracts multiple owner emails', () => {
    const result = formatFile({
      id: 'f', owners: [{ emailAddress: 'a@x.com' }, { emailAddress: 'b@x.com' }],
    });
    expect(result.owners).toEqual(['a@x.com', 'b@x.com']);
  });
});

describe('buildPagination', () => {
  it('returns has_more true with token', () => {
    expect(buildPagination('next-token')).toEqual({ next_page_token: 'next-token', has_more: true });
  });
  it('returns has_more false without token', () => {
    expect(buildPagination(undefined)).toEqual({ next_page_token: null, has_more: false });
  });
  it('returns has_more false with null', () => {
    expect(buildPagination(null)).toEqual({ next_page_token: null, has_more: false });
  });
});
