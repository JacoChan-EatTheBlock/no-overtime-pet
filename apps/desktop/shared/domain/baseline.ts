import { randomUUID } from "node:crypto";
import type { UserTaskInput, TaskAnalysisProposal } from "./types.js";
import { CATEGORY_CATALOG, CATALOG_VERSION, classifyByKeywords } from "./catalog.js";
import { personalMultiplier, type CalibrationSample } from "./calibration.js";
import { taskInputHash } from "./proposal.js";

export const ANALYSIS_POLICY_VERSION = "analysis-policy-proto-1";

/**
 * 确定性基线估计（PRD 05 §6.1/§7）：模型不可用时的降级路径，
 * 目录基线 × 个人速度乘数，永远可用、同输入同输出。
 */
export function baselineProposal(
  taskId: string,
  input: UserTaskInput,
  history: CalibrationSample[] = [],
  taskRevision = 1,
  nowMs = Date.now(),
): TaskAnalysisProposal {
  const category = classifyByKeywords(input.title);
  const entry = CATEGORY_CATALOG[category];
  const { multiplier, sampleCount, learned } = personalMultiplier(history, category, nowMs);

  const estimate = Math.round(entry.baseEstimateMs * multiplier);
  const suggestedSubtasks = entry.splittability === "SPLITTABLE" && estimate >= 50 * 60_000
    ? [
        { title: "起草/推进", estimatedDurationMs: Math.round(estimate * 0.6), order: 1 },
        { title: "收尾检查", estimatedDurationMs: estimate - Math.round(estimate * 0.6), order: 2 },
      ]
    : undefined;
  const rationaleCodes = ["CATALOG_BASELINE"];
  if (learned) rationaleCodes.push(`PERSONAL_MULTIPLIER_APPLIED:${multiplier.toFixed(2)}:${sampleCount}`);
  else rationaleCodes.push("INSUFFICIENT_HISTORY");

  return {
    proposalId: randomUUID(),
    taskId,
    taskRevision,
    inputHash: taskInputHash(input),
    createdAt: nowMs,
    category,
    estimatedDurationMs: estimate,
    estimateRangeMs: {
      low: Math.round(estimate * entry.rangeRatio[0]),
      high: Math.round(estimate * entry.rangeRatio[1]),
    },
    cognitiveLoad: entry.cognitiveLoad,
    splittability: entry.splittability,
    suggestedSubtasks,
    confidence: learned ? 0.55 : 0.35, // 基线置信度低，UI 显示“样本不足”
    rationaleCodes,
    warnings: learned ? [] : ["BASELINE_ONLY_LOW_CONFIDENCE"],
    policyVersion: ANALYSIS_POLICY_VERSION,
    modelVersion: "baseline",
  };
}
