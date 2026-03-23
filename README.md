# @franciscpd/drive-mcp-server

[![CI](https://github.com/franciscpd/mcp-server-drive/actions/workflows/ci.yml/badge.svg)](https://github.com/franciscpd/mcp-server-drive/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@franciscpd/drive-mcp-server)](https://www.npmjs.com/package/@franciscpd/drive-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for Google Drive, Docs, Sheets, and Slides. Manage files, documents, spreadsheets, and presentations through AI agents — powered by 3 environment variables.

## Quick Start

```bash
npx -y @franciscpd/drive-mcp-server
```

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

```json
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
```

### Cursor

Add to your Cursor MCP settings:

```json
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
```

### Generic MCP Client

```bash
GOOGLE_DRIVE_CLIENT_ID=your-client-id \
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret \
GOOGLE_DRIVE_REFRESH_TOKEN=your-refresh-token \
LOG_LEVEL=debug \
npx -y @franciscpd/drive-mcp-server
```

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

```bash
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
```

## License

MIT
