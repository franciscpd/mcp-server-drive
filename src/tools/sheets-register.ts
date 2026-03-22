import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { sheets_v4 } from 'googleapis';
import { registerSheetsCreate } from './sheets-create.js';
import { registerSheetsRead } from './sheets-read.js';
import { registerSheetsUpdate } from './sheets-update.js';
import { registerSheetsList } from './sheets-list.js';

export function registerSheetsTools(server: McpServer, sheets: sheets_v4.Sheets): void {
  registerSheetsCreate(server, sheets);
  registerSheetsRead(server, sheets);
  registerSheetsUpdate(server, sheets);
  registerSheetsList(server, sheets);
}
