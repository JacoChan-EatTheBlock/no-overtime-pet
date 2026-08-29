import { contextBridge, ipcRenderer } from 'electron'
import { DesktopIpcChannels } from '@no-overtime/contracts'

export interface DesktopShellApi {
  minimizeMainWindow: () => void
  toggleMaximizeMainWindow: () => void
  hideMainWindow: () => void
}

const desktopShell: DesktopShellApi = {
  minimizeMainWindow: () => ipcRenderer.send(DesktopIpcChannels.minimizeMainWindow),
  toggleMaximizeMainWindow: () => ipcRenderer.send(DesktopIpcChannels.toggleMaximizeMainWindow),
  hideMainWindow: () => ipcRenderer.send(DesktopIpcChannels.hideMainWindow)
}

contextBridge.exposeInMainWorld('desktopShell', desktopShell)
