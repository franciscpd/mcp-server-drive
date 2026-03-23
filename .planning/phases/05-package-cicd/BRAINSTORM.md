# Phase 5: Package + CI/CD — Design Spec

**Created:** 2026-03-22
**Status:** Approved
**Approach:** Sequential (A) — repo → CI → publish → README → tag

## Overview

Publish the MCP server as `@franciscpd/drive-mcp-server` v1.0.0 on npm. Add GitHub Actions for CI and publish. Write a README covering setup for 4 Google APIs and documenting 25 tools.

## 1. Version + Repository

- Update `package.json` version from `0.1.0` to `1.0.0`
- Create GitHub repo `franciscpd/mcp-server-drive` (public, MIT)
- Push existing code to `main`

## 2. CI Workflow

File: `.github/workflows/ci.yml`

Exact copy of gmail/calendar pattern:
- **Trigger:** push to `main` + PRs to `main`
- **Runner:** ubuntu-latest
- **Steps:** checkout → setup-node (22, cache npm) → `npm ci` → `npm run build` → `npm test`

## 3. Publish Workflow

File: `.github/workflows/publish.yml`

Exact copy of gmail/calendar pattern:
- **Trigger:** push tags `v*.*.*`
- **Permissions:** `contents: read`, `id-token: write` (npm OIDC provenance)
- **Runner:** ubuntu-latest
- **Steps:** checkout → setup-node (22, cache npm, registry-url) → `npm ci` → `npm run build` → `npm test` → `npm publish --access public`

## 4. README Structure

File: `README.md`

### Header
- Package name: `@franciscpd/drive-mcp-server`
- Badges: CI status, npm version, MIT license
- One-liner: MCP server for Google Drive, Docs, Sheets, and Slides

### Quick Start
- `npx -y @franciscpd/drive-mcp-server`
- Env var table: 3 required (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN) + 1 optional (LOG_LEVEL)

### Setup Guide (per API)
1. Create a Google Cloud Project
2. Enable APIs — 4 subsections: Drive API, Docs API, Sheets API, Slides API
3. Create OAuth2 Credentials — scopes: `drive`, `documents`, `spreadsheets`, `presentations`
4. Get a Refresh Token — OAuth Playground with all 4 scopes selected

### Configuration Examples
- Claude Desktop (`claude_desktop_config.json`)
- Cursor (MCP settings)
- Generic MCP Client (bash env vars)
- All include `LOG_LEVEL` as optional env var

### Tools (25 total, grouped by API)

**Drive (11 tools):**
| Tool | Description |
|------|-------------|
| `drive_search` | Search files with query syntax |
| `drive_list` | List folder contents with pagination |
| `drive_create_folder` | Create folders |
| `drive_upload` | Upload text files |
| `drive_read` | Read/download file content |
| `drive_delete` | Soft-delete files (trash) |
| `drive_move` | Move files between folders |
| `drive_copy` | Copy files |
| `drive_rename` | Rename files |
| `drive_share` | Share files (set permissions) |
| `drive_list_shared_drives` | List shared drives |

**Docs (6 tools):**
| Tool | Description |
|------|-------------|
| `docs_create` | Create new Google Docs |
| `docs_read` | Read document content |
| `docs_insert_text` | Insert text at position |
| `docs_delete_text` | Delete text range |
| `docs_list_comments` | List document comments |
| `docs_add_comment` | Add comment to document |

**Sheets (4 tools):**
| Tool | Description |
|------|-------------|
| `sheets_create` | Create spreadsheets with initial data |
| `sheets_read` | Read cell ranges (A1 notation) |
| `sheets_update` | Update cell ranges |
| `sheets_list` | List sheets/tabs |

**Slides (4 tools):**
| Tool | Description |
|------|-------------|
| `slides_create` | Create presentations |
| `slides_read` | Read slide content |
| `slides_add_slide` | Add slides to presentation |
| `slides_insert_text` | Insert text into placeholders |

### Development
Standard commands: `npm install`, `npm run build`, `npm test`, `npm run test:coverage`, `npm start`

### License
MIT

## 5. Execution Sequence

1. Update `package.json` version → `1.0.0`
2. Create `.github/workflows/ci.yml`
3. Create `.github/workflows/publish.yml`
4. Create `README.md`
5. Commit all changes
6. Create GitHub repo (`gh repo create`)
7. Push to `main`
8. Verify CI passes
9. Tag `v1.0.0` + push tag
10. Verify publish workflow + npm package

## Decisions

| Decision | Rationale |
|----------|-----------|
| v1.0.0 initial release | Matches gmail/calendar servers |
| Sequential execution | Each step validates the previous |
| README per-API sections | 4 APIs need clear separation in setup and tools |
| OIDC npm provenance | No manual secrets, matches companion projects |
| Simple CI (build + test only) | Matches gmail/calendar, no lint/typecheck/coverage gate |

## Canonical References

- `/home/franciscpd/Projects/mcp-server-gmail/.github/workflows/ci.yml` — CI pattern
- `/home/franciscpd/Projects/mcp-server-gmail/.github/workflows/publish.yml` — Publish pattern
- `/home/franciscpd/Projects/mcp-server-gmail/README.md` — README structure
- `.planning/phases/05-package-cicd/5-CONTEXT.md` — Phase decisions

---

*Phase: 05-package-cicd*
*Spec created: 2026-03-22*
