import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron';
import { join } from 'path';
import { initPlatform } from './platform/macos';

let mainWindow: BrowserWindow | null = null;
let petWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 680,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    await mainWindow.loadURL('http://localhost:5173');
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow?.show());
}

async function createPetWindow() {
  const { workArea } = require('electron').screen.getPrimaryDisplay();

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
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // TODO: Load pet renderer page
}

function createTray() {
  const icon = nativeImage.createFromPath(join(__dirname, '../../assets/tray-icon.png'));
  tray = new Tray(icon.resize({ width: 18, height: 18 }));
  
  const contextMenu = Menu.buildFromTemplate([
    { label: '打开设置', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('不要加班');
}

app.whenReady().then(async () => {
  await initPlatform();
  createTray();
  await createMainWindow();
  await createPetWindow();
});

app.on('window-all-closed', () => {
  // macOS: keep running in tray
});

app.on('activate', () => {
  if (!mainWindow) createMainWindow();
  else mainWindow.show();
});
