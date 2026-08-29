import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { 'main/index': 'src/main/index.ts' },
    format: ['cjs'],
    outDir: 'dist',
    platform: 'node',
    target: 'node20',
    external: ['electron'],
    clean: true,
    sourcemap: true,
  },
  {
    entry: { 'preload/index': 'src/preload/index.ts' },
    format: ['cjs'],
    outDir: 'dist',
    platform: 'node',
    target: 'node20',
    external: ['electron'],
    sourcemap: true,
  },
]);
