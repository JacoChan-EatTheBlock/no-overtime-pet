import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen } from 'electron';
import { join } from 'path';

let mainWindow: BrowserWindow | null = null;
let petWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const isDev = process.env.NODE_ENV !== 'production';

// ─── IPC Handlers ─────────────────────────────────────────────

ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('platform:getPermissions', () => ({
  accessibility: false,
  inputMonitoring: false,
  screenRecording: false,
}));

// ─── Windows ──────────────────────────────────────────────────

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 680,
    minWidth: 600,
    minHeight: 400,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    // Vite dev server. Use 127.0.0.1 explicitly: on some setups `localhost`
    // resolves to ::1 only (or vice versa) and the load fails with ERR_FAILED.
    const devUrl = 'http://127.0.0.1:5173';
    for (let attempt = 1; attempt <= 20; attempt++) {
      try {
        await mainWindow.loadURL(devUrl);
        break;
      } catch (err) {
        if (attempt === 20) {
          console.error(`[main] Vite dev server not reachable at ${devUrl}`, err);
          break;
        }
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    console.log('[main] Window ready');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function createPetWindow() {
  const display = screen.getPrimaryDisplay();
  const { workArea } = display;

  petWindow = new BrowserWindow({
    width: 200,
    height: 200,
    x: workArea.x + workArea.width - 220,
    y: workArea.y + workArea.height - 220,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    focusable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Pet window will load its own page later
  // For now just log position
  console.log(`[main] Pet window at (${workArea.x + workArea.width - 220}, ${workArea.y + workArea.height - 220})`);
}

function createTray() {
  // Use a simple template image for macOS menu bar
  // In production, replace with proper 18x18 icon
  const icon = nativeImage.createEmpty();
  
  try {
    // Try to load tray icon if it exists
    const iconPath = join(__dirname, '../../assets/tray-icon.png');
    const loadedIcon = nativeImage.createFromPath(iconPath);
    if (!loadedIcon.isEmpty()) {
      tray = new Tray(loadedIcon.resize({ width: 18, height: 18 }));
    } else {
      // Fallback: create a simple colored icon
      tray = new Tray(nativeImage.createEmpty());
    }
  } catch {
    tray = new Tray(nativeImage.createEmpty());
  }

  const contextMenu = Menu.buildFromTemplate([
    { label: '🐱 不要加班', enabled: false },
    { type: 'separator' },
    { label: '打开主窗口', click: () => mainWindow?.show() || createMainWindow() },
    { label: '显示/隐藏桌宠', click: () => {
      if (petWindow?.isVisible()) petWindow.hide();
      else petWindow?.show();
    }},
    { type: 'separator' },
    { label: '退出', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('不要加班');
  
  // Click tray icon to show main window
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.focus() : mainWindow.show();
    } else {
      createMainWindow();
    }
  });
}

// ─── App Lifecycle ────────────────────────────────────────────

app.whenReady().then(async () => {
  console.log('[main] App ready');
  console.log(`[main] Platform: ${process.platform}, Arch: ${process.arch}`);
  console.log(`[main] Electron: ${process.versions.electron}`);

  createTray();
  await createMainWindow();
  // Pet window disabled for initial dev — enable when PixiJS ready
  // await createPetWindow();
});

// macOS: keep running when all windows closed (tray app)
app.on('window-all-closed', () => {
  // Don't quit on macOS — live in menu bar
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // macOS: re-create window when dock icon clicked
  if (!mainWindow) {
    createMainWindow();
  } else {
    mainWindow.show();
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
