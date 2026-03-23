# Phase 5: Package + CI/CD - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Publish the server as `@franciscpd/drive-mcp-server` on npm, add GitHub Actions workflows for CI (test on push/PR) and publish (on tag), and write a README with setup instructions, tool reference, and usage examples.

</domain>

<decisions>
## Implementation Decisions

### README structure
- **D-01:** Badges at top: CI status, npm version, MIT license — same as gmail/calendar servers
- **D-02:** Setup Guide organized per API: Drive API, Docs API, Sheets API, Slides API — each section shows how to enable the API and which OAuth scope to select
- **D-03:** Tools table grouped by API category: Drive (11 tools), Docs (6 tools), Sheets (4 tools), Slides (4 tools)
- **D-04:** Project treated as independent — no references to gmail/calendar servers in setup guide

### MCP client configuration examples
- **D-05:** Three config examples: Claude Desktop, Cursor, Generic MCP Client — same sections as gmail README
- **D-06:** Include `LOG_LEVEL` as optional env var in config examples (e.g. `"LOG_LEVEL": "debug"`)
- **D-07:** No mention of global installation (`npm i -g`) — `npx -y` is the only documented approach

### CI workflow
- **D-08:** Simple pipeline: `npm ci → npm run build → npm test` — no lint, type-check, or coverage gate
- **D-09:** Trigger: push to main + pull requests to main
- **D-10:** Node 22, ubuntu-latest — match gmail/calendar servers exactly

### Publish workflow
- **D-11:** Trigger: push tags `v*.*.*`
- **D-12:** npm provenance via OIDC (`id-token: write` permission) — no manual NODE_AUTH_TOKEN secret
- **D-13:** Publish pipeline: `npm ci → build → test → npm publish --access public`
- **D-14:** Same structure as gmail/calendar publish.yml

### Claude's Discretion
- Tool descriptions in README table (derived from tool registration strings)
- Quick Start section wording
- Development section content

</decisions>

<specifics>
## Specific Ideas

No specific requirements — follow gmail server README as template, adapting for 4 APIs and 25 tools.

</specifics>

<canonical_refs>
## Canonical References

### Companion server patterns (source of truth for workflow YAML and README structure)
- `/home/franciscpd/Projects/mcp-server-gmail/.github/workflows/ci.yml` — CI workflow pattern
- `/home/franciscpd/Projects/mcp-server-gmail/.github/workflows/publish.yml` — Publish workflow pattern
- `/home/franciscpd/Projects/mcp-server-gmail/README.md` — README structure, badges, setup guide, tool table format

### Project requirements
- `.planning/REQUIREMENTS.md` §Package — PACK-01 through PACK-05

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `package.json` already has correct name (`@franciscpd/drive-mcp-server`), bin (`drive-mcp-server`), files (`dist`), scripts (`build`, `test`, `prepublishOnly`), and keywords

### Established Patterns
- `tsup` build with `#!/usr/bin/env node` banner — binary is `dist/index.js`
- 25 tools registered across 4 categories: drive_* (13), docs_* (6), sheets_* (4), slides_* (4)
- 3 env vars: GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN
- Optional LOG_LEVEL env var for stderr logging verbosity

### Integration Points
- `.github/workflows/ci.yml` — new file
- `.github/workflows/publish.yml` — new file
- `README.md` — new file at project root

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-package-cicd*
*Context gathered: 2026-03-22*
