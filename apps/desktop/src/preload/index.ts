const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  getPlatformPermissions: () => ipcRenderer.invoke('platform:getPermissions'),
});
