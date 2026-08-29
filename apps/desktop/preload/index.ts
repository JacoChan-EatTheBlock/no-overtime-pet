import { contextBridge, ipcRenderer } from 'electron'

export interface DesktopShellApi {
  minimizeMainWindow: () => void
  toggleMaximizeMainWindow: () => void
  hideMainWindow: () => void
}

const desktopShell: DesktopShellApi = {
  minimizeMainWindow: () => ipcRenderer.send('shell:minimize-main-window'),
  toggleMaximizeMainWindow: () => ipcRenderer.send('shell:toggle-maximize-main-window'),
  hideMainWindow: () => ipcRenderer.send('shell:hide-main-window')
}

contextBridge.exposeInMainWorld('desktopShell', desktopShell)
