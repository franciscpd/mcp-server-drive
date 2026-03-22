import { describe, it, expect, vi } from 'vitest';
import { registerSlidesAddSlide } from './slides-add-slide.js';
import { createMockSlides, captureToolHandler } from './test-helpers.js';

describe('slides_add_slide', () => {
  it('adds a slide with BLANK layout', async () => {
    const slides = createMockSlides({
      presentationsBatchUpdate: vi.fn().mockResolvedValue({
        data: { presentationId: 'pres-1', replies: [{ createSlide: { objectId: 'new-slide-99' } }] },
      }),
    });

    const handler = captureToolHandler(registerSlidesAddSlide, slides);
    const result = await handler({ presentation_id: 'pres-1', layout: 'BLANK' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.presentationId).toBe('pres-1');
    expect(parsed.slideObjectId).toBe('new-slide-99');

    expect(slides.presentations.batchUpdate).toHaveBeenCalledWith({
      presentationId: 'pres-1',
      requestBody: {
        requests: [{ createSlide: { slideLayoutReference: { predefinedLayout: 'BLANK' } } }],
      },
    });
  });

  it('uses specified layout', async () => {
    const slides = createMockSlides({
      presentationsBatchUpdate: vi.fn().mockResolvedValue({
        data: { presentationId: 'pres-1', replies: [{ createSlide: { objectId: 'slide-title' } }] },
      }),
    });

    const handler = captureToolHandler(registerSlidesAddSlide, slides);
    const result = await handler({ presentation_id: 'pres-1', layout: 'TITLE_AND_BODY' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.slideObjectId).toBe('slide-title');

    expect(slides.presentations.batchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: {
          requests: [{ createSlide: { slideLayoutReference: { predefinedLayout: 'TITLE_AND_BODY' } } }],
        },
      }),
    );
  });

  it('returns error on API failure', async () => {
    const slides = createMockSlides({
      presentationsBatchUpdate: vi.fn().mockRejectedValue(new Error('Batch failed')),
    });

    const handler = captureToolHandler(registerSlidesAddSlide, slides);
    const result = await handler({ presentation_id: 'pres-1' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Batch failed');
  });
});
