import * as esbuild from 'esbuild';
import { chmodSync } from 'node:fs';

await esbuild.build({
  entryPoints: ['src/stdio.ts'],
  bundle: true,
  outfile: 'dist/mcp',
  platform: 'node',
  format: 'esm',
  target: 'node24',
  packages: 'external',
  banner: {
    js: '#!/usr/bin/env node',
  },
});

chmodSync('dist/mcp', 0o755);
