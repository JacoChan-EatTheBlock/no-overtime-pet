import type { TaskCategory } from "./types.js";

/**
 * 个人速度学习（PRD 05 §6.2）：
 * personalMultiplier = clamp(weightedMedian(actual/estimate), 0.5, 3.0)
 * 权重：显式计时 > 用户回填 > 系统推断。
 */
export interface CalibrationSample {
  category: TaskCategory;
  estimatedMs: number;
  actualMs: number;
  source: "EXPLICIT_TIMER" | "USER_CONFIRMED" | "SYSTEM_INFERRED";
  confidence?: number;
  recordedAt?: number;
}

const SOURCE_WEIGHT = { EXPLICIT_TIMER: 3, USER_CONFIRMED: 2, SYSTEM_INFERRED: 1 } as const;
export const MIN_SAMPLES_FOR_PERSONALIZATION = 5;
export const MIN_SAMPLE_CONFIDENCE = 0.7;
const DAY = 24 * 3_600_000;

export function weightedMedian(values: Array<{ value: number; weight: number }>): number {
  const sorted = [...values].sort((a, b) => a.value - b.value);
  const total = sorted.reduce((s, v) => s + v.weight, 0);
  let acc = 0;
  for (const v of sorted) {
    acc += v.weight;
    if (acc >= total / 2) return v.value;
  }
  return sorted[sorted.length - 1]?.value ?? 1;
}

export function personalMultiplier(samples: CalibrationSample[], category: TaskCategory, nowMs = Date.now()): {
  multiplier: number;
  sampleCount: number;
  learned: boolean;
} {
  const relevant = samples.filter((s) =>
    s.category === category
    && Number.isFinite(s.estimatedMs) && s.estimatedMs > 0
    && Number.isFinite(s.actualMs) && s.actualMs > 0
    && (s.confidence ?? 1) >= MIN_SAMPLE_CONFIDENCE
    && (!s.recordedAt || s.recordedAt <= nowMs),
  );
  if (relevant.length < MIN_SAMPLES_FOR_PERSONALIZATION) {
    return { multiplier: 1, sampleCount: relevant.length, learned: false };
  }
  const ratios = relevant.map((s) => ({
    value: s.actualMs / s.estimatedMs,
    weight: SOURCE_WEIGHT[s.source] * recencyWeight(s.recordedAt, nowMs),
  }));
  const m = Math.min(3.0, Math.max(0.5, weightedMedian(ratios)));
  return { multiplier: m, sampleCount: relevant.length, learned: true };
}

function recencyWeight(recordedAt: number | undefined, nowMs: number): number {
  if (!recordedAt) return 1;
  const age = nowMs - recordedAt;
  if (age <= 90 * DAY) return 1;
  if (age <= 180 * DAY) return 0.5;
  return 0.25;
}
