/**
 * FriendRowScene — "排排坐" horizontal friend scene with pagination.
 *
 * PRD references:
 *   - 09-realtime-row-office §2–3: layout & sort order
 *   - 09-realtime-row-office §9: ≤ 12 characters at ≥ 30 fps
 *   - 08-pet-actions §8: hat stacking per character
 *
 * Features:
 *   - Horizontal slot grid, one row, scroll / page when > SLOTS_PER_PAGE.
 *   - Up to MAX_VISIBLE (12) characters rendered simultaneously.
 *   - Each slot: character AnimatedSprite + HatStack + name label.
 *   - Performance: off-screen slots are pooled (sprites stopped, not destroyed).
 */

import {
  AnimatedSprite,
  Container,
  Text,
  TextStyle,
} from 'pixi.js';

import type { PetAction } from './PetStateMachine';
import {
  SpriteSheetLoader,
  type CharacterManifest,
  type LoadedCharacter,
} from './SpriteSheetLoader';
import { HatStack, type HatManifest } from './HatStack';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum characters rendered at once (PRD 09 §9). */
export const MAX_VISIBLE = 12;

/** Default characters shown per page. */
export const SLOTS_PER_PAGE = 5;

// ---------------------------------------------------------------------------
// Friend slot data
// ---------------------------------------------------------------------------

export interface FriendSlotData {
  readonly userId: string;
  readonly displayName: string;
  readonly statusLabel: string;
  readonly petAction: PetAction;
  readonly actionIntensity: 1 | 2 | 3;
  readonly characterManifest: CharacterManifest;
  readonly hatManifests: HatManifest[];
  readonly assetBasePath: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface FriendRowConfig {
  /** Horizontal spacing between slots (px, logical). Default 16. */
  slotSpacing?: number;
  /** Logical width of each slot. Default from manifest canvas width. */
  slotWidth?: number;
  /** Logical height of each slot (incl. label). Default from manifest + 20. */
  slotHeight?: number;
  /** Characters per page. Default 5. */
  slotsPerPage?: number;
  /** Text style for name labels. */
  labelStyle?: Partial<TextStyle>;
}

// ---------------------------------------------------------------------------
// Internal slot state
// ---------------------------------------------------------------------------

interface FriendSlot {
  userId: string;
  container: Container;
  characterSprite: AnimatedSprite | null;
  hatStack: HatStack;
  label: Text;
  loader: SpriteSheetLoader;
  character: LoadedCharacter | null;
  currentAction: PetAction;
}

// ---------------------------------------------------------------------------
// FriendRowScene
// ---------------------------------------------------------------------------

export class FriendRowScene {
  private readonly _root = new Container();
  private readonly _slots = new Map<string, FriendSlot>();
  private readonly _orderedIds: string[] = [];
  private readonly _config: Required<
    Pick<FriendRowConfig, 'slotSpacing' | 'slotsPerPage'>
  > &
    FriendRowConfig;

  private _currentPage = 0;
  private _defaultLabelStyle: TextStyle;

  constructor(config: FriendRowConfig = {}) {
    this._config = {
      slotSpacing: config.slotSpacing ?? 16,
      slotsPerPage: config.slotsPerPage ?? SLOTS_PER_PAGE,
      ...config,
    };

    this._defaultLabelStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 10,
      fill: 0xffffff,
      align: 'center',
      ...(config.labelStyle ?? {}),
    });
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /** The root PIXI container. Add to your stage. */
  get container(): Container {
    return this._root;
  }

  get page(): number {
    return this._currentPage;
  }

  get pageCount(): number {
    return Math.max(
      1,
      Math.ceil(this._orderedIds.length / this._config.slotsPerPage),
    );
  }

  get totalSlots(): number {
    return this._orderedIds.length;
  }

  // ── Slot management ─────────────────────────────────────────────────────

  /**
   * Set the full friend list (replaces current).
   * The order of `friends` determines display order.
   *
   * PRD 09 §3 sort: self first, then online not-clocked, online clocked,
   * offline, by recent interaction, userId tiebreaker.
   * ⇒ Sorting is the caller's responsibility; this module renders in order.
   */
  async setFriends(friends: FriendSlotData[]): Promise<void> {
    // Limit to MAX_VISIBLE.
    const capped = friends.slice(0, MAX_VISIBLE);

    // Remove slots no longer present.
    const newIds = new Set(capped.map((f) => f.userId));
    for (const id of this._orderedIds) {
      if (!newIds.has(id)) {
        this._removeSlot(id);
      }
    }

    // Upsert slots.
    this._orderedIds.length = 0;
    for (const data of capped) {
      this._orderedIds.push(data.userId);
      const existing = this._slots.get(data.userId);
      if (existing) {
        await this._updateSlot(existing, data);
      } else {
        await this._createSlot(data);
      }
    }

    this._layoutPage();
  }

  /**
   * Update a single friend's action (e.g. from realtime event).
   */
  updateFriendAction(
    userId: string,
    action: PetAction,
    intensity: 1 | 2 | 3 = 1,
  ): void {
    const slot = this._slots.get(userId);
    if (!slot || !slot.character || !slot.loader) return;

    if (slot.currentAction === action) {
      // Same action — just adjust speed.
      if (slot.characterSprite) {
        const def = slot.character.manifest.actions[action];
        if (def) {
          slot.characterSprite.animationSpeed =
            (def.fps / 60) * (1 + (intensity - 1) * 0.3);
        }
      }
      return;
    }

    slot.currentAction = action;

    // Swap sprite.
    if (slot.characterSprite) {
      slot.characterSprite.stop();
      slot.container.removeChild(slot.characterSprite);
      slot.characterSprite.destroy();
      slot.characterSprite = null;
    }

    const sprite = slot.loader.createAnimatedSprite(slot.character, action);
    if (sprite) {
      this._configureCharacterSprite(sprite, slot.character);
      slot.container.addChildAt(sprite, 0);
      sprite.play();
      slot.characterSprite = sprite;
    }
  }

  // ── Pagination ──────────────────────────────────────────────────────────

  setPage(page: number): void {
    const clamped = Math.max(0, Math.min(page, this.pageCount - 1));
    if (clamped === this._currentPage) return;
    this._currentPage = clamped;
    this._layoutPage();
  }

  nextPage(): void {
    this.setPage(this._currentPage + 1);
  }

  prevPage(): void {
    this.setPage(this._currentPage - 1);
  }

  // ── Dispose ─────────────────────────────────────────────────────────────

  dispose(): void {
    for (const id of [...this._slots.keys()]) {
      this._removeSlot(id);
    }
    this._root.destroy({ children: true });
  }

  // ── Private: slot lifecycle ─────────────────────────────────────────────

  private async _createSlot(data: FriendSlotData): Promise<void> {
    const slotContainer = new Container();

    const loader = new SpriteSheetLoader({
      basePath: data.assetBasePath,
    });

    const character = await loader.loadCharacter(data.characterManifest);

    const sprite = loader.createAnimatedSprite(character, data.petAction);
    if (sprite) {
      this._configureCharacterSprite(sprite, character);
      slotContainer.addChild(sprite);
      sprite.play();
    }

    // Hat stack.
    const hatStack = new HatStack();
    slotContainer.addChild(hatStack.container);

    // Name label below the character.
    const label = new Text(data.displayName, this._defaultLabelStyle);
    label.anchor.set(0.5, 0);
    label.y = data.characterManifest.canvas.height + 4;
    label.x = data.characterManifest.canvas.width / 2;
    slotContainer.addChild(label);

    const slot: FriendSlot = {
      userId: data.userId,
      container: slotContainer,
      characterSprite: sprite,
      hatStack,
      label,
      loader,
      character,
      currentAction: data.petAction,
    };

    this._slots.set(data.userId, slot);
    this._root.addChild(slotContainer);
  }

  private async _updateSlot(
    slot: FriendSlot,
    data: FriendSlotData,
  ): Promise<void> {
    // Update label.
    slot.label.text = data.displayName;

    // Update action if changed.
    if (slot.currentAction !== data.petAction) {
      this.updateFriendAction(
        data.userId,
        data.petAction,
        data.actionIntensity,
      );
    }
  }

  private _removeSlot(userId: string): void {
    const slot = this._slots.get(userId);
    if (!slot) return;

    slot.characterSprite?.stop();
    slot.characterSprite?.destroy();
    slot.hatStack.dispose();
    slot.loader.dispose();
    this._root.removeChild(slot.container);
    slot.container.destroy({ children: true });
    this._slots.delete(userId);
  }

  // ── Private: layout ─────────────────────────────────────────────────────

  private _layoutPage(): void {
    const perPage = this._config.slotsPerPage;
    const startIdx = this._currentPage * perPage;
    const endIdx = Math.min(startIdx + perPage, this._orderedIds.length);

    // Hide all first.
    for (const slot of this._slots.values()) {
      slot.container.visible = false;
      slot.characterSprite?.stop();
    }

    // Show & position visible page.
    let x = 0;
    for (let i = startIdx; i < endIdx; i++) {
      const userId = this._orderedIds[i];
      const slot = this._slots.get(userId);
      if (!slot) continue;

      slot.container.visible = true;
      slot.container.x = x;
      slot.container.y = 0;

      // Resume animation only for visible slots.
      slot.characterSprite?.play();

      const slotWidth =
        this._config.slotWidth ??
        (slot.character?.manifest.canvas.width ?? 128);
      x += slotWidth + this._config.slotSpacing;
    }
  }

  // ── Private: sprite configuration ───────────────────────────────────────

  private _configureCharacterSprite(
    sprite: AnimatedSprite,
    character: LoadedCharacter,
  ): void {
    const feet = character.manifest.anchors.feet;
    sprite.anchor.set(
      feet.x / character.manifest.canvas.width,
      feet.y / character.manifest.canvas.height,
    );
    sprite.x = character.manifest.canvas.width / 2;
    sprite.y = character.manifest.canvas.height;
  }
}
