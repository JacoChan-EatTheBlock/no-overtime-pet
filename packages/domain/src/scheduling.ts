import type { Task, DurationMs } from '@not/contracts';

export interface ScheduleBlock {
  taskId: string;
  startMs: DurationMs; // offset from work start
  durationMs: DurationMs;
  locked: boolean;
}

/**
 * Deterministic schedule solver.
 * Arranges tasks into time blocks respecting:
 * - User-locked positions
 * - DDL urgency
 * - Importance
 * - Cognitive load alternation
 */
export function solveSchedule(
  tasks: Task[],
  availableMs: DurationMs,
  lockedBlocks: ScheduleBlock[] = [],
): ScheduleBlock[] {
  // TODO: Implement deterministic scheduling algorithm
  // Phase 1: Place locked blocks
  // Phase 2: Sort remaining by urgency/importance
  // Phase 3: Fill gaps with cognitive load alternation
  return [];
}
