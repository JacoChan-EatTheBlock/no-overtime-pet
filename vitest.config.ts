import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@renderer': resolve('apps/desktop/renderer/src'),
      '@no-overtime/contracts': resolve('packages/contracts/src/index.ts')
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: [resolve('apps/desktop/renderer/src/test-setup.ts')],
    css: true,
    globals: true
  }
})
