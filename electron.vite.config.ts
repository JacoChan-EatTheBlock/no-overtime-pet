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
        input: resolve('apps/desktop/preload/index.ts')
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: resolve('apps/desktop/renderer'),
    server: {
      port: Number(process.env.RENDERER_PORT ?? 5173)
    },
    build: {
      rollupOptions: {
        input: resolve('apps/desktop/renderer/index.html')
      }
    },
    resolve: {
      alias: {
        '@renderer': resolve('apps/desktop/renderer/src')
      }
    },
    plugins: [react()]
  }
})
