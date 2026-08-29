/**
 * 端到端演示：录任务 → 自动 AI 分析（可降级）→ 确认建议 → 排程 → 承诺 → 完成 → 个人速度学习。
 * 运行：npm run demo            （有 ANTHROPIC_API_KEY / ant 登录则真调 Claude）
 *      NOT_FORCE_BASELINE=1 npm run demo   （纯离线确定性演示）
 */
import { TaskStore } from "./store.js";
import { createTaskAndAnalyze } from "./flow.js";
import { applyProposal } from "./accept.js";
import { generateScheduleDraft } from "./scheduler.js";
import { personalMultiplier, type CalibrationSample } from "./calibration.js";
import type { WorkSettings } from "./types.js";

const MIN = 60_000;
const fmt = (ms: number) => new Date(ms).toTimeString().slice(0, 5);
const dur = (ms: number) => `${Math.round(ms / MIN)}分钟`;

const now = new Date();
now.setHours(9, 30, 0, 0); // 假设现在是工作日 09:30
const NOW = now.getTime();

const settings: WorkSettings = { workStart: "09:00", lunchStart: "12:00", lunchEnd: "13:00", workEnd: "18:00" };
const store = new TaskStore();
const history: CalibrationSample[] = [
  // 模拟历史：这位用户写文档比目录基线快
  { category: "WRITING", estimatedMs: 60 * MIN, actualMs: 45 * MIN, source: "EXPLICIT_TIMER" },
  { category: "WRITING", estimatedMs: 90 * MIN, actualMs: 70 * MIN, source: "USER_CONFIRMED" },
  { category: "WRITING", estimatedMs: 60 * MIN, actualMs: 50 * MIN, source: "EXPLICIT_TIMER" },
  { category: "WRITING", estimatedMs: 120 * MIN, actualMs: 90 * MIN, source: "EXPLICIT_TIMER" },
  { category: "WRITING", estimatedMs: 45 * MIN, actualMs: 38 * MIN, source: "USER_CONFIRMED" },
];

console.log("═══ 1. 创建任务（只填 标题/DDL/重要性），创建即自动分析 ═══\n");

const inputs = [
  { title: "整理产品评审材料", dueAt: NOW + 7.5 * 60 * MIN, importance: "HIGH" as const },
  { title: "撰写需求文档", dueAt: NOW + 30 * 60 * MIN, importance: "MEDIUM" as const },
  { title: "准备周一例会", dueAt: NOW + 72 * 60 * MIN, importance: "LOW" as const },
];

for (const input of inputs) {
  const { task, analysis } = await createTaskAndAnalyze(store, input, history, NOW);
  const p = analysis.proposal;
  console.log(`▸ ${task.title}  [${task.urgency}]`);
  console.log(`  来源=${analysis.source}${analysis.fallbackReason ? `(降级原因:${analysis.fallbackReason})` : ""} 模型=${p.modelVersion}`);
  console.log(`  建议: ${p.category} / ${dur(p.estimatedDurationMs)} (区间 ${dur(p.estimateRangeMs.low)}–${dur(p.estimateRangeMs.high)}) / 负荷=${p.cognitiveLoad} / ${p.splittability} / 置信=${p.confidence.toFixed(2)}`);
  console.log(`  理由码: ${p.rationaleCodes.join(", ")}`);
  if (p.suggestedSubtasks?.length) console.log(`  子任务建议: ${p.suggestedSubtasks.map((s) => `${s.title}(${dur(s.estimatedDurationMs)})`).join(" → ")}`);

  // “确认建议”：第二个任务演示用户覆盖时长（用户优先，fieldOrigins=USER）
  const overrides = task.title === "撰写需求文档" ? { estimatedDurationMs: 90 * MIN } : undefined;
  const { task: updated } = applyProposal(store, task, p, {
    acceptedFields: ["category", "estimatedDurationMs", "cognitiveLoad", "splittability"],
    overrides,
  });
  if (overrides) console.log(`  ✎ 用户修改时长 → ${dur(updated.estimatedDurationMs!)}（fieldOrigins.estimatedDurationMs=${updated.fieldOrigins.estimatedDurationMs}）`);
  console.log();
}

console.log("═══ 2. AI 排程草案 → 硬约束校验（Provider 未接入时确定性降级） ═══\n");
store.refreshUrgency(NOW);
const scheduleResult = await generateScheduleDraft({ tasks: store.list(), settings, nowMs: NOW });
const draft = scheduleResult.draft;
console.log(`  排程来源=${scheduleResult.source}${scheduleResult.fallbackReason ? `（${scheduleResult.fallbackReason}）` : ""}`);

for (const b of draft.blocks) {
  const label = b.type === "TASK" ? store.get(b.taskId!).title : b.type === "BREAK" ? "午休" : b.type;
  const lock = b.type === "BREAK" ? " 🔒" : "";
  console.log(`  ${fmt(b.startAt)}–${fmt(b.endAt)}  ${label}${lock}`);
}
for (const u of draft.unscheduled) {
  console.log(`  ⚠ 排不下: ${store.get(u.taskId).title} · 还需 ${dur(u.neededMs)} (${u.reasonCode})`);
}
if (draft.projectedFinishAt) {
  const workEnd = new Date(NOW); workEnd.setHours(18, 0, 0, 0);
  const onTime = draft.projectedFinishAt <= workEnd.getTime();
  console.log(`\n  预计 ${fmt(draft.projectedFinishAt)} 完成任务块，${onTime ? "可准点下班 ✅" : "有加班风险 ⚠️"}`);
}
console.log(`  建议今日承诺任务（仅完整排入）: ${draft.commitmentCandidateTaskIds.map((id) => store.get(id).title).join("、")}`);

console.log("\n═══ 3. 完成任务 + 个人速度学习（幂等完成，重放不重复计） ═══\n");
const first = store.list().find((t) => t.title === "整理产品评审材料")!;
const completion = { actualDurationMs: 40 * MIN, actualDurationSource: "EXPLICIT_TIMER" as const };
store.complete(first.id, "demo-key-1", completion);
store.complete(first.id, "demo-key-1", completion); // 同 key + 同 payload 重放：无副作用
const done = store.get(first.id);
console.log(`  ${done.title}: status=${done.status} 实际=${dur(done.actualDurationMs!)} 来源=${done.actualDurationSource} revision=${done.revision}`);

const newHistory: CalibrationSample[] = [...history,
  { category: done.category ?? "OTHER", estimatedMs: done.estimatedDurationMs ?? 0, actualMs: done.actualDurationMs!, source: "EXPLICIT_TIMER" },
];
const m = personalMultiplier(newHistory, "WRITING");
console.log(`  WRITING 个人速度乘数=${m.multiplier.toFixed(2)}（样本 ${m.sampleCount} 个${m.learned ? "，已学习你的速度" : ""}）`);

console.log("\n✔ 演示完成：创建即分析 → 确认建议(用户优先) → AI 排程/硬约束校验 → 幂等完成 → 速度校准 全链路可用。");
