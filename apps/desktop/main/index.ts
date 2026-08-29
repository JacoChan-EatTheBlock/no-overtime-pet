import { join, normalize, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { app, BrowserWindow, Menu, ipcMain, net, protocol, screen } from 'electron'
import { aiStatus, handleAnalyzeTask, handleGenerateSchedule, loadEnv } from './ai-gateway.js'

let mainWindow: BrowserWindow | null = null
let petWindow: BrowserWindow | null = null
/** 手动拖拽悬浮窗时，鼠标屏幕坐标相对窗口原点的偏移——drag-start 记一次，drag-move 一直复用。 */
let petDragOffset: { dx: number; dy: number } | null = null

const RENDERER_DIR = join(__dirname, '../renderer')
const PET_WINDOW_SIZE = 192
const PET_WINDOW_MARGIN = 24

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

/**
 * @param autoShow 启动时先隐藏主窗口，只露桌宠——点桌宠再唤出（见 toggleMainWindow）。
 *   activate（Dock 图标点击）或桌宠点击时重新创建的场景，希望一加载完就露出来，传 true。
 */
function createMainWindow(autoShow: boolean): void {
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

  if (autoShow) {
    mainWindow.once('ready-to-show', () => {
      mainWindow?.show()
    })
  }

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadURL('app://bundle/index.html')
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/** 点桌宠触发：主窗口没创建过就创建并显示；创建过就按当前可见性切换。 */
function toggleMainWindow(): void {
  if (!mainWindow) {
    createMainWindow(true)
    return
  }
  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    mainWindow.show()
    mainWindow.focus()
  }
}

/** 桌宠悬浮窗固定贴当前主屏 workArea 右下角，不用 bounds——workArea 已经把 Dock 和菜单栏让出来了。 */
function petCornerPosition(): { x: number; y: number } {
  const { workArea } = screen.getPrimaryDisplay()
  return {
    x: workArea.x + workArea.width - PET_WINDOW_SIZE - PET_WINDOW_MARGIN,
    y: workArea.y + workArea.height - PET_WINDOW_SIZE - PET_WINDOW_MARGIN
  }
}

function resetPetWindowPosition(): void {
  if (!petWindow) return
  const { x, y } = petCornerPosition()
  petWindow.setPosition(Math.round(x), Math.round(y))
}

function createPetWindow(): void {
  const { x, y } = petCornerPosition()

  petWindow = new BrowserWindow({
    width: PET_WINDOW_SIZE,
    height: PET_WINDOW_SIZE,
    x: Math.round(x),
    y: Math.round(y),
    show: false,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    movable: true,
    fullscreenable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  // 'floating' 而非默认层级：默认层级在切到别的全屏 App 时会被盖住，'floating' 在普通 Spaces 下更稳定。
  // 盖在别的全屏 App 上目前是 Electron/macOS 已知的不可靠行为（PET-MAC-002 待确认），这里不强求。
  petWindow.setAlwaysOnTop(true, 'floating')
  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false })

  petWindow.once('ready-to-show', () => {
    petWindow?.show()
  })

  const petUrl = process.env.ELECTRON_RENDERER_URL
    ? `${process.env.ELECTRON_RENDERER_URL}?window=pet`
    : 'app://bundle/index.html?window=pet'
  void petWindow.loadURL(petUrl)

  petWindow.on('closed', () => {
    petWindow = null
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

  ipcMain.on('pet:context-menu', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    Menu.buildFromTemplate([{ label: '重置桌宠位置', click: () => resetPetWindowPosition() }]).popup({ window: win })
  })

  ipcMain.on('pet:toggle-main-window', () => toggleMainWindow())

  // 手动拖拽（不用 -webkit-app-region: drag——那个会吃掉 click，见 PetOverlay 组件注释）。
  ipcMain.on('pet:drag-start', (event, screenX: number, screenY: number) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    const [winX, winY] = win.getPosition()
    petDragOffset = { dx: screenX - winX, dy: screenY - winY }
  })

  ipcMain.on('pet:drag-move', (event, screenX: number, screenY: number) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || !petDragOffset) return
    win.setPosition(Math.round(screenX - petDragOffset.dx), Math.round(screenY - petDragOffset.dy))
  })

  ipcMain.on('pet:drag-end', () => {
    petDragOffset = null
  })

  createMainWindow(false)
  createPetWindow()

  // Dock 位置/自动隐藏变化、外接显示器插拔都会改变 workArea，悬浮窗贴角位置要跟着重算。
  screen.on('display-metrics-changed', () => resetPetWindowPosition())
  screen.on('display-added', () => resetPetWindowPosition())
  screen.on('display-removed', () => resetPetWindowPosition())

  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show()
    } else {
      createMainWindow(true)
    }
    if (!petWindow) {
      createPetWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
