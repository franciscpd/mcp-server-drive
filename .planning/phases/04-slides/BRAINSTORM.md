# Phase 4: Slides Tools — Design Spec

**Date:** 2026-03-22
**Approach:** Port of established tool pattern for Slides API v1
**Status:** Approved

## Overview

Implement 4 Slides tools: create presentation, read content (slides, shapes, text, objectIds), add new slides, and insert text into placeholders/shapes by objectId. All use `slides_v1.Slides` client.

## File Structure

```
src/tools/
├── slides-create.ts          # slides_create
├── slides-create.test.ts
├── slides-read.ts            # slides_read
├── slides-read.test.ts
├── slides-add-slide.ts       # slides_add_slide
├── slides-add-slide.test.ts
├── slides-insert-text.ts     # slides_insert_text
├── slides-insert-text.test.ts
├── slides-register.ts        # registerSlidesTools hub
```

Modified files:
- `src/tools/test-helpers.ts` — add `createMockSlides()`
- `src/tools/register.ts` — add `registerSlidesTools(server, client.slides)`

## Components

### slides_create (SLDS-01)
- **Name:** `slides_create`
- **Description:** `Create a new Google Slides presentation.`
- **Input:** `{ title: string }`
- **API:** `slides.presentations.create({ requestBody: { title } })`
- **Response:** `{ presentationId, title, url: \`https://docs.google.com/presentation/d/${presentationId}/edit\` }`

### slides_read (SLDS-02)
- **Name:** `slides_read`
- **Description:** `Read a Google Slides presentation's content including slide objectIds, shapes, and text. Use objectIds with slides_insert_text to modify content.`
- **Input:** `{ presentation_id: string }`
- **API:** `slides.presentations.get({ presentationId })`
- **Logic:** Traverse `slides[]`, for each slide extract `pageElements[]`. For each pageElement with `shape.text`, extract text from `shape.text.textElements[].textRun.content`. Return objectId for each slide and each shape.
- **Response:**
```json
{
  "presentationId": "...",
  "title": "...",
  "slides": [
    {
      "objectId": "slide-1",
      "pageElements": [
        { "objectId": "shape-1", "shapeType": "TEXT_BOX", "text": "Title text here" },
        { "objectId": "shape-2", "shapeType": "TEXT_BOX", "text": "Body text here" }
      ]
    }
  ]
}
```

### slides_add_slide (SLDS-03)
- **Name:** `slides_add_slide`
- **Description:** `Add a new slide to an existing presentation. Optionally specify a predefined layout.`
- **Input:** `{ presentation_id: string, layout?: string }` where layout is one of: BLANK, TITLE, TITLE_AND_BODY, TITLE_AND_TWO_COLUMNS, TITLE_ONLY, etc. Default: BLANK.
- **API:** `slides.presentations.batchUpdate({ presentationId, requests: [{ createSlide: { slideLayoutReference: { predefinedLayout: layout } } }] })`
- **Response:** `{ presentationId, slideObjectId }` — the objectId of the newly created slide (from `replies[0].createSlide.objectId`)

### slides_insert_text (SLDS-04)
- **Name:** `slides_insert_text`
- **Description:** `Insert or replace text in a slide shape/placeholder. Use slides_read to get objectIds.`
- **Input:** `{ presentation_id: string, object_id: string, text: string }`
- **API:** `slides.presentations.batchUpdate({ presentationId, requests: [{ deleteText: { objectId, textRange: { type: 'ALL' } } }, { insertText: { objectId, text, insertionIndex: 0 } }] })`
- **Note:** Deletes existing text first, then inserts new text. This is "replace" behavior — simpler for agents than pure insert.
- **Response:** `{ presentationId, objectId, message: "Text updated in shape {objectId}" }`

### Registration

**`slides-register.ts`:**
```
registerSlidesTools(server: McpServer, slides: slides_v1.Slides): void
  → registerSlidesCreate(server, slides)
  → registerSlidesRead(server, slides)
  → registerSlidesAddSlide(server, slides)
  → registerSlidesInsertText(server, slides)
```

**Updated `register.ts`:** Replace Phase 4 comment with `registerSlidesTools(server, client.slides)`.

### Test Helpers

Add `createMockSlides(overrides?)` to `test-helpers.ts` with mocks for:
- `presentations.create`
- `presentations.get`
- `presentations.batchUpdate`

## Requirements Coverage

| Requirement | Tool | How |
|-------------|------|-----|
| SLDS-01 | slides_create | presentations.create |
| SLDS-02 | slides_read | presentations.get → extract slides/shapes/text/objectIds |
| SLDS-03 | slides_add_slide | batchUpdate createSlide with optional layout |
| SLDS-04 | slides_insert_text | batchUpdate deleteText + insertText (replace) |

---

*Phase: 04-slides*
*Design approved: 2026-03-22*
