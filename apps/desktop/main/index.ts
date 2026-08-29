import { join, normalize, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { app, BrowserWindow, ipcMain, net, protocol } from 'electron'
import { aiStatus, handleAnalyzeTask, handleGenerateSchedule, loadEnv } from './ai-gateway.js'

let mainWindow: BrowserWindow | null = null

const RENDERER_DIR = join(__dirname, '../renderer')

/**
 * 生产环境用 app:// 提供渲染产物，而不是 loadFile 的 file://。
 *
 * 渲染层到处用绝对路径引用 public 资产（`/assets/capybara/idle.png`）。在 file:// 下
 * 这些会被解析到文件系统根目录而全部 404——开发时走 http 看不出来，打包后才炸。
 * 换成 app:// 后 origin 固定为 app://bundle，绝对路径重新指向渲染产物目录。
 */
function registerAppProtocol(): void {
  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url)
    const decoded = decodeURIComponent(pathname)
    const target = join(RENDERER_DIR, normalize(decoded))
    // 目录穿越防护：任何解析到产物目录之外的请求一律拒绝。
    if (target !== RENDERER_DIR && !target.startsWith(RENDERER_DIR + sep)) {
      return new Response('Forbidden', { status: 403 })
    }
    return net.fetch(pathToFileURL(target).toString())
  })
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 880,
    minWidth: 1120,
    minHeight: 780,
    show: false,
    frame: false,
    transparent: false,
    backgroundColor: '#dce9f0',
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadURL('app://bundle/index.html')
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 必须在 app ready 之前声明，否则 app:// 拿不到标准 scheme 的相对路径解析和 fetch 能力。
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }
])

app.whenReady().then(() => {
  loadEnv(app.getAppPath())
  registerAppProtocol()
  const status = aiStatus()
  console.log(`[not] Task AI: ${status.taskAi ? 'SiliconFlow enabled' : 'baseline fallback'}`)
  console.log(`[not] Schedule AI: ${status.scheduleAi ? 'SiliconFlow enabled' : 'baseline fallback'}`)

  // AI 只在主进程调用；失败一律由逻辑层降级到确定性基线，不把供应商错误原文透给渲染进程。
  ipcMain.handle('ai:status', () => aiStatus())
  ipcMain.handle('ai:analyze-task', (_event, payload: unknown) => handleAnalyzeTask(payload))
  ipcMain.handle('ai:generate-schedule', (_event, payload: unknown) => handleGenerateSchedule(payload))

  ipcMain.on('shell:minimize-main-window', () => {
    mainWindow?.minimize()
  })

  ipcMain.on('shell:toggle-maximize-main-window', () => {
    if (!mainWindow) return
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
  })

  ipcMain.on('shell:hide-main-window', () => {
    mainWindow?.hide()
  })

  createMainWindow()

  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show()
      return
    }

    createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
