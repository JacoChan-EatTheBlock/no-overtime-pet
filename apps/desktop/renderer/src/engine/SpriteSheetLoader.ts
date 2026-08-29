/**
 * SpriteSheetLoader — Load characters & actions from Manifest JSON + texture.
 *
 * - Integer-multiple scaling with NEAREST sampling (no blur).
 * - Frame rectangles computed from manifest `frameWidth × frameHeight × frameCount`.
 * - Runtime never generates assets — only consumes pre-built Sprite Sheets.
 *
 * PRD references:
 *   - 11-asset-pipeline-contract §4–5: directory & manifest schema
 *   - 08-pet-actions §6: pixel rendering constraints
 */

import {
  AnimatedSprite,
  BaseTexture,
  Rectangle,
  SCALE_MODES,
  Texture,
} from 'pixi.js';

import type { PetAction } from './PetStateMachine';

// ---------------------------------------------------------------------------
// Geometry helper
// ---------------------------------------------------------------------------

export interface Point2D {
  readonly x: number;
  readonly y: number;
}

// ---------------------------------------------------------------------------
// Character Manifest  (PRD 11 §5)
// ---------------------------------------------------------------------------

export interface ActionDef {
  readonly texture: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frameCount: number;
  readonly fps: number;
  readonly loop: boolean;
  readonly loopStartFrame?: number;
  readonly fallbackAction: PetAction;
  readonly eventFrames?: Record<string, number[]>;
  readonly contentHashSha256: string;
}

export interface CharacterAnchors {
  readonly feet: Point2D;
  readonly head: Point2D;
  readonly keyboard?: Point2D;
}

export interface CharacterManifest {
  readonly schemaVersion: '1.0';
  readonly characterId: string;
  readonly assetVersion: string;
  readonly canvas: { readonly width: number; readonly height: number };
  readonly scaleMode: 'NEAREST';
  readonly tags?: string[];
  readonly anchors: CharacterAnchors;
  readonly actions: Record<string, ActionDef>;
}

// ---------------------------------------------------------------------------
// Runtime loaded action
// ---------------------------------------------------------------------------

export interface LoadedAction {
  /** Action id, e.g. "TYPE_LEFT". */
  readonly actionId: string;
  /** Original manifest definition. */
  readonly def: ActionDef;
  /** Individual frame textures (sliced from the sheet). */
  readonly frameTextures: Texture[];
}

// ---------------------------------------------------------------------------
// Runtime loaded character
// ---------------------------------------------------------------------------

export interface LoadedCharacter {
  readonly manifest: CharacterManifest;
  readonly actions: Map<string, LoadedAction>;
}

// ---------------------------------------------------------------------------
// SpriteSheetLoader
// ---------------------------------------------------------------------------

export interface SpriteSheetLoaderOptions {
  /**
   * Base URL/path prefix prepended to texture paths in the manifest.
   * Example: `/assets/characters/office-cat-001/1.0.0/`
   */
  basePath: string;
}

export class SpriteSheetLoader {
  private readonly _basePath: string;
  private readonly _baseTextureCache = new Map<string, BaseTexture>();

  constructor(options: SpriteSheetLoaderOptions) {
    this._basePath = options.basePath.endsWith('/')
      ? options.basePath
      : options.basePath + '/';
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Load a full character from its manifest.
   *
   * 1. Fetches each action's texture sheet.
   * 2. Slices into frame Textures with NEAREST scaleMode.
   * 3. Returns a {@link LoadedCharacter} ready for rendering.
   */
  async loadCharacter(manifest: CharacterManifest): Promise<LoadedCharacter> {
    const actions = new Map<string, LoadedAction>();

    const entries = Object.entries(manifest.actions);
    // Load all action textures in parallel.
    const loaded = await Promise.all(
      entries.map(async ([actionId, def]) => {
        const frameTextures = await this._loadActionFrames(def);
        return { actionId, def, frameTextures } satisfies LoadedAction;
      }),
    );

    for (const action of loaded) {
      actions.set(action.actionId, action);
    }

    return { manifest, actions };
  }

  /**
   * Create a fully configured {@link AnimatedSprite} for a specific action.
   *
   * Falls back through `fallbackAction` chain if the requested action
   * is not present in the loaded character (PRD 08 §5 fallback rule).
   */
  createAnimatedSprite(
    character: LoadedCharacter,
    actionId: string,
  ): AnimatedSprite | null {
    const action = this._resolveAction(character, actionId);
    if (!action) return null;

    const sprite = new AnimatedSprite(action.frameTextures);
    sprite.animationSpeed = action.def.fps / 60; // pixi uses 60fps base
    sprite.loop = action.def.loop;

    // If loop and loopStartFrame specified, we handle it via onLoop callback.
    if (action.def.loop && action.def.loopStartFrame !== undefined) {
      const loopStart = action.def.loopStartFrame;
      sprite.onLoop = () => {
        sprite.gotoAndPlay(loopStart);
      };
    }

    return sprite;
  }

  /**
   * Load a single texture as a PIXI.Texture with NEAREST scale mode.
   * Useful for hat textures or standalone sprites.
   */
  async loadTexture(relativePath: string): Promise<Texture> {
    const url = this._basePath + relativePath;
    const base = await this._getBaseTexture(url);
    return new Texture(base);
  }

  /**
   * Release all cached BaseTextures.
   */
  dispose(): void {
    for (const base of this._baseTextureCache.values()) {
      base.destroy();
    }
    this._baseTextureCache.clear();
  }

  // ── Private ─────────────────────────────────────────────────────────────

  /**
   * Load (or retrieve from cache) a BaseTexture with NEAREST filtering.
   */
  private _getBaseTexture(url: string): Promise<BaseTexture> {
    const cached = this._baseTextureCache.get(url);
    if (cached) return Promise.resolve(cached);

    return new Promise<BaseTexture>((resolve, reject) => {
      const base = BaseTexture.from(url, {
        scaleMode: SCALE_MODES.NEAREST,
      });

      if (base.valid) {
        this._baseTextureCache.set(url, base);
        resolve(base);
        return;
      }

      base.once('loaded', () => {
        this._baseTextureCache.set(url, base);
        resolve(base);
      });

      base.once('error', (_base: BaseTexture, event: ErrorEvent) => {
        reject(new Error(`Failed to load texture: ${url} — ${event.message}`));
      });
    });
  }

  /**
   * Slice a sprite sheet into individual frame Textures.
   *
   * Layout: frames run left-to-right, top-to-bottom.
   * Columns = floor(textureWidth / frameWidth).
   */
  private async _loadActionFrames(def: ActionDef): Promise<Texture[]> {
    const url = this._basePath + def.texture;
    const base = await this._getBaseTexture(url);

    const cols = Math.max(1, Math.floor(base.width / def.frameWidth));
    const frames: Texture[] = [];

    for (let i = 0; i < def.frameCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const rect = new Rectangle(
        col * def.frameWidth,
        row * def.frameHeight,
        def.frameWidth,
        def.frameHeight,
      );
      frames.push(new Texture(base, rect));
    }

    return frames;
  }

  /**
   * Resolve an action by id, following the `fallbackAction` chain.
   *
   * PRD 11 §5: `指定动作 → 同族 fallbackAction → IDLE`
   */
  private _resolveAction(
    character: LoadedCharacter,
    actionId: string,
    visited = new Set<string>(),
  ): LoadedAction | null {
    if (visited.has(actionId)) return null;
    visited.add(actionId);

    const action = character.actions.get(actionId);
    if (action) return action;

    // Look up the manifest for a fallback.
    const def = character.manifest.actions[actionId];
    if (def) {
      return this._resolveAction(character, def.fallbackAction, visited);
    }

    // Ultimate fallback.
    if (actionId !== 'IDLE') {
      return this._resolveAction(character, 'IDLE', visited);
    }

    return null;
  }
}

// ---------------------------------------------------------------------------
// Pure helpers (no pixi dependency — useful in tests)
// ---------------------------------------------------------------------------

/**
 * Compute the optimal integer scale factor so that
 * `logicalSize × scale` fits inside `viewportSize`.
 *
 * Always returns ≥ 1 (never sub-pixel).
 */
export function computeIntegerScale(
  logicalWidth: number,
  logicalHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): number {
  const sx = Math.floor(viewportWidth / logicalWidth);
  const sy = Math.floor(viewportHeight / logicalHeight);
  return Math.max(1, Math.min(sx, sy));
}
