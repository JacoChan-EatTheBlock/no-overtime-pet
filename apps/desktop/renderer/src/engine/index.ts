/**
 * engine/ barrel export.
 *
 * Usage:
 *   import { PetEngine, PetStateMachine, KeyboardBongo } from '@renderer/engine';
 */

// State machine (no pixi dependency — independently testable)
export {
  PetStateMachine,
  PET_ACTIONS,
  PET_STATES,
  ACTION_PRIORITY,
  PRIORITY_RANK,
  type PetAction,
  type PetState,
  type PetInputType,
  type PetInput,
  type PetInputMeta,
  type PetActionIntent,
  type PetStateMachineSnapshot,
  type PetStateMachineOptions,
  type PetStateListener,
  type ActionPriority,
  type ActionIntentSource,
  type BongoHand,
} from './PetStateMachine';

// Keyboard bongo (lightweight, no pixi dependency)
export {
  KeyboardBongo,
  type KeyboardBongoConfig,
  type BongoInputCallback,
} from './KeyboardBongo';

// Sprite sheet loader
export {
  SpriteSheetLoader,
  computeIntegerScale,
  type Point2D,
  type ActionDef,
  type CharacterAnchors,
  type CharacterManifest,
  type LoadedAction,
  type LoadedCharacter,
  type SpriteSheetLoaderOptions,
} from './SpriteSheetLoader';

// Hat stack
export {
  HatStack,
  type HatManifest,
  type HatStackEntry,
  type HatStackConfig,
} from './HatStack';

// Core engine
export {
  PetEngine,
  type PetEngineConfig,
  type PetEngineCallbacks,
} from './PetEngine';

// Friend row scene
export {
  FriendRowScene,
  MAX_VISIBLE,
  SLOTS_PER_PAGE,
  type FriendSlotData,
  type FriendRowConfig,
} from './FriendRowScene';
