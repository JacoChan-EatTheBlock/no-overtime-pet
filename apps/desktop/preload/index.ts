import { contextBridge, ipcRenderer } from 'electron'

export interface DesktopShellApi {
  minimizeMainWindow: () => void
  toggleMaximizeMainWindow: () => void
  hideMainWindow: () => void
}

/**
 * 渲染进程唯一的 AI 入口。这里只转发结构化参数，不持有密钥、不拼 prompt、不碰供应商地址——
 * 那些都在主进程的 ai-gateway 里。任何调用失败都由主进程降级成确定性基线后再返回。
 */
export interface NotAiApi {
  status: () => Promise<{ taskAi: boolean; scheduleAi: boolean }>
  analyzeTask: (payload: {
    taskId: string
    title: string
    dueAt: number
    importance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    taskRevision?: number
    history?: unknown[]
  }) => Promise<unknown>
  generateSchedule: (payload: {
    nowMs: number
    settings: { workStart: string; lunchStart: string; lunchEnd: string; workEnd: string }
    tasks: unknown[]
  }) => Promise<unknown>
}

export interface PetShellApi {
  requestContextMenu: () => void
  toggleMainWindow: () => void
  /** 手动拖拽实现的三段式：down 记起点，move 跟随，up 结束（见主进程 pet:drag-* 处理）。 */
  dragStart: (screenX: number, screenY: number) => void
  dragMove: (screenX: number, screenY: number) => void
  dragEnd: () => void
}

const desktopShell: DesktopShellApi = {
  minimizeMainWindow: () => ipcRenderer.send('shell:minimize-main-window'),
  toggleMaximizeMainWindow: () => ipcRenderer.send('shell:toggle-maximize-main-window'),
  hideMainWindow: () => ipcRenderer.send('shell:hide-main-window')
}

const petShell: PetShellApi = {
  requestContextMenu: () => ipcRenderer.send('pet:context-menu'),
  toggleMainWindow: () => ipcRenderer.send('pet:toggle-main-window'),
  dragStart: (screenX, screenY) => ipcRenderer.send('pet:drag-start', screenX, screenY),
  dragMove: (screenX, screenY) => ipcRenderer.send('pet:drag-move', screenX, screenY),
  dragEnd: () => ipcRenderer.send('pet:drag-end')
}

const notAI: NotAiApi = {
  status: () => ipcRenderer.invoke('ai:status'),
  analyzeTask: (payload) => ipcRenderer.invoke('ai:analyze-task', payload),
  generateSchedule: (payload) => ipcRenderer.invoke('ai:generate-schedule', payload)
}

contextBridge.exposeInMainWorld('desktopShell', desktopShell)
contextBridge.exposeInMainWorld('notAI', notAI)
contextBridge.exposeInMainWorld('petShell', petShell)
