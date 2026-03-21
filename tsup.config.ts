import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'es2024',
  dts: false,
  clean: true,
  sourcemap: false,
  banner: { js: '#!/usr/bin/env node' },
});
