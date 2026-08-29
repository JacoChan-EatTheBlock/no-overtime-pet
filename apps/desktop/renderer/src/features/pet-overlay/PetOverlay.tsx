import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { PetCanvas } from '../../components/PetCanvas'
import type { CharacterManifest } from '../../engine'
import styles from './PetOverlay.module.css'

/** Screen-px movement below this is a click, not a drag. */
const DRAG_THRESHOLD = 4

const MANIFEST_URL = '/assets/characters/capybara/1.0.0/manifest.json'
const ASSET_BASE_PATH = '/assets/characters/capybara/1.0.0/'

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
 * The manifest under public/assets/characters/capybara/1.0.0/ was hand-built
 * from design/no-overtime-pet-core-animation-pack-v1/ — that pack's own
 * per-action manifests use ad-hoc action names (WORK_NORMAL/SLACKING/
 * TYPE_FRENZY) that don't exist in the actual `PetAction` union
 * (engine/PetStateMachine.ts), which docs/prd/08-pet-actions.md defines as
 * the authoritative list. Remapped here: WORK_NORMAL → IDLE, SLACKING →
 * SLACK_SECRETLY, TYPE_FRENZY → TYPE_BOTH (best semantic match; revisit if
 * product intent differs). If the manifest fails to load, falls back to the
 * static idle portrait rather than showing a blank window.
 */
export function PetOverlay() {
  const dragged = useRef(false)
  const [manifest, setManifest] = useState<CharacterManifest | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(MANIFEST_URL)
      .then((res) => res.json())
      .then((data: CharacterManifest) => {
        if (!cancelled) setManifest(data)
      })
      .catch((err: unknown) => {
        console.error('[PetOverlay] failed to load character manifest, using static fallback:', err)
      })
    return () => {
      cancelled = true
    }
  }, [])

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
      {manifest ? (
        <PetCanvas
          manifest={manifest}
          assetBasePath={ASSET_BASE_PATH}
          action="IDLE"
          width={192}
          height={192}
          transparent
        />
      ) : (
        <img className={styles.fallbackSprite} src="/assets/capybara/idle.png" alt="" draggable={false} />
      )}
    </div>
  )
}
