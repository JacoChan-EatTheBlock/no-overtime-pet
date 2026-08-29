/// <reference types="vite/client" />

interface DesktopShellApi {
  minimizeMainWindow: () => void
  toggleMaximizeMainWindow: () => void
  hideMainWindow: () => void
}

/** 由 preload 注入；实现在主进程 ai-gateway，密钥不进渲染进程。 */
interface NotAiApi {
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

declare global {
  interface Window {
    desktopShell?: DesktopShellApi
    notAI: NotAiApi
  }
}

export {}
