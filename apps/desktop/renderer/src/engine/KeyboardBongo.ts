/**
 * KeyboardBongo — Keyboard input → Bongo-Cat-style typing action.
 *
 * Design principles (PRD 08 §4.1 + §2):
 * - Each keypress triggers a hand selection; **never** reads the character.
 * - Left / right hand alternates (pseudo-random acceptable, alternating used here).
 * - High-frequency input merges into a continuous cycle.
 * - 300 ms window for intensity escalation (1 → 2 → 3).
 * - Outputs aggregated {@link PetInput} events — never raw keycodes.
 * - P95 local latency target ≤ 100 ms.
 */

import type { BongoHand, PetInput } from './PetStateMachine';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface KeyboardBongoConfig {
  /** Max ms between keystrokes before intensity resets. Default 300. */
  intensityWindowMs?: number;
  /** Ms of silence before emitting IDLE_TIMEOUT. Default 3000. */
  idleTimeoutMs?: number;
  /** Min ms between emitted PetInput events (debounce). Default 50. */
  emitThrottleMs?: number;
}

// ---------------------------------------------------------------------------
// Output callback
// ---------------------------------------------------------------------------

export type BongoInputCallback = (input: PetInput) => void;

// ---------------------------------------------------------------------------
// KeyboardBongo
// ---------------------------------------------------------------------------

export class KeyboardBongo {
  // Config
  private readonly _intensityWindowMs: number;
  private readonly _idleTimeoutMs: number;
  private readonly _emitThrottleMs: number;

  // State
  private _lastHand: BongoHand = 'RIGHT';
  private _intensity: 1 | 2 | 3 = 1;
  private _keystrokeCount = 0;
  private _lastKeystrokeAt = 0;
  private _lastEmitAt = 0;
  private _idleTimer: ReturnType<typeof setTimeout> | null = null;

  // Aggregation for network (1-second window, PRD 08 §7)
  private _aggregateWindowStart = 0;
  private _aggregateDominantAction: 'TYPE_LEFT' | 'TYPE_RIGHT' | 'TYPE_BOTH' =
    'TYPE_BOTH';
  private _aggregateLeftCount = 0;
  private _aggregateRightCount = 0;
  private _aggregateSequence = 0;

  // External wiring
  private _callback: BongoInputCallback | null = null;
  private _boundKeydown: ((e: KeyboardEvent) => void) | null = null;
  private _target: EventTarget | null = null;

  constructor(config: KeyboardBongoConfig = {}) {
    this._intensityWindowMs = config.intensityWindowMs ?? 300;
    this._idleTimeoutMs = config.idleTimeoutMs ?? 3000;
    this._emitThrottleMs = config.emitThrottleMs ?? 50;
  }

  // ── Attach / detach ─────────────────────────────────────────────────────

  /**
   * Start listening for keyboard events on the given target
   * (typically `window` or a specific element).
   */
  attach(target: EventTarget, callback: BongoInputCallback): void {
    this.detach();
    this._callback = callback;
    this._target = target;
    this._boundKeydown = this._onKeydown.bind(this);
    target.addEventListener('keydown', this._boundKeydown as EventListener);
  }

  /**
   * Stop listening and clean up timers.
   */
  detach(): void {
    if (this._target && this._boundKeydown) {
      this._target.removeEventListener(
        'keydown',
        this._boundKeydown as EventListener,
      );
    }
    this._target = null;
    this._boundKeydown = null;
    this._callback = null;
    this._clearIdleTimer();
  }

  // ── Read-only state (for testing) ───────────────────────────────────────

  get hand(): BongoHand {
    return this._lastHand;
  }

  get intensity(): 1 | 2 | 3 {
    return this._intensity;
  }

  get keystrokeCount(): number {
    return this._keystrokeCount;
  }

  // ── Manual trigger (for testing or remote projection) ───────────────────

  /**
   * Simulate a keystroke without an actual keyboard event.
   */
  simulateKeystroke(timestamp: number = Date.now()): void {
    this._processKeystroke(timestamp);
  }

  // ── Network aggregation snapshot (PRD 08 §7) ───────────────────────────

  /**
   * Flush the current 1-second aggregation window and return the aggregate.
   * Call this on a 1-second timer for network broadcast.
   */
  flushAggregate(): {
    dominantAction: 'TYPE_LEFT' | 'TYPE_RIGHT' | 'TYPE_BOTH';
    intensity: 1 | 2 | 3;
    sequence: number;
    windowStart: number;
    windowEnd: number;
  } | null {
    if (this._aggregateLeftCount === 0 && this._aggregateRightCount === 0) {
      return null;
    }

    const total = this._aggregateLeftCount + this._aggregateRightCount;
    let dominant: 'TYPE_LEFT' | 'TYPE_RIGHT' | 'TYPE_BOTH';
    if (total >= 4) {
      dominant = 'TYPE_BOTH';
    } else if (this._aggregateLeftCount > this._aggregateRightCount) {
      dominant = 'TYPE_LEFT';
    } else if (this._aggregateRightCount > this._aggregateLeftCount) {
      dominant = 'TYPE_RIGHT';
    } else {
      dominant = 'TYPE_BOTH';
    }

    const result = {
      dominantAction: dominant,
      intensity: this._intensity,
      sequence: this._aggregateSequence,
      windowStart: this._aggregateWindowStart,
      windowEnd: Date.now(),
    };

    // Reset window.
    this._aggregateLeftCount = 0;
    this._aggregateRightCount = 0;
    this._aggregateWindowStart = Date.now();
    this._aggregateSequence++;

    return result;
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private _onKeydown(e: KeyboardEvent): void {
    // Ignore modifier-only keys and repeated events.
    if (e.repeat) return;
    if (
      e.key === 'Meta' ||
      e.key === 'Control' ||
      e.key === 'Alt' ||
      e.key === 'Shift'
    ) {
      return;
    }

    // IMPORTANT: We never read e.key's character value for state/network.
    // Only the timing matters.
    this._processKeystroke(Date.now());
  }

  private _processKeystroke(now: number): void {
    this._keystrokeCount++;

    // 1. Alternate hand.
    this._lastHand = this._lastHand === 'LEFT' ? 'RIGHT' : 'LEFT';

    // 2. Intensity.
    const gap = now - this._lastKeystrokeAt;
    if (this._lastKeystrokeAt > 0 && gap <= this._intensityWindowMs) {
      this._intensity = Math.min(3, this._intensity + 1) as 1 | 2 | 3;
    } else if (gap > this._intensityWindowMs * 3) {
      this._intensity = 1;
    }

    // 3. Aggregate tracking.
    if (this._aggregateWindowStart === 0) {
      this._aggregateWindowStart = now;
    }
    if (this._lastHand === 'LEFT') {
      this._aggregateLeftCount++;
    } else {
      this._aggregateRightCount++;
    }

    this._lastKeystrokeAt = now;

    // 4. Throttled emit.
    if (now - this._lastEmitAt >= this._emitThrottleMs) {
      this._emit(now);
    }

    // 5. Reset idle timer.
    this._resetIdleTimer(now);
  }

  private _emit(now: number): void {
    this._lastEmitAt = now;
    this._callback?.({
      type: 'KEYBOARD_INPUT',
      timestamp: now,
      meta: {
        hand: this._lastHand,
        intensity: this._intensity,
      },
    });
  }

  private _resetIdleTimer(now: number): void {
    this._clearIdleTimer();
    this._idleTimer = setTimeout(() => {
      this._intensity = 1;
      this._callback?.({
        type: 'IDLE_TIMEOUT',
        timestamp: now + this._idleTimeoutMs,
      });
    }, this._idleTimeoutMs);
  }

  private _clearIdleTimer(): void {
    if (this._idleTimer !== null) {
      clearTimeout(this._idleTimer);
      this._idleTimer = null;
    }
  }
}
