import { join } from 'node:path'
import { app, BrowserWindow, ipcMain } from 'electron'
import { DesktopIpcChannels } from '@no-overtime/contracts'

let mainWindow: BrowserWindow | null = null

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 780,
    minWidth: 900,
    minHeight: 700,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
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
  ipcMain.on(DesktopIpcChannels.minimizeMainWindow, () => {
    mainWindow?.minimize()
  })

  ipcMain.on(DesktopIpcChannels.toggleMaximizeMainWindow, () => {
    if (!mainWindow) return
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
  })

  ipcMain.on(DesktopIpcChannels.hideMainWindow, () => {
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
