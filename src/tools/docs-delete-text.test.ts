import { describe, it, expect, vi } from 'vitest';
import { registerDocsDeleteText } from './docs-delete-text.js';
import { createMockDocs, captureToolHandler } from './test-helpers.js';

describe('docs_delete_text', () => {
  it('deletes a range of text', async () => {
    const docs = createMockDocs();

    const handler = captureToolHandler(registerDocsDeleteText, docs);
    const result = await handler({ document_id: 'doc-1', start_index: 1, end_index: 10 });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.documentId).toBe('doc-1');
    expect(parsed.message).toBe('Deleted range 1-10');

    expect(docs.documents.batchUpdate).toHaveBeenCalledWith({
      documentId: 'doc-1',
      requestBody: {
        requests: [{ deleteContentRange: { range: { startIndex: 1, endIndex: 10, segmentId: '' } } }],
      },
    });
  });

  it('returns error on API failure', async () => {
    const docs = createMockDocs({
      documentsBatchUpdate: vi.fn().mockRejectedValue(new Error('Delete failed')),
    });

    const handler = captureToolHandler(registerDocsDeleteText, docs);
    const result = await handler({ document_id: 'x', start_index: 1, end_index: 5 });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Delete failed');
  });
});
