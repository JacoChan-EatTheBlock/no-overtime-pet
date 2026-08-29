import { join } from 'node:path'
import { app, BrowserWindow, ipcMain } from 'electron'

let mainWindow: BrowserWindow | null = null

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 780,
    minWidth: 900,
    minHeight: 700,
    show: false,
    frame: false,
    transparent: false,
    backgroundColor: '#dce9f0',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
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
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
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
