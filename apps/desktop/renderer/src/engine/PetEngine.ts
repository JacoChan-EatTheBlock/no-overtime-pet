/**
 * PetEngine — PixiJS Application initialisation & canvas management.
 *
 * Responsibilities:
 *  1. Create & own the PIXI.Application (WebGL / Canvas fallback).
 *  2. Integer-multiple scaling with NEAREST sampling.
 *  3. Device-pixel-ratio awareness (Retina ↔ non-Retina).
 *  4. Sprite lifecycle: play/swap action, update hat anchors.
 *  5. Pause / resume rendering when hidden or minimised.
 *  6. GPU-not-available graceful degradation (static frame).
 *
 * PRD references:
 *   - 08-pet-actions §6: rendering & pixel-art constraints
 *   - 08-pet-actions §9: performance budget
 *   - 11-asset-pipeline-contract §5: CharacterManifest
 */

import {
  Application,
  type AnimatedSprite,
  Container,
  SCALE_MODES,
  settings,
} from 'pixi.js';

import type { PetAction } from './PetStateMachine';
import {
  computeIntegerScale,
  SpriteSheetLoader,
  type CharacterManifest,
  type LoadedCharacter,
} from './SpriteSheetLoader';
import { HatStack, type HatManifest } from './HatStack';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface PetEngineConfig {
  /** Logical canvas width (pixels, before scaling). Default from manifest. */
  logicalWidth?: number;
  /** Logical canvas height (pixels, before scaling). Default from manifest. */
  logicalHeight?: number;
  /** Force a specific integer scale factor. If omitted, auto-detected. */
  scale?: number;
  /** Transparent background (for overlay window). Default true. */
  transparent?: boolean;
  /** Target FPS cap. Default 30. */
  maxFps?: number;
  /** Base URL for character assets. */
  assetBasePath: string;
}

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

export interface PetEngineCallbacks {
  /** Fired when an action's animation reaches a tagged event frame. */
  onEventFrame?: (actionId: string, eventName: string, frame: number) => void;
  /** Fired when a non-looping animation finishes. */
  onAnimationComplete?: (actionId: string) => void;
}

// ---------------------------------------------------------------------------
// PetEngine
// ---------------------------------------------------------------------------

export class PetEngine {
  private _app: Application | null = null;
  private _loader: SpriteSheetLoader | null = null;
  private _character: LoadedCharacter | null = null;
  private _manifest: CharacterManifest | null = null;

  // Scene hierarchy: root → characterLayer → hatLayer
  private _root = new Container();
  private _characterSprite: AnimatedSprite | null = null;
  private _hatStack = new HatStack();

  // Action state
  private _currentActionId: string = 'IDLE';
  private _currentEventFrames: Record<string, number[]> = {};

  // Scaling
  private _logicalWidth = 128;
  private _logicalHeight = 128;
  private _scale = 2;
  private _dpr = 1;

  // Lifecycle
  private _running = false;
  private _disposed = false;
  private readonly _config: PetEngineConfig;
  private readonly _callbacks: PetEngineCallbacks;

  constructor(config: PetEngineConfig, callbacks: PetEngineCallbacks = {}) {
    this._config = config;
    this._callbacks = callbacks;
  }

  // ── Initialisation ──────────────────────────────────────────────────────

  /**
   * Create the PIXI Application and attach it to a DOM container.
   * Must be called once before any rendering.
   */
  async init(container: HTMLElement): Promise<void> {
    if (this._disposed) throw new Error('PetEngine has been disposed');
    if (this._app) throw new Error('PetEngine already initialised');

    // Force NEAREST globally before any texture is loaded.
    settings.SCALE_MODE = SCALE_MODES.NEAREST;

    this._dpr = window.devicePixelRatio || 1;

    const transparent = this._config.transparent ?? true;
    const maxFps = this._config.maxFps ?? 30;

    this._app = new Application({
      width: this._logicalWidth * this._scale,
      height: this._logicalHeight * this._scale,
      backgroundAlpha: transparent ? 0 : 1,
      backgroundColor: 0x000000,
      resolution: this._dpr,
      autoDensity: true,
      antialias: false,
      // Cap tick frequency.
    });

    // Cap ticker to maxFps.
    this._app.ticker.maxFPS = maxFps;

    // Append canvas.
    container.appendChild(this._app.view as HTMLCanvasElement);

    // Build scene graph.
    this._app.stage.addChild(this._root);
    this._root.addChild(this._hatStack.container);

    this._running = true;
  }

  // ── Character loading ───────────────────────────────────────────────────

  /**
   * Load a character from its manifest JSON.
   */
  async loadCharacter(manifest: CharacterManifest): Promise<void> {
    this._manifest = manifest;
    this._logicalWidth =
      this._config.logicalWidth ?? manifest.canvas.width;
    this._logicalHeight =
      this._config.logicalHeight ?? manifest.canvas.height;

    this._loader?.dispose();
    this._loader = new SpriteSheetLoader({
      basePath: this._config.assetBasePath,
    });

    this._character = await this._loader.loadCharacter(manifest);

    // Recalculate scale.
    if (this._config.scale) {
      this._scale = this._config.scale;
    } else {
      this._scale = computeIntegerScale(
        this._logicalWidth,
        this._logicalHeight,
        (this._app?.screen.width ?? 256),
        (this._app?.screen.height ?? 256),
      );
    }

    this._resizeCanvas();
    this._playAction('IDLE');
  }

  // ── Action control ──────────────────────────────────────────────────────

  /**
   * Switch to a different PetAction.
   * Applies fallback chain if the action is missing from the character.
   */
  setAction(action: PetAction, intensity: 1 | 2 | 3 = 1): void {
    if (!this._character || !this._loader) return;

    if (action === this._currentActionId) {
      // Same action — only update speed for intensity change.
      this._applyIntensity(intensity);
      return;
    }

    this._playAction(action);
    this._applyIntensity(intensity);
  }

  /** Get the currently playing action id. */
  get currentAction(): string {
    return this._currentActionId;
  }

  // ── Hat management ──────────────────────────────────────────────────────

  get hatStack(): HatStack {
    return this._hatStack;
  }

  /**
   * Push a hat onto the stack.
   */
  async addHat(manifest: HatManifest, textureUrl: string): Promise<void> {
    await this._hatStack.pushHatFromUrl(manifest, textureUrl);
    this._updateHatAnchor();
    this._applyAutoScale();
  }

  /**
   * Remove the top hat.
   */
  removeTopHat(): void {
    this._hatStack.popHat();
    this._applyAutoScale();
  }

  // ── Resize / DPR ────────────────────────────────────────────────────────

  /**
   * Handle external resize (e.g. window resize, DPR change).
   */
  resize(viewportWidth: number, viewportHeight: number): void {
    if (!this._config.scale) {
      this._scale = computeIntegerScale(
        this._logicalWidth,
        this._logicalHeight,
        viewportWidth,
        viewportHeight,
      );
    }

    this._dpr = window.devicePixelRatio || 1;
    this._resizeCanvas();
  }

  // ── Pause / resume (PRD §9: hidden → pause) ────────────────────────────

  /**
   * Pause the render loop (hidden / minimised).
   * Reduces CPU to near-zero.
   */
  pause(): void {
    if (!this._running) return;
    this._running = false;
    this._app?.ticker.stop();
    this._characterSprite?.stop();
  }

  /**
   * Resume rendering.
   */
  resume(): void {
    if (this._running) return;
    if (this._disposed) return;
    this._running = true;
    this._app?.ticker.start();
    this._characterSprite?.play();
  }

  get isRunning(): boolean {
    return this._running;
  }

  // ── Accessors ───────────────────────────────────────────────────────────

  get app(): Application | null {
    return this._app;
  }

  get scale(): number {
    return this._scale;
  }

  get logicalWidth(): number {
    return this._logicalWidth;
  }

  get logicalHeight(): number {
    return this._logicalHeight;
  }

  get character(): LoadedCharacter | null {
    return this._character;
  }

  // ── Dispose ─────────────────────────────────────────────────────────────

  /**
   * Destroy the engine and release all GPU resources.
   */
  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this._running = false;

    this._hatStack.dispose();
    this._loader?.dispose();
    this._characterSprite?.destroy();
    this._characterSprite = null;

    if (this._app) {
      const canvas = this._app.view as HTMLCanvasElement;
      canvas.parentElement?.removeChild(canvas);
      this._app.destroy(true, { children: true, texture: true, baseTexture: true });
      this._app = null;
    }
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private _playAction(actionId: string): void {
    if (!this._character || !this._loader) return;

    // Remove previous sprite.
    if (this._characterSprite) {
      this._characterSprite.stop();
      this._root.removeChild(this._characterSprite);
      this._characterSprite.destroy();
      this._characterSprite = null;
    }

    const sprite = this._loader.createAnimatedSprite(
      this._character,
      actionId,
    );

    if (!sprite) {
      // Ultimate fallback: blank placeholder.
      this._currentActionId = 'IDLE';
      return;
    }

    this._characterSprite = sprite;
    this._currentActionId = actionId;

    // Event frames tracking.
    const actionDef = this._character.manifest.actions[actionId];
    this._currentEventFrames = actionDef?.eventFrames ?? {};

    // Wire callbacks.
    sprite.onFrameChange = (frame: number) => {
      for (const [eventName, frames] of Object.entries(
        this._currentEventFrames,
      )) {
        if (frames.includes(frame)) {
          this._callbacks.onEventFrame?.(actionId, eventName, frame);
        }
      }
    };

    sprite.onComplete = () => {
      this._callbacks.onAnimationComplete?.(actionId);
    };

    // Anchor at feet for stable positioning (PRD 08 §6).
    const feet = this._character.manifest.anchors.feet;
    sprite.anchor.set(
      feet.x / this._character.manifest.canvas.width,
      feet.y / this._character.manifest.canvas.height,
    );

    // Position at bottom-center of logical canvas.
    sprite.x = this._logicalWidth / 2;
    sprite.y = this._logicalHeight;

    // Add below hats.
    this._root.addChildAt(sprite, 0);

    sprite.play();

    // Update hat anchor chain.
    this._updateHatAnchor();
    this._hatStack.invalidateCache();
  }

  private _applyIntensity(intensity: 1 | 2 | 3): void {
    if (!this._characterSprite || !this._character) return;

    const def = this._character.manifest.actions[this._currentActionId];
    if (!def) return;

    // Faster animation for higher intensity.
    const baseFps = def.fps / 60;
    const speedMultiplier = 1 + (intensity - 1) * 0.3;
    this._characterSprite.animationSpeed = baseFps * speedMultiplier;
  }

  private _updateHatAnchor(): void {
    if (!this._character || !this._characterSprite) return;

    const head = this._character.manifest.anchors.head;

    // Head anchor in world-space (relative to character sprite position).
    const worldHeadX =
      this._characterSprite.x -
      this._characterSprite.anchor.x * this._characterSprite.width +
      head.x;
    const worldHeadY =
      this._characterSprite.y -
      this._characterSprite.anchor.y * this._characterSprite.height +
      head.y;

    this._hatStack.setCharacterHeadAnchor({ x: worldHeadX, y: worldHeadY });
  }

  private _applyAutoScale(): void {
    if (!this._manifest) return;

    const autoScale = this._hatStack.computeAutoScale(
      this._manifest.canvas.height,
      this._logicalHeight,
    );
    this._root.scale.set(autoScale);
  }

  private _resizeCanvas(): void {
    if (!this._app) return;

    const physW = this._logicalWidth * this._scale;
    const physH = this._logicalHeight * this._scale;

    this._app.renderer.resize(physW, physH);
    this._root.scale.set(this._scale);

    // Set CSS size for correct hit areas.
    const canvas = this._app.view as HTMLCanvasElement;
    canvas.style.width = `${physW}px`;
    canvas.style.height = `${physH}px`;
  }
}
