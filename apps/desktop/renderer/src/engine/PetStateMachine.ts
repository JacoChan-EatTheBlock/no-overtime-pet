/**
 * PetStateMachine — Deterministic, externally-driven action state machine.
 *
 * States represent high-level behavioral modes (IDLE, TYPING, …).
 * Each state maps to one or more PetAction values for the renderer.
 * Transitions happen exclusively through {@link PetStateMachine.send}.
 *
 * PRD references:
 *   - 01-shared-contracts §3: PetAction enum
 *   - 08-pet-actions §3–4: priority tiers, input-to-action mapping
 */

// ---------------------------------------------------------------------------
// Shared PetAction (from 01-shared-contracts §3)
// ---------------------------------------------------------------------------

export const PET_ACTIONS = [
  'IDLE',
  'TYPE_LEFT',
  'TYPE_RIGHT',
  'TYPE_BOTH',
  'MOUSE_MOVE',
  'MOUSE_CLICK',
  'MEETING_DAZE',
  'READ',
  'SLACK_SECRETLY',
  'AWAY_DISAPPEAR',
  'CELEBRATE',
] as const;

export type PetAction = (typeof PET_ACTIONS)[number];

// ---------------------------------------------------------------------------
// High-level states (user requirement)
// ---------------------------------------------------------------------------

export const PET_STATES = [
  'IDLE',
  'TYPING',
  'MEETING',
  'BROWSING',
  'SUSPICIOUS_IDLE',
  'AWAY',
  'RUNNING_HOME',
  'CELEBRATE',
] as const;

export type PetState = (typeof PET_STATES)[number];

// ---------------------------------------------------------------------------
// Action priority tiers  (PRD 08 §3)
// ---------------------------------------------------------------------------

export type ActionPriority = 'ONE_SHOT' | 'SHORT' | 'CONTINUOUS';

export const ACTION_PRIORITY: Record<PetAction, ActionPriority> = {
  CELEBRATE: 'ONE_SHOT',
  TYPE_LEFT: 'SHORT',
  TYPE_RIGHT: 'SHORT',
  TYPE_BOTH: 'SHORT',
  MOUSE_CLICK: 'SHORT',
  MOUSE_MOVE: 'CONTINUOUS',
  MEETING_DAZE: 'CONTINUOUS',
  READ: 'CONTINUOUS',
  SLACK_SECRETLY: 'CONTINUOUS',
  IDLE: 'CONTINUOUS',
  AWAY_DISAPPEAR: 'CONTINUOUS',
};

export const PRIORITY_RANK: Record<ActionPriority, number> = {
  ONE_SHOT: 3,
  SHORT: 2,
  CONTINUOUS: 1,
};

// ---------------------------------------------------------------------------
// Input events
// ---------------------------------------------------------------------------

export type PetInputType =
  | 'KEYBOARD_INPUT'
  | 'MOUSE_ACTIVITY'
  | 'MEETING_STARTED'
  | 'MEETING_ENDED'
  | 'BROWSING_WORK'
  | 'BROWSING_LEISURE'
  | 'SUSPICIOUS_IDLE_DETECTED'
  | 'AWAY_DETECTED'
  | 'RETURNED'
  | 'CLOCK_OUT_ON_TIME'
  | 'ALL_TASKS_COMPLETED'
  | 'CELEBRATE_TRIGGER'
  | 'ANIMATION_FINISHED'
  | 'IDLE_TIMEOUT';

export type BongoHand = 'LEFT' | 'RIGHT';

export interface PetInputMeta {
  readonly hand?: BongoHand;
  readonly intensity?: 1 | 2 | 3;
}

export interface PetInput {
  readonly type: PetInputType;
  readonly timestamp: number;
  readonly meta?: PetInputMeta;
}

// ---------------------------------------------------------------------------
// Action intent  (PRD 08 §4 / §7)
// ---------------------------------------------------------------------------

export type ActionIntentSource =
  | 'LOCAL_INPUT'
  | 'ACTIVITY_CLASSIFIER'
  | 'SYSTEM_EVENT'
  | 'REMOTE_PROJECTION';

export interface PetActionIntent {
  readonly action: PetAction;
  readonly intensity: 1 | 2 | 3;
  readonly triggeredAt: number;
  readonly minimumPlayMs: number;
  readonly source: ActionIntentSource;
}

// ---------------------------------------------------------------------------
// Serializable snapshot
// ---------------------------------------------------------------------------

export interface PetStateMachineSnapshot {
  readonly state: PetState;
  readonly action: PetAction;
  readonly intensity: 1 | 2 | 3;
  readonly hand: BongoHand;
  readonly enteredAt: number;
  readonly lastInputAt: number;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface PetStateMachineOptions {
  initialState?: PetState;
  /** Minimum play time (ms) for one-shot animations before accepting new input. */
  oneShotGuardMs?: number;
}

// ---------------------------------------------------------------------------
// Deterministic transition table
// ---------------------------------------------------------------------------

type TransitionMap = Partial<Record<PetInputType, PetState>>;
type TransitionTable = Record<PetState, TransitionMap>;

/**
 * Every cell is: `[currentState][inputType] → nextState`.
 * Missing cells mean "stay in current state".
 */
const TRANSITIONS: TransitionTable = {
  IDLE: {
    KEYBOARD_INPUT: 'TYPING',
    MEETING_STARTED: 'MEETING',
    BROWSING_WORK: 'BROWSING',
    BROWSING_LEISURE: 'SUSPICIOUS_IDLE',
    SUSPICIOUS_IDLE_DETECTED: 'SUSPICIOUS_IDLE',
    AWAY_DETECTED: 'AWAY',
    CLOCK_OUT_ON_TIME: 'RUNNING_HOME',
    ALL_TASKS_COMPLETED: 'CELEBRATE',
    CELEBRATE_TRIGGER: 'CELEBRATE',
  },
  TYPING: {
    MEETING_STARTED: 'MEETING',
    IDLE_TIMEOUT: 'IDLE',
    AWAY_DETECTED: 'AWAY',
    CLOCK_OUT_ON_TIME: 'RUNNING_HOME',
    ALL_TASKS_COMPLETED: 'CELEBRATE',
    CELEBRATE_TRIGGER: 'CELEBRATE',
  },
  MEETING: {
    KEYBOARD_INPUT: 'TYPING',
    MEETING_ENDED: 'IDLE',
    IDLE_TIMEOUT: 'IDLE',
    AWAY_DETECTED: 'AWAY',
    CLOCK_OUT_ON_TIME: 'RUNNING_HOME',
    ALL_TASKS_COMPLETED: 'CELEBRATE',
    CELEBRATE_TRIGGER: 'CELEBRATE',
  },
  BROWSING: {
    KEYBOARD_INPUT: 'TYPING',
    MEETING_STARTED: 'MEETING',
    BROWSING_LEISURE: 'SUSPICIOUS_IDLE',
    SUSPICIOUS_IDLE_DETECTED: 'SUSPICIOUS_IDLE',
    IDLE_TIMEOUT: 'IDLE',
    AWAY_DETECTED: 'AWAY',
    CLOCK_OUT_ON_TIME: 'RUNNING_HOME',
    ALL_TASKS_COMPLETED: 'CELEBRATE',
    CELEBRATE_TRIGGER: 'CELEBRATE',
  },
  SUSPICIOUS_IDLE: {
    KEYBOARD_INPUT: 'TYPING',
    MEETING_STARTED: 'MEETING',
    BROWSING_WORK: 'BROWSING',
    RETURNED: 'IDLE',
    AWAY_DETECTED: 'AWAY',
    CLOCK_OUT_ON_TIME: 'RUNNING_HOME',
    ALL_TASKS_COMPLETED: 'CELEBRATE',
    CELEBRATE_TRIGGER: 'CELEBRATE',
  },
  AWAY: {
    KEYBOARD_INPUT: 'TYPING',
    MOUSE_ACTIVITY: 'IDLE',
    RETURNED: 'IDLE',
    CLOCK_OUT_ON_TIME: 'RUNNING_HOME',
    ALL_TASKS_COMPLETED: 'CELEBRATE',
    CELEBRATE_TRIGGER: 'CELEBRATE',
  },
  RUNNING_HOME: {
    ANIMATION_FINISHED: 'CELEBRATE',
    CELEBRATE_TRIGGER: 'CELEBRATE',
  },
  CELEBRATE: {
    ANIMATION_FINISHED: 'IDLE',
  },
};

// ---------------------------------------------------------------------------
// State → default PetAction mapping
// ---------------------------------------------------------------------------

const STATE_DEFAULT_ACTION: Record<PetState, PetAction> = {
  IDLE: 'IDLE',
  TYPING: 'TYPE_BOTH',
  MEETING: 'MEETING_DAZE',
  BROWSING: 'READ',
  SUSPICIOUS_IDLE: 'SLACK_SECRETLY',
  AWAY: 'AWAY_DISAPPEAR',
  RUNNING_HOME: 'AWAY_DISAPPEAR',
  CELEBRATE: 'CELEBRATE',
};

// ---------------------------------------------------------------------------
// Minimum play durations (ms)
// ---------------------------------------------------------------------------

const MIN_PLAY_MS: Record<ActionPriority, number> = {
  ONE_SHOT: 800,
  SHORT: 120,
  CONTINUOUS: 0,
};

// ---------------------------------------------------------------------------
// Intensity window  (PRD: 300ms)
// ---------------------------------------------------------------------------

const INTENSITY_ESCALATION_MS = 300;
const INTENSITY_DECAY_MS = 1000;

// ---------------------------------------------------------------------------
// PetStateMachine
// ---------------------------------------------------------------------------

export type PetStateListener = (snapshot: PetStateMachineSnapshot) => void;

export class PetStateMachine {
  private _state: PetState;
  private _action: PetAction;
  private _intensity: 1 | 2 | 3 = 1;
  private _hand: BongoHand = 'RIGHT';
  private _enteredAt: number;
  private _lastInputAt: number;
  private _oneShotGuardMs: number;
  private _oneShotActive = false;
  private _oneShotStart = 0;
  private readonly _listeners = new Set<PetStateListener>();

  constructor(options: PetStateMachineOptions = {}) {
    const now = Date.now();
    this._state = options.initialState ?? 'IDLE';
    this._action = STATE_DEFAULT_ACTION[this._state];
    this._enteredAt = now;
    this._lastInputAt = now;
    this._oneShotGuardMs = options.oneShotGuardMs ?? 800;
  }

  // ── Getters ─────────────────────────────────────────────────────────────

  get snapshot(): PetStateMachineSnapshot {
    return {
      state: this._state,
      action: this._action,
      intensity: this._intensity,
      hand: this._hand,
      enteredAt: this._enteredAt,
      lastInputAt: this._lastInputAt,
    };
  }

  get state(): PetState {
    return this._state;
  }

  get action(): PetAction {
    return this._action;
  }

  get intensity(): 1 | 2 | 3 {
    return this._intensity;
  }

  get hand(): BongoHand {
    return this._hand;
  }

  // ── Subscribe / unsubscribe ─────────────────────────────────────────────

  subscribe(listener: PetStateListener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  // ── Core: process input ─────────────────────────────────────────────────

  /**
   * The **only** way to mutate state.
   * Pure transition: `(currentState, input) → nextState`.
   */
  send(input: PetInput): PetStateMachineSnapshot {
    const prevState = this._state;
    const prevAction = this._action;
    const prevInputAt = this._lastInputAt;

    // 1. One-shot guard: high-priority animations play uninterrupted.
    if (this._oneShotActive) {
      const elapsed = input.timestamp - this._oneShotStart;
      if (elapsed < this._oneShotGuardMs && input.type !== 'ANIMATION_FINISHED') {
        return this.snapshot;
      }
      this._oneShotActive = false;
    }

    // 2. Look up deterministic transition.
    const nextState = TRANSITIONS[this._state][input.type];
    if (nextState !== undefined && nextState !== this._state) {
      this._state = nextState;
      this._enteredAt = input.timestamp;
    }

    // 3. Intensity (before we overwrite _lastInputAt).
    this._computeIntensity(input, prevInputAt);

    // 4. Record timestamp.
    this._lastInputAt = input.timestamp;

    // 5. Resolve concrete PetAction.
    this._resolveAction(input);

    // 6. Arm one-shot guard if we just entered a one-shot action.
    if (
      ACTION_PRIORITY[this._action] === 'ONE_SHOT' &&
      this._action !== prevAction
    ) {
      this._oneShotActive = true;
      this._oneShotStart = input.timestamp;
    }

    // 7. Notify listeners on change.
    if (this._state !== prevState || this._action !== prevAction) {
      this._notify();
    }

    return this.snapshot;
  }

  // ── Network aggregation helper (PRD 08 §7) ─────────────────────────────

  /**
   * Build a {@link PetActionIntent} for network broadcast.
   * Sends **only** the aggregated action — never raw keystrokes.
   */
  createActionIntent(
    source: ActionIntentSource = 'LOCAL_INPUT',
  ): PetActionIntent {
    return {
      action: this._action,
      intensity: this._intensity,
      triggeredAt: this._lastInputAt,
      minimumPlayMs: MIN_PLAY_MS[ACTION_PRIORITY[this._action]],
      source,
    };
  }

  /**
   * Apply a remote friend's action intent for projection rendering.
   */
  applyRemoteIntent(intent: PetActionIntent): void {
    this._action = intent.action;
    this._intensity = intent.intensity;
    this._lastInputAt = intent.triggeredAt;
    this._notify();
  }

  // ── Reset ───────────────────────────────────────────────────────────────

  reset(timestamp: number = Date.now()): void {
    this._state = 'IDLE';
    this._action = 'IDLE';
    this._intensity = 1;
    this._hand = 'RIGHT';
    this._enteredAt = timestamp;
    this._lastInputAt = timestamp;
    this._oneShotActive = false;
    this._notify();
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private _resolveAction(input: PetInput): void {
    if (this._state === 'TYPING') {
      this._resolveTypingAction(input);
      return;
    }
    this._action = STATE_DEFAULT_ACTION[this._state];
  }

  /**
   * TYPING state resolves to TYPE_LEFT / TYPE_RIGHT per keystroke,
   * or TYPE_BOTH for sustained bursts, or MOUSE_MOVE if mouse-active.
   */
  private _resolveTypingAction(input: PetInput): void {
    if (input.type === 'KEYBOARD_INPUT') {
      // Alternate hands (PRD 08 §4.1: pseudo-random or alternating).
      const incomingHand = input.meta?.hand;
      if (incomingHand) {
        this._hand = incomingHand;
      } else {
        this._hand = this._hand === 'LEFT' ? 'RIGHT' : 'LEFT';
      }
      this._action = this._hand === 'LEFT' ? 'TYPE_LEFT' : 'TYPE_RIGHT';
    } else if (input.type === 'MOUSE_ACTIVITY') {
      this._action = 'MOUSE_MOVE';
    } else {
      // Sustain: fall back to TYPE_BOTH for continuous representation.
      this._action = 'TYPE_BOTH';
    }
  }

  /**
   * 300ms window → escalate; >1s gap → decay (PRD 08 §4.1).
   */
  private _computeIntensity(input: PetInput, prevInputAt: number): void {
    if (
      input.type !== 'KEYBOARD_INPUT' &&
      input.type !== 'MOUSE_ACTIVITY'
    ) {
      return;
    }

    // Honour explicit intensity from KeyboardBongo.
    if (input.meta?.intensity) {
      this._intensity = input.meta.intensity;
      return;
    }

    const gap = input.timestamp - prevInputAt;
    if (gap <= INTENSITY_ESCALATION_MS) {
      this._intensity = Math.min(3, this._intensity + 1) as 1 | 2 | 3;
    } else if (gap > INTENSITY_DECAY_MS) {
      this._intensity = 1;
    }
  }

  private _notify(): void {
    const snap = this.snapshot;
    for (const listener of this._listeners) {
      listener(snap);
    }
  }
}
