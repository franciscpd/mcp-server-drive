import { describe, it, expect, vi } from 'vitest';
import { registerSlidesRead } from './slides-read.js';
import { createMockSlides, captureToolHandler } from './test-helpers.js';

describe('slides_read', () => {
  it('extracts objectIds and text from slides', async () => {
    const slides = createMockSlides({
      presentationsGet: vi.fn().mockResolvedValue({
        data: {
          presentationId: 'pres-1',
          title: 'My Pres',
          slides: [{
            objectId: 'slide-1',
            pageElements: [
              {
                objectId: 'shape-1',
                shape: {
                  shapeType: 'TEXT_BOX',
                  text: {
                    textElements: [
                      { textRun: { content: 'Hello ' } },
                      { textRun: { content: 'world  ' } },
                    ],
                  },
                },
              },
              {
                objectId: 'image-1',
                image: { sourceUrl: 'https://example.com/img.png' },
              },
            ],
          }],
        },
      }),
    });

    const handler = captureToolHandler(registerSlidesRead, slides);
    const result = await handler({ presentation_id: 'pres-1' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.presentationId).toBe('pres-1');
    expect(parsed.title).toBe('My Pres');
    expect(parsed.slides).toHaveLength(1);
    expect(parsed.slides[0].objectId).toBe('slide-1');
    expect(parsed.slides[0].pageElements).toHaveLength(1);
    expect(parsed.slides[0].pageElements[0].objectId).toBe('shape-1');
    expect(parsed.slides[0].pageElements[0].shapeType).toBe('TEXT_BOX');
    expect(parsed.slides[0].pageElements[0].text).toBe('Hello world');

    expect(slides.presentations.get).toHaveBeenCalledWith({
      presentationId: 'pres-1',
    });
  });

  it('handles empty presentation with no slides', async () => {
    const slides = createMockSlides({
      presentationsGet: vi.fn().mockResolvedValue({
        data: { presentationId: 'pres-2', title: 'Empty', slides: [] },
      }),
    });

    const handler = captureToolHandler(registerSlidesRead, slides);
    const result = await handler({ presentation_id: 'pres-2' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.slides).toHaveLength(0);
  });

  it('returns error on API failure', async () => {
    const slides = createMockSlides({
      presentationsGet: vi.fn().mockRejectedValue(new Error('Not found')),
    });

    const handler = captureToolHandler(registerSlidesRead, slides);
    const result = await handler({ presentation_id: 'bad-id' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Not found');
  });
});
