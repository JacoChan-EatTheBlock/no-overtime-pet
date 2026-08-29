import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * 像素 UI 的构建配置。
 *
 * `node:crypto` 别名是关键：src/ 下的逻辑层是为 Node 写的，直接 import 了 randomUUID
 * 和 createHash。别名到 web/shims/node-crypto.ts 后，同一份逻辑源码不加改动即可在浏览器里跑，
 * Node 侧（demo / web-server / 单测）仍然用真正的 node:crypto。
 */
export default defineConfig({
  root: resolve(import.meta.dirname, 'web'),
  base: './',
  plugins: [react()],
  resolve: {
    alias: [{ find: /^node:crypto$/, replacement: resolve(import.meta.dirname, 'web/shims/node-crypto.ts') }]
  },
  build: {
    outDir: resolve(import.meta.dirname, 'web/dist'),
    emptyOutDir: true
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    // dev 模式下 API 仍由 Node 侧代理，Key 不进浏览器。
    proxy: { '/api': 'http://127.0.0.1:4173' }
  }
})
