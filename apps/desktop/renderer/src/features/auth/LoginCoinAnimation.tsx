/**
 * LoginCoinAnimation — PixiJS canvas that plays the "coin hits capybara"
 * loop on the login screen.
 *
 * Sequence (loops forever):
 *   1. IDLE  — capybara sits still (frame 0) for ~1.8 s
 *   2. COIN_DROP — 8-frame coin-fall effect at 12 fps
 *   3. HIT_REACT — on impact (drop frame 7) the 16-frame capybara
 *      reaction plays at 10 fps
 *   4. → back to IDLE
 *
 * Three decorative coins fall continuously in the background to
 * match the design-reference keyframe.
 *
 * Asset manifests:
 *   - capybara/coin-hit-v1/character-action-manifest.prototype.json
 *   - effects/coin-drop-v2/effect-manifest.prototype.json
 */

import { useEffect, useRef } from 'react'
import {
  Application,
  BaseTexture,
  Container,
  Rectangle,
  SCALE_MODES,
  Sprite,
  Texture,
} from 'pixi.js'

/* ═══════════════════════════════════════════════════════════════════
   Asset URLs (resolved from renderer/public/)
   ═══════════════════════════════════════════════════════════════════ */
const CHAR_SHEET_URL = '/assets/capybara/coin-hit-v1/NANG_FEE_HEAD_HIT.png'
const DROP_STRIP_URL = '/assets/effects/coin-drop-v2/NANG_FEE_COIN_DROP-strip.png'
const COIN_SINGLE_URL = '/assets/capybara/coin-hit-v1/coin.png'

/* ═══════════════════════════════════════════════════════════════════
   Sprite-sheet geometry (from prototype manifests)
   ═══════════════════════════════════════════════════════════════════ */

/** capybara hit reaction — 4 × 4 grid, 192 px frames, 10 fps */
const CHAR = {
  fw: 192,
  fh: 192,
  cols: 4,
  total: 16,
  fps: 10,
  /** head anchor in character-local coords */
  headX: 96,
  headY: 30,
} as const

/** coin-drop effect — 8 × 1 strip, 96 × 160 px frames, 12 fps */
const DROP = {
  fw: 96,
  fh: 160,
  cols: 8,
  total: 8,
  fps: 12,
  impactFrame: 7,
  /** impact point in effect-local coords */
  impactX: 48,
  impactY: 154,
} as const

/* ═══════════════════════════════════════════════════════════════════
   Canvas logical size & scene layout
   ═══════════════════════════════════════════════════════════════════ */
const W = 300
const H = 400

// Character sits bottom-right with a little padding
const CHAR_X = W - CHAR.fw - 16 // 92
const CHAR_Y = H - CHAR.fh - 8 // 200

// Coin-drop positioned so its impact point hits the character head
const DROP_X = CHAR_X + CHAR.headX - DROP.impactX // 140
const DROP_Y = CHAR_Y + CHAR.headY - DROP.impactY // 76

// Milliseconds to sit idle between loops
const IDLE_PAUSE_MS = 1800

/* ═══════════════════════════════════════════════════════════════════
   Decorative background coins (design keyframe reference)
   ═══════════════════════════════════════════════════════════════════ */
const DECO_COINS = [
  { x: 56, startY: -30, endY: 200, speed: 72, scale: 1.5 },
  { x: 224, startY: -50, endY: 180, speed: 92, scale: 1.8 },
  { x: 134, startY: -20, endY: 250, speed: 66, scale: 1.6 },
] as const

/* ═══════════════════════════════════════════════════════════════════
   Texture helpers
   ═══════════════════════════════════════════════════════════════════ */

function loadBase(url: string): Promise<BaseTexture> {
  return new Promise<BaseTexture>((resolve, reject) => {
    const bt = BaseTexture.from(url, { scaleMode: SCALE_MODES.NEAREST })
    if (bt.valid) {
      resolve(bt)
      return
    }
    bt.once('loaded', () => resolve(bt))
    bt.once('error', (_bt: BaseTexture, ev: ErrorEvent) =>
      reject(new Error(`Texture load failed: ${url} — ${ev.message}`)),
    )
  })
}

function sliceSheet(
  base: BaseTexture,
  fw: number,
  fh: number,
  cols: number,
  total: number,
): Texture[] {
  const out: Texture[] = []
  for (let i = 0; i < total; i++) {
    out.push(
      new Texture(
        base,
        new Rectangle((i % cols) * fw, Math.floor(i / cols) * fh, fw, fh),
      ),
    )
  }
  return out
}

/* ═══════════════════════════════════════════════════════════════════
   Internal types
   ═══════════════════════════════════════════════════════════════════ */

type Phase = 'idle' | 'coinDrop' | 'hitReact'

interface DecoCoinState {
  sprite: Sprite
  startY: number
  endY: number
  speed: number
  y: number
}

/* ═══════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════ */

export interface LoginCoinAnimationProps {
  className?: string
}

export function LoginCoinAnimation({ className }: LoginCoinAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined

    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let disposed = false
    let app: Application | null = null

    void (async () => {
      try {
        /* ── 1. Load all textures in parallel ──────────────────── */
        const [charBase, dropBase, coinBase] = await Promise.all([
          loadBase(CHAR_SHEET_URL),
          loadBase(DROP_STRIP_URL),
          loadBase(COIN_SINGLE_URL),
        ])
        if (disposed) return

        /* ── 2. Slice sprite sheets ────────────────────────────── */
        const charFrames = sliceSheet(
          charBase,
          CHAR.fw,
          CHAR.fh,
          CHAR.cols,
          CHAR.total,
        )
        const dropFrames = sliceSheet(
          dropBase,
          DROP.fw,
          DROP.fh,
          DROP.cols,
          DROP.total,
        )
        const coinTex = new Texture(coinBase)

        /* ── 3. Create PIXI Application ────────────────────────── */
        app = new Application({
          width: W,
          height: H,
          backgroundAlpha: 0,
          resolution: 1,
          autoDensity: false,
          antialias: false,
        })

        const canvas = app.view as HTMLCanvasElement
        canvas.style.display = 'block'
        canvas.style.width = '100%'
        canvas.style.height = '100%'
        canvas.style.objectFit = 'contain'
        canvas.style.imageRendering = 'pixelated'
        /* webkit fallback */
        canvas.style.setProperty('-webkit-image-rendering', 'pixelated')
        el.appendChild(canvas)

        /* ── 4. Scene hierarchy ────────────────────────────────── */

        // 4a — Decorative coins (behind character)
        const decoLayer = new Container()
        app.stage.addChild(decoLayer)

        const decoStates: DecoCoinState[] = DECO_COINS.map((cfg, idx) => {
          const s = new Sprite(coinTex)
          s.scale.set(cfg.scale)
          s.anchor.set(0.5)
          s.x = cfg.x
          // Stagger initial position so coins don't sync
          const range = cfg.endY - cfg.startY
          const initialY = cfg.startY + (idx / DECO_COINS.length) * range
          s.y = initialY
          s.alpha = 0
          decoLayer.addChild(s)
          return {
            sprite: s,
            startY: cfg.startY,
            endY: cfg.endY,
            speed: cfg.speed,
            y: initialY,
          }
        })

        // 4b — Character
        const charSprite = new Sprite(charFrames[0])
        charSprite.x = CHAR_X
        charSprite.y = CHAR_Y
        app.stage.addChild(charSprite)

        // 4c — Coin-drop effect (starts hidden)
        const dropSprite = new Sprite(dropFrames[0])
        dropSprite.x = DROP_X
        dropSprite.y = DROP_Y
        dropSprite.visible = false
        app.stage.addChild(dropSprite)

        /* ── 5. Reduced-motion shortcut ────────────────────────── */
        if (prefersReduced) {
          charSprite.texture = charFrames[4]
          // Show deco coins at static positions, visible
          for (const dc of decoStates) {
            dc.sprite.alpha = 0.85
          }
          return
        }

        /* ── 6. Animation loop ─────────────────────────────────── */
        let phase: Phase = 'idle'
        let elapsed = 0
        let charFrame = 0
        let dropFrame = 0

        const charMs = 1000 / CHAR.fps // 100 ms per frame
        const dropMs = 1000 / DROP.fps // ~83.3 ms per frame

        app.ticker.add(() => {
          if (!app) return
          const dt = app.ticker.deltaMS
          elapsed += dt

          /* ── Main state machine ───────────────────────────── */
          switch (phase) {
            case 'idle': {
              charSprite.texture = charFrames[0]
              dropSprite.visible = false
              if (elapsed >= IDLE_PAUSE_MS) {
                phase = 'coinDrop'
                elapsed = 0
                dropFrame = 0
                dropSprite.visible = true
                dropSprite.texture = dropFrames[0]
              }
              break
            }

            case 'coinDrop': {
              const f = Math.min(
                Math.floor(elapsed / dropMs),
                DROP.total - 1,
              )
              if (f !== dropFrame) {
                dropFrame = f
                dropSprite.texture = dropFrames[dropFrame]
              }
              // Impact — switch to hit reaction
              if (dropFrame >= DROP.impactFrame) {
                phase = 'hitReact'
                elapsed = 0
                charFrame = 0
                dropSprite.visible = false
                charSprite.texture = charFrames[0]
              }
              break
            }

            case 'hitReact': {
              const f = Math.min(
                Math.floor(elapsed / charMs),
                CHAR.total - 1,
              )
              if (f !== charFrame) {
                charFrame = f
                charSprite.texture = charFrames[charFrame]
              }
              // All 16 frames played → back to idle
              if (elapsed >= CHAR.total * charMs) {
                phase = 'idle'
                elapsed = 0
                charSprite.texture = charFrames[0]
              }
              break
            }
          }

          /* ── Decorative coins (always running) ────────────── */
          for (const dc of decoStates) {
            dc.y += dc.speed * (dt / 1000)
            if (dc.y > dc.endY) {
              dc.y = dc.startY
            }
            dc.sprite.y = dc.y

            // Fade in / out near edges
            const range = dc.endY - dc.startY
            const progress = (dc.y - dc.startY) / range
            if (progress < 0.15) {
              dc.sprite.alpha = progress / 0.15
            } else if (progress > 0.8) {
              dc.sprite.alpha = Math.max(0, (1 - progress) / 0.2)
            } else {
              dc.sprite.alpha = 1
            }
          }
        })
      } catch (err) {
        // Graceful fallback: in test environments (JSDOM) or when
        // WebGL is unavailable, the PIXI Application will fail to
        // initialise.  We simply leave the container empty.
        // eslint-disable-next-line no-console
        console.warn('[LoginCoinAnimation] PixiJS init failed:', err)
      }
    })()

    return () => {
      disposed = true
      if (app) {
        const canvas = app.view as HTMLCanvasElement
        canvas.parentNode?.removeChild(canvas)
        app.destroy(true, { children: true, texture: false, baseTexture: false })
        app = null
      }
    }
  }, [])

  return <div ref={containerRef} className={className} aria-hidden="true" />
}
