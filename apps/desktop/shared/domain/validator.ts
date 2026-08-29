import type { TaskAnalysisProposal } from "./types.js";
import { TASK_CATEGORIES, COGNITIVE_LOADS, SPLITTABILITIES } from "./types.js";

/**
 * 确定性校验层（PRD 05 §7）：AI 输出必须整体通过才可用；
 * 未知枚举 / 缺字段 / 超范围 → 整份 Proposal 不可写入。
 */
export const DURATION_MIN_MS = 5 * 60_000;        // 5 分钟
export const DURATION_MAX_MS = 40 * 3_600_000;    // 40 小时
const SUBTASK_SUM_TOLERANCE = 0.3;                // 子任务和与主估计偏差 ≤30%

export type ValidationResult =
  | { ok: true; proposal: TaskAnalysisProposal }
  | { ok: false; errors: string[] };

export function validateProposal(p: TaskAnalysisProposal): ValidationResult {
  const errors: string[] = [];

  if (!TASK_CATEGORIES.includes(p.category)) errors.push(`UNKNOWN_CATEGORY:${p.category}`);
  if (!COGNITIVE_LOADS.includes(p.cognitiveLoad)) errors.push(`UNKNOWN_COGNITIVE_LOAD:${p.cognitiveLoad}`);
  if (!SPLITTABILITIES.includes(p.splittability)) errors.push(`UNKNOWN_SPLITTABILITY:${p.splittability}`);

  if (!Number.isFinite(p.estimatedDurationMs) || p.estimatedDurationMs < DURATION_MIN_MS || p.estimatedDurationMs > DURATION_MAX_MS) {
    errors.push("DURATION_OUT_OF_RANGE");
  }
  if (p.estimateRangeMs.low > p.estimatedDurationMs || p.estimateRangeMs.high < p.estimatedDurationMs) {
    errors.push("RANGE_INCONSISTENT");
  }
  if (p.confidence < 0 || p.confidence > 1) errors.push("CONFIDENCE_OUT_OF_RANGE");

  if (p.suggestedSubtasks?.length) {
    const sum = p.suggestedSubtasks.reduce((s, st) => s + st.estimatedDurationMs, 0);
    const dev = Math.abs(sum - p.estimatedDurationMs) / p.estimatedDurationMs;
    if (dev > SUBTASK_SUM_TOLERANCE) errors.push("SUBTASK_SUM_DEVIATION");
    if (p.suggestedSubtasks.some((st) => !st.title.trim())) errors.push("SUBTASK_TITLE_EMPTY");
    if (p.suggestedSubtasks.some((st) => !Number.isFinite(st.estimatedDurationMs) || st.estimatedDurationMs < DURATION_MIN_MS || st.estimatedDurationMs > DURATION_MAX_MS)) {
      errors.push("SUBTASK_DURATION_OUT_OF_RANGE");
    }
    if (new Set(p.suggestedSubtasks.map((st) => st.order)).size !== p.suggestedSubtasks.length) {
      errors.push("SUBTASK_ORDER_DUPLICATED");
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true, proposal: p };
}
