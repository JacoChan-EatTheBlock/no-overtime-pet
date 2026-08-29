import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  root: resolve('apps/desktop/renderer'),
  resolve: {
    alias: {
      '@renderer': resolve('apps/desktop/renderer/src')
    }
  },
  plugins: [react()],
  server: {
    host: '127.0.0.1'
  },
  build: {
    outDir: resolve('out/renderer-browser'),
    emptyOutDir: true
  }
})
