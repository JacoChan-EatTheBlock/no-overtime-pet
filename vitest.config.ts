import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@renderer', replacement: resolve('apps/desktop/renderer/src') },
      { find: '@domain', replacement: resolve('apps/desktop/shared/domain') }
      // 单测跑在 Node 上，node:crypto 用真的，不走渲染进程垫片。
    ]
  },
  test: {
    environment: 'jsdom',
    setupFiles: [resolve('apps/desktop/renderer/src/test-setup.ts')],
    css: true,
    globals: true,
    // prototype/ 自带 node:test runner（cd prototype && npm test），不是 vitest 套件。
    exclude: ['**/node_modules/**', '**/dist/**', 'out/**', 'prototype/**']
  }
})
