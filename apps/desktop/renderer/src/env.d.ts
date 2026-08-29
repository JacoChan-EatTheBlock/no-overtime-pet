/// <reference types="vite/client" />

interface DesktopShellApi {
  minimizeMainWindow: () => void
  toggleMaximizeMainWindow: () => void
  hideMainWindow: () => void
}

declare global {
  interface Window {
    desktopShell?: DesktopShellApi
  }
}

export {}
