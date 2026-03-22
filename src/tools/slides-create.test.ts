import { describe, it, expect, vi } from 'vitest';
import { registerSlidesCreate } from './slides-create.js';
import { createMockSlides, captureToolHandler } from './test-helpers.js';

describe('slides_create', () => {
  it('creates a presentation and returns formatted response', async () => {
    const slides = createMockSlides({
      presentationsCreate: vi.fn().mockResolvedValue({
        data: { presentationId: 'pres-abc', title: 'My Deck' },
      }),
    });

    const handler = captureToolHandler(registerSlidesCreate, slides);
    const result = await handler({ title: 'My Deck' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.presentationId).toBe('pres-abc');
    expect(parsed.title).toBe('My Deck');
    expect(parsed.url).toBe('https://docs.google.com/presentation/d/pres-abc/edit');

    expect(slides.presentations.create).toHaveBeenCalledWith({
      requestBody: { title: 'My Deck' },
    });
  });

  it('returns error on API failure', async () => {
    const slides = createMockSlides({
      presentationsCreate: vi.fn().mockRejectedValue(new Error('API error')),
    });

    const handler = captureToolHandler(registerSlidesCreate, slides);
    const result = await handler({ title: 'Fail' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('API error');
  });
});
