# Phase 4: Slides Tools - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Claude can create Google Slides presentations, read their content (slides, titles, text, objectIds), add new slides, and insert/update text in slide placeholders. 4 tools total.

</domain>

<decisions>
## Implementation Decisions

### All at Claude's Discretion

User deferred all decisions — phase is small (4 tools) with 100% established patterns from Phases 1-3. The following defaults apply:

### Slides reading (SLDS-02)
- **D-01:** `slides_read` returns structured JSON: `{ presentationId, title, slides: [{ objectId, pageElements: [{ objectId, type, text }] }] }` — each slide with its objectId and page elements (shapes/text boxes) with their objectId, type, and text content
- **D-02:** Text extracted from `shape.text.textElements[].textRun.content` — concatenated per shape

### Slides creation (SLDS-01)
- **D-03:** `slides_create(title)` creates a presentation via `presentations.create`. Returns `{ presentationId, title, url }`

### Adding slides (SLDS-03)
- **D-04:** `slides_add_slide(presentation_id, layout?)` uses `presentations.batchUpdate` with `createSlide` request. Optional predefined layout (BLANK, TITLE, TITLE_AND_BODY, etc.). Default: BLANK

### Text insertion (SLDS-04)
- **D-05:** `slides_insert_text(presentation_id, object_id, text)` uses `presentations.batchUpdate` with `insertText` request. The agent uses objectIds from `slides_read` to target specific placeholders/shapes

### Registration
- **D-06:** `registerSlidesTools(server, slides: slides_v1.Slides)` — receives just the Slides client, same pattern as Sheets

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches based on established codebase patterns.

</specifics>

<canonical_refs>
## Canonical References

### Existing code
- `src/tools/docs-create.ts` — closest pattern (API with batchUpdate for content)
- `src/tools/docs-read.ts` — closest pattern (extracting structured content with IDs)
- `src/tools/test-helpers.ts` — extend with `createMockSlides()`
- `src/tools/register.ts` — add `registerSlidesTools(server, client.slides)`

### Google API
- Slides API v1: `presentations.create`, `presentations.get`, `presentations.batchUpdate` (createSlide, insertText)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- All Phase 1-3 utilities (safeToolHandler, captureToolHandler, format utilities)
- `docs-register.ts` / `sheets-register.ts` pattern for the slides hub

### Integration Points
- `src/tools/register.ts` → add `registerSlidesTools(server, client.slides)` (replace Phase 4 comment)
- New files: `src/tools/slides-*.ts` (4 tool files + tests)
- `src/tools/slides-register.ts` — hub for 4 Slides tools

</code_context>

<deferred>
## Deferred Ideas

- Delete, duplicate, reorder slides — SLDS-05 in v2
- Speaker notes (read/write) — SLDS-06 in v2
- Find and replace text — SLDS-07 in v2
- Shape/text box creation and layout control — SLDS-09 in v2

</deferred>

---

*Phase: 04-slides*
*Context gathered: 2026-03-22*
