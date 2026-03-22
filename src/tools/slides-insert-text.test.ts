import { describe, it, expect, vi } from 'vitest';
import { registerSlidesInsertText } from './slides-insert-text.js';
import { createMockSlides, captureToolHandler } from './test-helpers.js';

describe('slides_insert_text', () => {
  it('sends deleteText + insertText requests', async () => {
    const batchUpdate = vi.fn().mockResolvedValue({
      data: { presentationId: 'pres-1', replies: [{}, {}] },
    });
    const slides = createMockSlides({ presentationsBatchUpdate: batchUpdate });

    const handler = captureToolHandler(registerSlidesInsertText, slides);
    const result = await handler({
      presentation_id: 'pres-1',
      object_id: 'shape-1',
      text: 'New content',
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.presentationId).toBe('pres-1');
    expect(parsed.objectId).toBe('shape-1');
    expect(parsed.message).toBe('Text updated in shape shape-1');

    expect(batchUpdate).toHaveBeenCalledWith({
      presentationId: 'pres-1',
      requestBody: {
        requests: [
          { deleteText: { objectId: 'shape-1', textRange: { type: 'ALL' } } },
          { insertText: { objectId: 'shape-1', text: 'New content', insertionIndex: 0 } },
        ],
      },
    });
  });

  it('returns error on API failure', async () => {
    const slides = createMockSlides({
      presentationsBatchUpdate: vi.fn().mockRejectedValue(new Error('Shape not found')),
    });

    const handler = captureToolHandler(registerSlidesInsertText, slides);
    const result = await handler({
      presentation_id: 'pres-1',
      object_id: 'bad-shape',
      text: 'fail',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Shape not found');
  });
});
