import { IconMinus, IconSquare, IconX } from '@tabler/icons-react'
import styles from './PixelWindowHeader.module.css'

function callShell(action: keyof NonNullable<Window['desktopShell']>): void {
  window.desktopShell?.[action]()
}

export function PixelWindowHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <img className="pixel-art" src="/assets/capybara/idle.png" alt="" />
        <span>不要加班</span>
      </div>
      <div className={styles.controls}>
        <button
          type="button"
          aria-label="最小化"
          onClick={() => callShell('minimizeMainWindow')}
        >
          <IconMinus size={20} stroke={2} />
        </button>
        <button
          type="button"
          aria-label="最大化或还原"
          onClick={() => callShell('toggleMaximizeMainWindow')}
        >
          <IconSquare size={17} stroke={2} />
        </button>
        <button type="button" aria-label="隐藏窗口" onClick={() => callShell('hideMainWindow')}>
          <IconX size={20} stroke={2} />
        </button>
      </div>
    </header>
  )
}
