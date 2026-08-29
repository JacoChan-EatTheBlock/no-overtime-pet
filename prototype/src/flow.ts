import type { Task, UserTaskInput } from "./types.js";
import type { TaskStore } from "./store.js";
import { analyzeTask, type AnalyzeResult, type TaskAnalysisProvider } from "./ai.js";
import type { CalibrationSample } from "./calibration.js";

/**
 * “创建即分析”编排（PRD 04 §2 / 13 §4.1）：
 * 创建成功后自动发起分析；分析失败不回滚任务。
 * 返回 task + 分析结果（含降级来源），上层进入“确认建议”页。
 */
export async function createTaskAndAnalyze(
  store: TaskStore,
  input: UserTaskInput,
  history: CalibrationSample[] = [],
  nowMs = Date.now(),
  provider?: TaskAnalysisProvider,
): Promise<{ task: Task; analysis: AnalyzeResult }> {
  const task = store.create(input, nowMs);            // 1. 先落正式 Task
  const analysis = await analyzeTask(task.id, input, history, nowMs, task.revision, provider); // 2. 自动分析（内部兜底降级）
  return { task, analysis };
}
