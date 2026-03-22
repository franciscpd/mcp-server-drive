import { describe, it, expect, vi } from 'vitest';
import { registerDocsCreate } from './docs-create.js';
import { createMockDocs, captureToolHandler } from './test-helpers.js';

describe('docs_create', () => {
  it('creates a doc with title only', async () => {
    const docs = createMockDocs({
      documentsCreate: vi.fn().mockResolvedValue({
        data: { documentId: 'doc-1', title: 'My Doc' },
      }),
    });

    const handler = captureToolHandler(registerDocsCreate, docs);
    const result = await handler({ title: 'My Doc' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.documentId).toBe('doc-1');
    expect(parsed.title).toBe('My Doc');
    expect(parsed.url).toBe('https://docs.google.com/document/d/doc-1/edit');

    expect(docs.documents.create).toHaveBeenCalledWith({
      requestBody: { title: 'My Doc' },
    });
    expect(docs.documents.batchUpdate).not.toHaveBeenCalled();
  });

  it('creates a doc with title and content', async () => {
    const docs = createMockDocs({
      documentsCreate: vi.fn().mockResolvedValue({
        data: { documentId: 'doc-2', title: 'With Content' },
      }),
    });

    const handler = captureToolHandler(registerDocsCreate, docs);
    const result = await handler({ title: 'With Content', content: 'Hello world' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.documentId).toBe('doc-2');
    expect(parsed.title).toBe('With Content');

    expect(docs.documents.create).toHaveBeenCalledWith({
      requestBody: { title: 'With Content' },
    });
    expect(docs.documents.batchUpdate).toHaveBeenCalledWith({
      documentId: 'doc-2',
      requestBody: {
        requests: [{ insertText: { text: 'Hello world', location: { index: 1 } } }],
      },
    });
  });

  it('returns error on API failure', async () => {
    const docs = createMockDocs({
      documentsCreate: vi.fn().mockRejectedValue(new Error('Create failed')),
    });

    const handler = captureToolHandler(registerDocsCreate, docs);
    const result = await handler({ title: 'Fail' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Create failed');
  });
});
