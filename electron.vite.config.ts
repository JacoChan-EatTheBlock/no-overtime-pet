import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: resolve('apps/desktop/main/index.ts')
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    build: {
      rollupOptions: {
        input: resolve('apps/desktop/preload/index.ts'),
        // 必须输出 CommonJS：主窗口开着 sandbox: true，而沙箱化的 preload 不支持 ESM。
        // 根 package.json 是 "type": "module"，默认会产出 .mjs，那样 preload 会静默不加载，
        // contextBridge 暴露的 desktopShell / notAI 在渲染进程里全是 undefined。
        output: {
          format: 'cjs',
          entryFileNames: 'index.cjs'
        }
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: resolve('apps/desktop/renderer'),
    build: {
      rollupOptions: {
        input: resolve('apps/desktop/renderer/index.html')
      }
    },
    resolve: {
      alias: [
        { find: '@renderer', replacement: resolve('apps/desktop/renderer/src') },
        { find: '@domain', replacement: resolve('apps/desktop/shared/domain') },
        // 逻辑层是照 Node 写的，直接 import 了 randomUUID / createHash。
        // 渲染进程开着 sandbox 拿不到 Node，别名到垫片后同一份源码两端通用。
        { find: /^node:crypto$/, replacement: resolve('apps/desktop/renderer/src/shims/node-crypto.ts') }
      ]
    },
    plugins: [react()]
  }
})
