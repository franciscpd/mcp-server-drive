# Phase 5: Package + CI/CD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish `@franciscpd/drive-mcp-server` v1.0.0 on npm with GitHub Actions CI/CD and a comprehensive README.

**Architecture:** Create GitHub repo, add CI workflow (test on push/PR) and publish workflow (tag-triggered with OIDC provenance), write README with per-API setup guide and grouped tool reference, then tag and publish.

**Tech Stack:** GitHub Actions, npm (OIDC provenance), gh CLI

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `package.json` | Bump version to 1.0.0 |
| Create | `.github/workflows/ci.yml` | CI pipeline: build + test on push/PR |
| Create | `.github/workflows/publish.yml` | Publish pipeline: build + test + publish on tag |
| Create | `README.md` | Setup guide, tool reference, config examples |

---

### Task 1: Bump version to 1.0.0

**Files:**
- Modify: `package.json:3`

- [ ] **Step 1: Update version field**

In `package.json`, change:
```json
"version": "0.1.0",
```
to:
```json
"version": "1.0.0",
```

- [ ] **Step 2: Verify build still works**

Run: `npm run build && npm test`
Expected: Build succeeds, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: bump version to 1.0.0"
```

---

### Task 2: Create CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Write ci.yml**

Create `.github/workflows/ci.yml` with this exact content (matches gmail/calendar pattern):

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm test
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions test workflow"
```

---

### Task 3: Create publish workflow

**Files:**
- Create: `.github/workflows/publish.yml`

- [ ] **Step 1: Write publish.yml**

Create `.github/workflows/publish.yml` with this exact content (matches gmail/calendar pattern):

```yaml
name: Publish

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm publish --access public
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/publish.yml
git commit -m "ci: add GitHub Actions publish workflow"
```

---

### Task 4: Create README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README.md**

Create `README.md` with this content:

```markdown
# @franciscpd/drive-mcp-server

[![CI](https://github.com/franciscpd/mcp-server-drive/actions/workflows/ci.yml/badge.svg)](https://github.com/franciscpd/mcp-server-drive/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@franciscpd/drive-mcp-server)](https://www.npmjs.com/package/@franciscpd/drive-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for Google Drive, Docs, Sheets, and Slides. Manage files, documents, spreadsheets, and presentations through AI agents — powered by 3 environment variables.

## Quick Start

​```bash
npx -y @franciscpd/drive-mcp-server
​```

Set these environment variables:

| Variable | Description |
|----------|-------------|
| `GOOGLE_DRIVE_CLIENT_ID` | OAuth2 client ID from Google Cloud Console |
| `GOOGLE_DRIVE_CLIENT_SECRET` | OAuth2 client secret |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | OAuth2 refresh token (see [Setup Guide](#setup-guide)) |
| `LOG_LEVEL` | *(optional)* Logging verbosity: `debug`, `info`, `warn`, `error` (default: `info`) |

## Setup Guide

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Note your project name for the next steps

### 2. Enable APIs

Navigate to **APIs & Services** → **Library** and enable each of the following:

#### Drive API
1. Search for "Google Drive API"
2. Click **Enable**

#### Docs API
1. Search for "Google Docs API"
2. Click **Enable**

#### Sheets API
1. Search for "Google Sheets API"
2. Click **Enable**

#### Slides API
1. Search for "Google Slides API"
2. Click **Enable**

### 3. Create OAuth2 Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. If prompted, configure the **OAuth consent screen**:
   - User type: **External** (or Internal for Workspace)
   - Add the scopes:
     - `https://www.googleapis.com/auth/drive`
     - `https://www.googleapis.com/auth/documents`
     - `https://www.googleapis.com/auth/spreadsheets`
     - `https://www.googleapis.com/auth/presentations`
   - Add your email as a test user
4. Application type: **Web application**
5. Add `https://developers.google.com/oauthplayground` as an authorized redirect URI
6. Save your **Client ID** and **Client Secret**

### 4. Get a Refresh Token

1. Go to [Google OAuth2 Playground](https://developers.google.com/oauthplayground)
2. Click the gear icon (top right) and check **Use your own OAuth credentials**
3. Enter your **Client ID** and **Client Secret**
4. In the left panel, select these scopes:
   - **Drive API v3** → `https://www.googleapis.com/auth/drive`
   - **Google Docs API v1** → `https://www.googleapis.com/auth/documents`
   - **Google Sheets API v4** → `https://www.googleapis.com/auth/spreadsheets`
   - **Google Slides API v1** → `https://www.googleapis.com/auth/presentations`
5. Click **Authorize APIs** and grant access
6. Click **Exchange authorization code for tokens**
7. Copy the **Refresh token**

## Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

​```json
{
  "mcpServers": {
    "google-drive": {
      "command": "npx",
      "args": ["-y", "@franciscpd/drive-mcp-server"],
      "env": {
        "GOOGLE_DRIVE_CLIENT_ID": "your-client-id",
        "GOOGLE_DRIVE_CLIENT_SECRET": "your-client-secret",
        "GOOGLE_DRIVE_REFRESH_TOKEN": "your-refresh-token",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
​```

### Cursor

Add to your Cursor MCP settings:

​```json
{
  "mcpServers": {
    "google-drive": {
      "command": "npx",
      "args": ["-y", "@franciscpd/drive-mcp-server"],
      "env": {
        "GOOGLE_DRIVE_CLIENT_ID": "your-client-id",
        "GOOGLE_DRIVE_CLIENT_SECRET": "your-client-secret",
        "GOOGLE_DRIVE_REFRESH_TOKEN": "your-refresh-token",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
​```

### Generic MCP Client

​```bash
GOOGLE_DRIVE_CLIENT_ID=your-client-id \
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret \
GOOGLE_DRIVE_REFRESH_TOKEN=your-refresh-token \
LOG_LEVEL=debug \
npx -y @franciscpd/drive-mcp-server
​```

The server communicates over **stdio** using the MCP protocol.

## Tools

### Drive

| Tool | Description |
|------|-------------|
| `drive_search` | Search files across Google Drive using query syntax |
| `drive_list` | List files and folders in a specific folder |
| `drive_create_folder` | Create a new folder in Google Drive |
| `drive_upload` | Upload a text file to Google Drive |
| `drive_read` | Read file content (exports Docs as Markdown, Sheets as CSV, Slides as plain text) |
| `drive_delete` | Move a file or folder to trash (soft delete) |
| `drive_move` | Move a file to a different folder |
| `drive_copy` | Copy a file with optional new name and parent |
| `drive_rename` | Rename a file or folder |
| `drive_share` | Share a file or folder with a user by email |
| `drive_list_shared_drives` | List available Shared Drives |

### Docs

| Tool | Description |
|------|-------------|
| `docs_create` | Create a new Google Doc with optional initial content |
| `docs_read` | Read document content as plain text with paragraph indices |
| `docs_insert_text` | Insert text at a specific position |
| `docs_delete_text` | Delete a range of text |
| `docs_list_comments` | List all comments on a document |
| `docs_add_comment` | Add a comment to a document |

### Sheets

| Tool | Description |
|------|-------------|
| `sheets_create` | Create a new spreadsheet with optional initial data |
| `sheets_read` | Read cell values from a range (A1 notation) |
| `sheets_update` | Update cell values in a range (literal text, no formula execution) |
| `sheets_list` | List all sheets (tabs) in a spreadsheet |

### Slides

| Tool | Description |
|------|-------------|
| `slides_create` | Create a new Google Slides presentation |
| `slides_read` | Read presentation content including objectIds and text |
| `slides_add_slide` | Add a new slide with optional layout |
| `slides_insert_text` | Insert or replace text in a slide shape |

## Development

​```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Start the server
npm start
​```

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup guide and tool reference"
```

---

### Task 5: Create GitHub repo and push

- [ ] **Step 1: Create the repo**

```bash
gh repo create franciscpd/mcp-server-drive --public --source=. --push
```

This creates the repo, sets origin, and pushes `main` in one command.

- [ ] **Step 2: Verify CI runs**

```bash
gh run list --limit 1
```

Expected: A CI workflow run triggered by the push to `main`. Wait for it to complete:

```bash
gh run watch
```

Expected: All steps pass (build + test).

---

### Task 6: Tag v1.0.0 and publish

- [ ] **Step 1: Create and push tag**

```bash
git tag v1.0.0
git push origin v1.0.0
```

- [ ] **Step 2: Verify publish workflow**

```bash
gh run list --limit 1 --workflow publish.yml
```

Wait for completion:

```bash
gh run watch
```

Expected: Publish workflow succeeds — package appears on npm.

- [ ] **Step 3: Verify npm package**

```bash
npm view @franciscpd/drive-mcp-server version
```

Expected: `1.0.0`

---

## Requirements Traceability

| Requirement | Task | Verification |
|-------------|------|--------------|
| PACK-01: Published as @franciscpd/drive-mcp-server | Task 6 | `npm view` returns 1.0.0 |
| PACK-02: Binary registered as drive-mcp-server | Already in package.json | `npx @franciscpd/drive-mcp-server` runs |
| PACK-03: CI workflow (test on push) | Task 2 | CI passes on push to main |
| PACK-04: Publish workflow (publish on tag) | Task 3 + 6 | Publish workflow triggers on v1.0.0 tag |
| PACK-05: README with setup + tools + examples | Task 4 | README.md exists with all sections |
