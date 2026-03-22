import { describe, it, expect, vi } from 'vitest';
import { registerDocsInsertText } from './docs-insert-text.js';
import { createMockDocs, captureToolHandler } from './test-helpers.js';

describe('docs_insert_text', () => {
  it('inserts text at the given index', async () => {
    const docs = createMockDocs();

    const handler = captureToolHandler(registerDocsInsertText, docs);
    const result = await handler({ document_id: 'doc-1', text: 'Hello', index: 1 });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.documentId).toBe('doc-1');
    expect(parsed.message).toBe('Inserted 5 characters at index 1');

    expect(docs.documents.batchUpdate).toHaveBeenCalledWith({
      documentId: 'doc-1',
      requestBody: {
        requests: [{ insertText: { text: 'Hello', location: { index: 1 } } }],
      },
    });
  });

  it('returns error on API failure', async () => {
    const docs = createMockDocs({
      documentsBatchUpdate: vi.fn().mockRejectedValue(new Error('Insert failed')),
    });

    const handler = captureToolHandler(registerDocsInsertText, docs);
    const result = await handler({ document_id: 'x', text: 'a', index: 1 });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Insert failed');
  });
});
