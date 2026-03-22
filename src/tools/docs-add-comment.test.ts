import { describe, it, expect, vi } from 'vitest';
import { registerDocsAddComment } from './docs-add-comment.js';
import { createMockDrive, captureToolHandler } from './test-helpers.js';

describe('docs_add_comment', () => {
  it('adds a comment to a document', async () => {
    const drive = createMockDrive({
      commentsCreate: vi.fn().mockResolvedValue({
        data: {
          id: 'comment-1',
          author: { displayName: 'User', emailAddress: 'user@example.com' },
          content: 'Great doc!',
          createdTime: '2026-03-21T00:00:00Z',
        },
      }),
    });

    const handler = captureToolHandler(registerDocsAddComment, drive);
    const result = await handler({ document_id: 'doc-1', content: 'Great doc!' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.id).toBe('comment-1');
    expect(parsed.author).toEqual({ name: 'User', email: 'user@example.com' });
    expect(parsed.content).toBe('Great doc!');
    expect(parsed.createdTime).toBe('2026-03-21T00:00:00Z');

    expect(drive.comments.create).toHaveBeenCalledWith({
      fileId: 'doc-1',
      fields: 'id,author(displayName,emailAddress),content,createdTime',
      requestBody: { content: 'Great doc!' },
    });
  });

  it('returns error on API failure', async () => {
    const drive = createMockDrive({
      commentsCreate: vi.fn().mockRejectedValue(new Error('Comment failed')),
    });

    const handler = captureToolHandler(registerDocsAddComment, drive);
    const result = await handler({ document_id: 'x', content: 'test' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Comment failed');
  });
});
