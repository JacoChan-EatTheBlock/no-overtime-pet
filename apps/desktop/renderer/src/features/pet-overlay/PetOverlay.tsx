import { useRef } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import styles from './PetOverlay.module.css'

/** Screen-px movement below this is a click, not a drag. */
const DRAG_THRESHOLD = 4

/**
 * PetOverlay — content of the transparent, always-on-top pet window
 * (see `createPetWindow` in main/index.ts).
 *
 * Dragging is done manually via mouse events + IPC, NOT `-webkit-app-region:
 * drag` — that CSS property swallows click events entirely on an element
 * (https://github.com/electron/electron/issues/1354 and friends), and the
 * character image fills the whole window so there's no spare non-drag area
 * to carve out for the click target. Tracking mousedown → mousemove → mouseup
 * ourselves lets a plain click still toggle the main window while a real
 * drag still repositions it.
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
  const dragged = useRef(false)

  function handleContextMenu(event: ReactMouseEvent): void {
    event.preventDefault()
    window.petShell?.requestContextMenu()
  }

  function handleMouseDown(event: ReactMouseEvent): void {
    if (event.button !== 0) return
    dragged.current = false
    const startX = event.screenX
    const startY = event.screenY
    window.petShell?.dragStart(startX, startY)

    function onMove(moveEvent: globalThis.MouseEvent): void {
      if (
        !dragged.current &&
        (Math.abs(moveEvent.screenX - startX) > DRAG_THRESHOLD ||
          Math.abs(moveEvent.screenY - startY) > DRAG_THRESHOLD)
      ) {
        dragged.current = true
      }
      window.petShell?.dragMove(moveEvent.screenX, moveEvent.screenY)
    }

    function onUp(): void {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.petShell?.dragEnd()
      if (!dragged.current) {
        window.petShell?.toggleMainWindow()
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div className={styles.stage} onContextMenu={handleContextMenu} onMouseDown={handleMouseDown}>
      <img className={styles.sprite} src="/assets/capybara/idle.png" alt="" draggable={false} />
    </div>
  )
}
