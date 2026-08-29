import type { MouseEvent } from 'react'
import styles from './PetOverlay.module.css'

/**
 * PetOverlay — content of the transparent, always-on-top pet window
 * (see `createPetWindow` in main/index.ts).
 *
 * Only the static idle capybara portrait is wired up so far: the general
 * sprite-sheet character (`engine/PetEngine` + `components/PetCanvas`) has no
 * manifest that defines an `IDLE` loop yet, only the login screen's one-shot
 * "coin hits head" reaction (`capybara/coin-hit-v1`). Swap the `<img>` below
 * for `<PetCanvas manifest={...} action="IDLE" transparent />` once a real
 * idle sprite sheet + manifest exists — don't fake a loop out of assets that
 * aren't meant for it.
 */
export function PetOverlay() {
  function handleContextMenu(event: MouseEvent): void {
    event.preventDefault()
    window.petShell?.requestContextMenu()
  }

  // 整块拖拽区域上的普通点击（不是拖动）依然会正常触发 click——拖动靠鼠标按下后位移，
  // 两者互不冲突，不用另外做手势判定。
  function handleClick(): void {
    window.petShell?.toggleMainWindow()
  }

  return (
    <div className={styles.stage} onContextMenu={handleContextMenu} onClick={handleClick}>
      <img className={styles.sprite} src="/assets/capybara/idle.png" alt="" draggable={false} />
    </div>
  )
}
