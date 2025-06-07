import * as esbuild from 'npm:esbuild';
import { chmodSync } from 'node:fs';

const result = await esbuild.build({
  entryPoints: ['src/stdio.ts'],
  bundle: true,
  outfile: 'dist/mcp',
  platform: 'node',
  format: 'esm',
  banner: {
    js: '#!/usr/bin/env node',
  },
});

chmodSync('dist/mcp', 0o755);
console.log(result);
