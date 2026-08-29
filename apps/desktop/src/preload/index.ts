import { contextBridge, ipcRenderer } from 'electron';

/**
 * Minimal-privilege IPC Bridge
 * Only expose what the renderer strictly needs.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform
  getPlatformPermissions: () => ipcRenderer.invoke('platform:getPermissions'),
  requestPermission: (perm: string) => ipcRenderer.invoke('platform:requestPermission', perm),

  // Tasks
  onTasksUpdated: (callback: () => void) => {
    ipcRenderer.on('tasks:updated', callback);
    return () => ipcRenderer.removeListener('tasks:updated', callback);
  },

  // Pet
  onActivityChanged: (callback: (activity: unknown) => void) => {
    ipcRenderer.on('activity:changed', (_e, data) => callback(data));
    return () => ipcRenderer.removeListener('activity:changed', callback);
  },

  // App
  getAppVersion: () => ipcRenderer.invoke('app:version'),
});
