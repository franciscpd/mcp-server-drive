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
