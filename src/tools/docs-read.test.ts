import { describe, it, expect, vi } from 'vitest';
import { registerDocsRead } from './docs-read.js';
import { createMockDocs, captureToolHandler } from './test-helpers.js';

describe('docs_read', () => {
  it('reads a doc with two paragraphs', async () => {
    const docs = createMockDocs({
      documentsGet: vi.fn().mockResolvedValue({
        data: {
          documentId: 'doc-1',
          title: 'Test Doc',
          body: {
            content: [
              { endIndex: 1 },
              { startIndex: 1, endIndex: 13, paragraph: { elements: [{ startIndex: 1, endIndex: 13, textRun: { content: 'Hello world\n' } }] } },
              { startIndex: 13, endIndex: 30, paragraph: { elements: [{ startIndex: 13, endIndex: 30, textRun: { content: 'Second paragraph\n' } }] } },
            ],
          },
        },
      }),
    });

    const handler = captureToolHandler(registerDocsRead, docs);
    const result = await handler({ document_id: 'doc-1' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.documentId).toBe('doc-1');
    expect(parsed.title).toBe('Test Doc');
    expect(parsed.text).toBe('Hello world\nSecond paragraph\n');
    expect(parsed.length).toBe(30);
    expect(parsed.paragraphs).toEqual([
      { start: 1, end: 13, text: 'Hello world\n' },
      { start: 13, end: 30, text: 'Second paragraph\n' },
    ]);

    expect(docs.documents.get).toHaveBeenCalledWith({ documentId: 'doc-1' });
  });

  it('reads an empty doc', async () => {
    const docs = createMockDocs({
      documentsGet: vi.fn().mockResolvedValue({
        data: {
          documentId: 'doc-empty',
          title: 'Empty Doc',
          body: {
            content: [
              { endIndex: 1 },
            ],
          },
        },
      }),
    });

    const handler = captureToolHandler(registerDocsRead, docs);
    const result = await handler({ document_id: 'doc-empty' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.documentId).toBe('doc-empty');
    expect(parsed.text).toBe('');
    expect(parsed.length).toBe(0);
    expect(parsed.paragraphs).toEqual([]);
  });

  it('returns error on API failure', async () => {
    const docs = createMockDocs({
      documentsGet: vi.fn().mockRejectedValue(new Error('Read failed')),
    });

    const handler = captureToolHandler(registerDocsRead, docs);
    const result = await handler({ document_id: 'x' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Read failed');
  });
});
