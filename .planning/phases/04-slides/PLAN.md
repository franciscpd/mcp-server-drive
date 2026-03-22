# Phase 4: Slides Tools — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 4 Slides tools for creating presentations, reading content with objectIds, adding slides, and inserting text into shapes.

**Architecture:** Same tool pattern as Phases 2-3. Each tool is a standalone file with `registerSlidesXxx(server, slides)`. Uses `slides_v1.Slides` client. `slides_insert_text` uses delete-then-insert (replace semantics) to simplify agent usage.

**Tech Stack:** TypeScript, googleapis (slides_v1), zod, vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/tools/test-helpers.ts` | Modify | Add createMockSlides() |
| `src/tools/slides-create.ts` | Create | slides_create tool |
| `src/tools/slides-create.test.ts` | Create | Tests |
| `src/tools/slides-read.ts` | Create | slides_read tool (content extraction) |
| `src/tools/slides-read.test.ts` | Create | Tests |
| `src/tools/slides-add-slide.ts` | Create | slides_add_slide tool |
| `src/tools/slides-add-slide.test.ts` | Create | Tests |
| `src/tools/slides-insert-text.ts` | Create | slides_insert_text tool |
| `src/tools/slides-insert-text.test.ts` | Create | Tests |
| `src/tools/slides-register.ts` | Create | registerSlidesTools hub |
| `src/tools/register.ts` | Modify | Add registerSlidesTools call |

---

### Task 1: Extend Test Helpers + All 4 Slides Tools

Since this is a small phase (4 tools following an identical pattern), implement all in one task.

**Files:**
- Modify: `src/tools/test-helpers.ts`
- Create: `src/tools/slides-create.ts` + `.test.ts`
- Create: `src/tools/slides-read.ts` + `.test.ts`
- Create: `src/tools/slides-add-slide.ts` + `.test.ts`
- Create: `src/tools/slides-insert-text.ts` + `.test.ts`

- [ ] **Step 1: Add createMockSlides to test-helpers.ts**

Add to `src/tools/test-helpers.ts`:

```typescript
import type { slides_v1 } from 'googleapis';

export function createMockSlides(overrides?: Partial<{
  presentationsCreate: ReturnType<typeof vi.fn>;
  presentationsGet: ReturnType<typeof vi.fn>;
  presentationsBatchUpdate: ReturnType<typeof vi.fn>;
}>) {
  return {
    presentations: {
      create: overrides?.presentationsCreate ?? vi.fn().mockResolvedValue({
        data: { presentationId: 'pres-1', title: 'Test Presentation' },
      }),
      get: overrides?.presentationsGet ?? vi.fn().mockResolvedValue({
        data: {
          presentationId: 'pres-1',
          title: 'Test Presentation',
          slides: [{
            objectId: 'slide-1',
            pageElements: [{
              objectId: 'shape-1',
              shape: {
                shapeType: 'TEXT_BOX',
                text: { textElements: [{ textRun: { content: 'Hello slide' } }] },
              },
            }],
          }],
        },
      }),
      batchUpdate: overrides?.presentationsBatchUpdate ?? vi.fn().mockResolvedValue({
        data: { presentationId: 'pres-1', replies: [{ createSlide: { objectId: 'new-slide-1' } }] },
      }),
    },
  } as unknown as slides_v1.Slides;
}
```

- [ ] **Step 2: Implement slides_create (TDD)**

`src/tools/slides-create.ts`:
```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { slides_v1 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';

export function registerSlidesCreate(server: McpServer, slides: slides_v1.Slides): void {
  server.tool(
    'slides_create',
    'Create a new Google Slides presentation.',
    { title: z.string().describe('Presentation title') },
    (params) =>
      safeToolHandler(async () => {
        const response = await slides.presentations.create({ requestBody: { title: params.title } });
        const presentationId = response.data.presentationId!;
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              presentationId,
              title: response.data.title ?? params.title,
              url: `https://docs.google.com/presentation/d/${presentationId}/edit`,
            }, null, 2),
          }],
        };
      }),
  );
}
```

Test: verify presentations.create called, verify response shape (presentationId, title, url).

Commit: `feat: add slides_create tool`

- [ ] **Step 3: Implement slides_read (TDD)**

`src/tools/slides-read.ts`:
```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { slides_v1 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';

export function registerSlidesRead(server: McpServer, slides: slides_v1.Slides): void {
  server.tool(
    'slides_read',
    "Read a Google Slides presentation's content including slide objectIds, shapes, and text. Use objectIds with slides_insert_text to modify content.",
    { presentation_id: z.string().describe('Presentation ID') },
    (params) =>
      safeToolHandler(async () => {
        const response = await slides.presentations.get({ presentationId: params.presentation_id });
        const pres = response.data;

        const slidesData = (pres.slides ?? []).map((slide) => ({
          objectId: slide.objectId ?? '',
          pageElements: (slide.pageElements ?? [])
            .filter((el) => el.shape?.text)
            .map((el) => {
              let text = '';
              for (const te of el.shape!.text!.textElements ?? []) {
                if (te.textRun?.content) text += te.textRun.content;
              }
              return {
                objectId: el.objectId ?? '',
                shapeType: el.shape!.shapeType ?? '',
                text: text.trimEnd(),
              };
            }),
        }));

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              presentationId: pres.presentationId,
              title: pres.title,
              slides: slidesData,
            }, null, 2),
          }],
        };
      }),
  );
}
```

Test: mock with slides + pageElements + shapes, verify extraction of objectIds and text content. Test empty presentation (no slides).

Commit: `feat: add slides_read tool with content extraction`

- [ ] **Step 4: Implement slides_add_slide (TDD)**

`src/tools/slides-add-slide.ts`:
```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { slides_v1 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';

export function registerSlidesAddSlide(server: McpServer, slides: slides_v1.Slides): void {
  server.tool(
    'slides_add_slide',
    'Add a new slide to an existing presentation. Optionally specify a predefined layout (BLANK, TITLE, TITLE_AND_BODY, TITLE_ONLY).',
    {
      presentation_id: z.string().describe('Presentation ID'),
      layout: z.string().default('BLANK').describe('Predefined layout (BLANK, TITLE, TITLE_AND_BODY, TITLE_ONLY)'),
    },
    (params) =>
      safeToolHandler(async () => {
        const response = await slides.presentations.batchUpdate({
          presentationId: params.presentation_id,
          requestBody: {
            requests: [{
              createSlide: { slideLayoutReference: { predefinedLayout: params.layout } },
            }],
          },
        });

        const slideObjectId = response.data.replies?.[0]?.createSlide?.objectId ?? '';

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              presentationId: params.presentation_id,
              slideObjectId,
            }, null, 2),
          }],
        };
      }),
  );
}
```

Test: verify batchUpdate called with createSlide + layout, verify slideObjectId in response.

Commit: `feat: add slides_add_slide tool`

- [ ] **Step 5: Implement slides_insert_text (TDD)**

`src/tools/slides-insert-text.ts`:
```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { slides_v1 } from 'googleapis';
import { safeToolHandler } from '../utils/errors.js';

export function registerSlidesInsertText(server: McpServer, slides: slides_v1.Slides): void {
  server.tool(
    'slides_insert_text',
    'Insert or replace text in a slide shape/placeholder. Use slides_read to get objectIds.',
    {
      presentation_id: z.string().describe('Presentation ID'),
      object_id: z.string().describe('Shape/placeholder objectId from slides_read'),
      text: z.string().describe('Text to insert'),
    },
    (params) =>
      safeToolHandler(async () => {
        await slides.presentations.batchUpdate({
          presentationId: params.presentation_id,
          requestBody: {
            requests: [
              { deleteText: { objectId: params.object_id, textRange: { type: 'ALL' } } },
              { insertText: { objectId: params.object_id, text: params.text, insertionIndex: 0 } },
            ],
          },
        });

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              presentationId: params.presentation_id,
              objectId: params.object_id,
              message: `Text updated in shape ${params.object_id}`,
            }, null, 2),
          }],
        };
      }),
  );
}
```

**Note on deleteText on empty shapes:** If the shape has no text, the `deleteText` request may fail. Handle by wrapping in try-catch or sending requests individually. The simplest approach: let `safeToolHandler` catch if it fails — the agent can retry with just `insertText`. Or conditionally omit `deleteText` — but that adds complexity for an edge case. Keep it simple: send both requests, let error handling cover edge cases.

Test: verify batchUpdate called with deleteText + insertText requests, verify object_id passed correctly.

Commit: `feat: add slides_insert_text tool`

- [ ] **Step 6: Run all tests**

Run: `npm test`
Expected: All tests pass (99 existing + ~12 new).

---

### Task 2: Registration + Verification

**Files:**
- Create: `src/tools/slides-register.ts`
- Modify: `src/tools/register.ts`

- [ ] **Step 1: Create slides-register.ts**

```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { slides_v1 } from 'googleapis';
import { registerSlidesCreate } from './slides-create.js';
import { registerSlidesRead } from './slides-read.js';
import { registerSlidesAddSlide } from './slides-add-slide.js';
import { registerSlidesInsertText } from './slides-insert-text.js';

export function registerSlidesTools(server: McpServer, slides: slides_v1.Slides): void {
  registerSlidesCreate(server, slides);
  registerSlidesRead(server, slides);
  registerSlidesAddSlide(server, slides);
  registerSlidesInsertText(server, slides);
}
```

- [ ] **Step 2: Update register.ts**

Replace `// Phase 4: registerSlidesTools(server, client.slides)` with:
```typescript
import { registerSlidesTools } from './slides-register.js';
// ...
registerSlidesTools(server, client.slides);
```

- [ ] **Step 3: Type check + build**

Run: `npx tsc --noEmit && npm run build`

- [ ] **Step 4: Smoke test**

Run: `set -a; source .env; set +a; timeout 10 node dist/index.js 2>&1 || true`
Expected: `Authenticated as franciscpd@gmail.com` + `Drive MCP Server running on stdio`

- [ ] **Step 5: Commit**

```bash
git add src/tools/slides-register.ts src/tools/register.ts
git commit -m "feat: register all Slides tools"
```

---

## Verification Checklist

- [ ] slides_create creates presentation with title
- [ ] slides_read extracts slides, shapes, text, and objectIds
- [ ] slides_add_slide creates slide with optional layout
- [ ] slides_insert_text replaces text in shape by objectId
- [ ] All tools registered, server starts successfully
- [ ] All tests pass
