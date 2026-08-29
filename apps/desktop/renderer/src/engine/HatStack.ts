/**
 * HatStack — Anchor-based hat stacking with unlimited layers.
 *
 * PRD references:
 *   - 08-pet-actions §8: hat stacking render order & anchor rules
 *   - 11-asset-pipeline-contract §6: HatManifest schema
 *
 * Stacking rule:
 *   Hat[0].bottomAttach → character.head anchor
 *   Hat[N].bottomAttach → Hat[N-1].topAttach
 *
 * Render order: character back → character → hats[0…N] → foreground FX.
 *
 * Auto-scale: when the total stack height exceeds the viewport, the entire
 * scene scales down uniformly rather than dropping any hat.
 *
 * Static hat layers can be composited into a single cached texture for
 * performance; the cache is invalidated on action change (anchor shift).
 */

import {
  BaseTexture,
  Container,
  Rectangle,
  RenderTexture,
  SCALE_MODES,
  Sprite,
  Texture,
  type IRenderer,
} from 'pixi.js';

import type { Point2D } from './SpriteSheetLoader';

// ---------------------------------------------------------------------------
// Hat Manifest  (PRD 11 §6)
// ---------------------------------------------------------------------------

export interface HatManifest {
  readonly schemaVersion: '1.0';
  readonly hatId: string;
  readonly assetVersion: string;
  readonly texture: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly scaleMode: 'NEAREST';
  readonly anchors: {
    readonly bottomAttach: Point2D;
    readonly topAttach: Point2D;
  };
  readonly compatibleCharacterTags: string[];
  readonly contentHashSha256: string;
}

// ---------------------------------------------------------------------------
// Runtime hat entry
// ---------------------------------------------------------------------------

export interface HatStackEntry {
  readonly manifest: HatManifest;
  readonly sprite: Sprite;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface HatStackConfig {
  /** Minimum allowed scene-level scale before switching to scroll viewport. */
  minSceneSacle?: number;
}

// ---------------------------------------------------------------------------
// HatStack
// ---------------------------------------------------------------------------

export class HatStack {
  private readonly _container = new Container();
  private readonly _entries: HatStackEntry[] = [];
  private readonly _minSceneScale: number;
  private _characterHeadAnchor: Point2D = { x: 0, y: 0 };
  private _cachedTexture: RenderTexture | null = null;
  private _cacheValid = false;

  constructor(config: HatStackConfig = {}) {
    this._minSceneScale = config.minSceneSacle ?? 0.4;
    this._container.sortableChildren = false; // we manage order manually
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /** The PIXI Container for all hat sprites. Add to your scene. */
  get container(): Container {
    return this._container;
  }

  /** Current number of stacked hats. */
  get count(): number {
    return this._entries.length;
  }

  /** Total pixel height of the hat stack (unscaled). */
  get stackHeight(): number {
    if (this._entries.length === 0) return 0;

    let height = 0;
    for (const entry of this._entries) {
      const m = entry.manifest;
      height += m.frameHeight - m.anchors.bottomAttach.y + m.anchors.topAttach.y;
    }
    // Add the bottom portion of the first hat
    height += this._entries[0].manifest.anchors.bottomAttach.y;
    return Math.max(0, height);
  }

  /**
   * Set the character's head anchor position.
   * Hat[0].bottomAttach aligns to this point.
   */
  setCharacterHeadAnchor(anchor: Point2D): void {
    this._characterHeadAnchor = anchor;
    this._cacheValid = false;
    this._repositionAll();
  }

  /**
   * Push a hat onto the top of the stack.
   *
   * @returns The created HatStackEntry.
   */
  pushHat(manifest: HatManifest, texture: Texture): HatStackEntry {
    const sprite = new Sprite(texture);
    sprite.texture.baseTexture.scaleMode = SCALE_MODES.NEAREST;

    const entry: HatStackEntry = { manifest, sprite };
    this._entries.push(entry);
    this._container.addChild(sprite);
    this._cacheValid = false;
    this._repositionAll();
    return entry;
  }

  /**
   * Create a Sprite from raw manifest + base path, then push it.
   * Convenience wrapper around pushHat.
   */
  async pushHatFromUrl(
    manifest: HatManifest,
    textureUrl: string,
  ): Promise<HatStackEntry> {
    const base = BaseTexture.from(textureUrl, {
      scaleMode: SCALE_MODES.NEAREST,
    });

    const tex = new Texture(
      base,
      new Rectangle(0, 0, manifest.frameWidth, manifest.frameHeight),
    );

    return this.pushHat(manifest, tex);
  }

  /**
   * Remove the topmost hat.
   *
   * @returns The removed entry, or null if stack was empty.
   */
  popHat(): HatStackEntry | null {
    const entry = this._entries.pop();
    if (!entry) return null;

    this._container.removeChild(entry.sprite);
    entry.sprite.destroy();
    this._cacheValid = false;
    this._repositionAll();
    return entry;
  }

  /**
   * Remove a hat by index (0 = bottom, count-1 = top).
   */
  removeHatAt(index: number): HatStackEntry | null {
    if (index < 0 || index >= this._entries.length) return null;

    const [entry] = this._entries.splice(index, 1);
    this._container.removeChild(entry.sprite);
    entry.sprite.destroy();
    this._cacheValid = false;
    this._repositionAll();
    return entry;
  }

  /**
   * Remove all hats.
   */
  clearHats(): void {
    for (const entry of this._entries) {
      this._container.removeChild(entry.sprite);
      entry.sprite.destroy();
    }
    this._entries.length = 0;
    this._cacheValid = false;
  }

  /**
   * Compute the auto-scale factor so the full stack (character + hats)
   * fits within the given viewport height.
   *
   * Returns 1.0 when no scaling is needed.
   * Never goes below {@link _minSceneScale}.
   */
  computeAutoScale(
    characterHeight: number,
    viewportHeight: number,
  ): number {
    const totalHeight = characterHeight + this.stackHeight;
    if (totalHeight <= viewportHeight) return 1.0;
    return Math.max(this._minSceneScale, viewportHeight / totalHeight);
  }

  /**
   * Composite all hat sprites into a single cached RenderTexture.
   * Call this when the base action is static (continuous pose) and
   * the hat stack hasn't changed.
   *
   * PRD 08 §8: "静止帽子层可合成为缓存纹理".
   */
  compositeCache(renderer: IRenderer): RenderTexture | null {
    if (this._entries.length === 0) return null;

    if (this._cacheValid && this._cachedTexture) {
      return this._cachedTexture;
    }

    // Destroy previous cache.
    this._cachedTexture?.destroy(true);

    const bounds = this._container.getLocalBounds();
    const rt = RenderTexture.create({
      width: Math.ceil(bounds.width),
      height: Math.ceil(bounds.height),
      scaleMode: SCALE_MODES.NEAREST,
    });

    // Temporarily shift container so bounds start at (0,0).
    const ox = this._container.x;
    const oy = this._container.y;
    this._container.x = -bounds.x;
    this._container.y = -bounds.y;
    renderer.render(this._container, { renderTexture: rt });
    this._container.x = ox;
    this._container.y = oy;

    this._cachedTexture = rt;
    this._cacheValid = true;
    return rt;
  }

  /**
   * Invalidate the composite cache (e.g. on action change).
   */
  invalidateCache(): void {
    this._cacheValid = false;
  }

  /**
   * Clean up all resources.
   */
  dispose(): void {
    this.clearHats();
    this._cachedTexture?.destroy(true);
    this._cachedTexture = null;
    this._container.destroy({ children: true });
  }

  // ── Read-only accessors (for testing) ───────────────────────────────────

  get entries(): readonly HatStackEntry[] {
    return this._entries;
  }

  // ── Private ─────────────────────────────────────────────────────────────

  /**
   * Reposition every hat sprite using the anchor chain rule.
   *
   * Hat[0].bottomAttach → characterHeadAnchor
   * Hat[N].bottomAttach → Hat[N-1].topAttach (world-space)
   */
  private _repositionAll(): void {
    if (this._entries.length === 0) return;

    // Anchor chain starts at the character's head.
    let attachX = this._characterHeadAnchor.x;
    let attachY = this._characterHeadAnchor.y;

    for (const entry of this._entries) {
      const m = entry.manifest;

      // Position the hat so its bottomAttach sits on the current attach point.
      entry.sprite.x = attachX - m.anchors.bottomAttach.x;
      entry.sprite.y = attachY - m.anchors.bottomAttach.y;

      // Next hat attaches to this hat's topAttach (in world-space).
      attachX = entry.sprite.x + m.anchors.topAttach.x;
      attachY = entry.sprite.y + m.anchors.topAttach.y;
    }
  }
}
