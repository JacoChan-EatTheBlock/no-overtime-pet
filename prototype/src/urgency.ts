import type { Urgency } from "./types.js";

export const URGENCY_POLICY_VERSION = "urgency-policy-v1";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** 阈值集中一处，带版本（PRD 04 §4：阈值不得散落在 UI 代码中） */
export const URGENCY_THRESHOLDS = {
  urgentSlackMs: 2 * HOUR,   // 剩余 <= 预计时长 + 2h → URGENT
  urgentFixedMs: 2 * HOUR,   // 无预计时长时的固定阈值
  upcomingMs: 3 * DAY,       // 剩余 <= 3d → UPCOMING
};

export function computeUrgency(nowMs: number, dueAtMs: number, estimatedDurationMs?: number): Urgency {
  const remaining = dueAtMs - nowMs;
  if (remaining < 0) return "OVERDUE";
  const urgentThreshold = estimatedDurationMs !== undefined
    ? estimatedDurationMs + URGENCY_THRESHOLDS.urgentSlackMs
    : URGENCY_THRESHOLDS.urgentFixedMs;
  if (remaining <= urgentThreshold) return "URGENT";
  if (remaining <= URGENCY_THRESHOLDS.upcomingMs) return "UPCOMING";
  return "NOT_URGENT";
}
