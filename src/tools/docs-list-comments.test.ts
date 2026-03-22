import { describe, it, expect, vi } from 'vitest';
import { registerDocsListComments } from './docs-list-comments.js';
import { createMockDrive, captureToolHandler } from './test-helpers.js';

describe('docs_list_comments', () => {
  it('lists comments on a document', async () => {
    const drive = createMockDrive({
      commentsList: vi.fn().mockResolvedValue({
        data: {
          comments: [
            {
              id: 'c1',
              author: { displayName: 'Alice', emailAddress: 'alice@example.com' },
              content: 'Nice work!',
              createdTime: '2026-03-21T00:00:00Z',
              resolved: false,
            },
            {
              id: 'c2',
              author: { displayName: 'Bob', emailAddress: 'bob@example.com' },
              content: 'Fix this.',
              createdTime: '2026-03-21T01:00:00Z',
              resolved: true,
            },
          ],
        },
      }),
    });

    const handler = captureToolHandler(registerDocsListComments, drive);
    const result = await handler({ document_id: 'doc-1' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.comments).toHaveLength(2);
    expect(parsed.comments[0]).toEqual({
      id: 'c1',
      author: { name: 'Alice', email: 'alice@example.com' },
      content: 'Nice work!',
      createdTime: '2026-03-21T00:00:00Z',
      resolved: false,
    });
    expect(parsed.comments[1].resolved).toBe(true);

    expect(drive.comments.list).toHaveBeenCalledWith({
      fileId: 'doc-1',
      fields: 'comments(id,author(displayName,emailAddress),content,createdTime,resolved)',
    });
  });

  it('returns empty array when no comments', async () => {
    const drive = createMockDrive({
      commentsList: vi.fn().mockResolvedValue({ data: { comments: null } }),
    });

    const handler = captureToolHandler(registerDocsListComments, drive);
    const result = await handler({ document_id: 'doc-1' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.comments).toEqual([]);
  });

  it('returns error on API failure', async () => {
    const drive = createMockDrive({
      commentsList: vi.fn().mockRejectedValue(new Error('List failed')),
    });

    const handler = captureToolHandler(registerDocsListComments, drive);
    const result = await handler({ document_id: 'x' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('List failed');
  });
});
