/**
 * 真实测试数据：某天的 5 条实际待办（千诀科技场景）。
 *
 * 关键点：用户口述的时长【不喂给 AI】——AI 只看标题/DDL/重要性，
 * 我们用它来对照"AI 估得准不准"。历史样本反映"实际用时比口述短"。
 *
 * 运行：
 *   npx tsx src/real-data.ts                     # 用 .env 里的模型
 *   LLM_MODEL=deepseek-ai/DeepSeek-V4-Pro npx tsx src/real-data.ts
 *   NOT_FORCE_BASELINE=1 npx tsx src/real-data.ts  # 离线对照组
 */
import { TaskStore } from "./store.js";
import { createTaskAndAnalyze } from "./flow.js";
import { applyProposal } from "./accept.js";
import { generateScheduleDraft } from "./scheduler.js";
import { personalMultiplier, type CalibrationSample } from "./calibration.js";
import type { Importance, TaskCategory, WorkSettings } from "./types.js";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const now = new Date();
now.setHours(9, 30, 0, 0);
const NOW = now.getTime();
const at = (h: number, m = 0) => { const d = new Date(NOW); d.setHours(h, m, 0, 0); return d.getTime(); };

const settings: WorkSettings = { workStart: "09:00", lunchStart: "12:00", lunchEnd: "13:00", workEnd: "18:00" };

/** 用户口述的时长，只用于事后对照，不进入 AI 输入 */
interface RealTask {
  title: string;
  dueAt: number;
  importance: Importance;
  spokenHours: number;
}

const REAL_TASKS: RealTask[] = [
  { title: "无锡市领导参访欢迎会议安排",                 dueAt: at(14, 0),  importance: "CRITICAL", spokenHours: 1.0 },
  { title: "千诀科技融资PR稿投资人点评信息交互",         dueAt: at(17, 0),  importance: "HIGH",     spokenHours: 0.5 },
  { title: "空天项目线上集锦（AI跑流程，线上部署）",     dueAt: NOW + DAY,  importance: "HIGH",     spokenHours: 3.0 },
  { title: "太空算力PPT排版调整美化",                    dueAt: at(18, 0),  importance: "MEDIUM",   spokenHours: 2.0 },
  { title: "其他LP来访会议配合",                         dueAt: at(16, 30), importance: "MEDIUM",   spokenHours: 1.0 },
];

/**
 * 历史样本：这位用户实际用时普遍比自己口述的估计短 ~25%。
 * 每类满 5 个高置信样本才会启用个人乘数（MIN_SAMPLES_FOR_PERSONALIZATION）。
 */
function fasterSamples(category: TaskCategory, estMinutes: number[], ratio: number): CalibrationSample[] {
  return estMinutes.map((m, i) => ({
    category,
    estimatedMs: m * MIN,
    actualMs: Math.round(m * ratio) * MIN,
    source: i % 2 === 0 ? "EXPLICIT_TIMER" : "USER_CONFIRMED",
    confidence: 0.9,
    recordedAt: NOW - (i + 1) * 3 * DAY,
  }));
}

const history: CalibrationSample[] = [
  ...fasterSamples("MEETING", [60, 45, 90, 60, 30], 0.75),
  ...fasterSamples("WRITING", [30, 45, 60, 30, 40], 0.72),
  ...fasterSamples("DESIGN", [120, 90, 150, 120, 60], 0.78),
  ...fasterSamples("CODING", [180, 120, 240, 90, 150], 0.80),
];

const dur = (ms: number) => `${Math.round(ms / MIN)}分`;
const fmt = (ms: number) => new Date(ms).toTimeString().slice(0, 5);
const pad = (s: string, n: number) => {
  const w = [...s].reduce((a, c) => a + (c.charCodeAt(0) > 255 ? 2 : 1), 0);
  return s + " ".repeat(Math.max(0, n - w));
};

console.log(`\n模型: ${process.env.NOT_FORCE_BASELINE === "1" ? "确定性基线（离线）" : process.env.LLM_MODEL ?? "(默认)"}`);
console.log(`基准时间: ${fmt(NOW)} · 工时 09:00–18:00 · 午休 12:00–13:00\n`);
console.log("═══ AI 返回的分析建议（AI 看不到用户口述时长） ═══\n");

const store = new TaskStore();
const rows: Array<{ title: string; spoken: number; ai: number; cat: string; conf: number; src: string }> = [];

for (const rt of REAL_TASKS) {
  const t0 = Date.now();
  const { task, analysis } = await createTaskAndAnalyze(
    store,
    { title: rt.title, dueAt: rt.dueAt, importance: rt.importance },
    history,
    NOW,
  );
  const p = analysis.proposal;
  const ms = Date.now() - t0;

  console.log(`▸ ${rt.title}`);
  console.log(`  来源=${analysis.source}${analysis.fallbackReason ? ` (降级:${analysis.fallbackReason})` : ""} · 模型=${p.modelVersion} · 耗时=${ms}ms`);
  console.log(`  类型=${p.category}  负荷=${p.cognitiveLoad}  ${p.splittability}  置信=${p.confidence.toFixed(2)}`);
  console.log(`  AI 预计 ${dur(p.estimatedDurationMs)}（区间 ${dur(p.estimateRangeMs.low)}–${dur(p.estimateRangeMs.high)}） vs 你口述 ${rt.spokenHours}h`);
  console.log(`  理由码: ${p.rationaleCodes.join(", ") || "(无)"}`);
  if (p.warnings?.length) console.log(`  ⚠ warnings: ${p.warnings.join(", ")}`);
  if (p.suggestedSubtasks?.length) {
    console.log(`  子任务建议:`);
    for (const s of p.suggestedSubtasks) console.log(`    ${s.order}. ${s.title} (${dur(s.estimatedDurationMs)})`);
  }
  console.log();

  rows.push({
    title: rt.title, spoken: rt.spokenHours * 60,
    ai: Math.round(p.estimatedDurationMs / MIN),
    cat: p.category, conf: p.confidence, src: analysis.source,
  });

  // 全量采纳建议（不覆盖），进入排程
  applyProposal(store, task, p, {
    acceptedFields: ["category", "estimatedDurationMs", "cognitiveLoad", "splittability"],
  });
}

console.log("═══ AI 估时 vs 你口述 ═══\n");
console.log(`  ${pad("任务", 44)}${pad("口述", 8)}${pad("AI", 8)}${pad("偏差", 10)}类型`);
for (const r of rows) {
  const diff = r.ai - r.spoken;
  const pct = ((diff / r.spoken) * 100).toFixed(0);
  const sign = diff > 0 ? "+" : "";
  console.log(`  ${pad(r.title.slice(0, 20), 44)}${pad(`${r.spoken}分`, 8)}${pad(`${r.ai}分`, 8)}${pad(`${sign}${pct}%`, 10)}${r.cat}`);
}
const totalSpoken = rows.reduce((s, r) => s + r.spoken, 0);
const totalAi = rows.reduce((s, r) => s + r.ai, 0);
console.log(`\n  合计: 口述 ${(totalSpoken / 60).toFixed(1)}h · AI ${(totalAi / 60).toFixed(1)}h · 可用工时 ${((at(18, 0) - NOW) / HOUR - 1).toFixed(1)}h`);

console.log("\n═══ 排程结果 ═══\n");
store.refreshUrgency(NOW);
const sr = await generateScheduleDraft({ tasks: store.list(), settings, nowMs: NOW });
console.log(`  排程来源=${sr.source}${sr.fallbackReason ? `（${sr.fallbackReason}）` : ""}\n`);
for (const b of sr.draft.blocks) {
  const label = b.type === "TASK" ? store.get(b.taskId!).title.slice(0, 24) : b.type === "BREAK" ? "午休 🔒" : b.type;
  console.log(`  ${fmt(b.startAt)}–${fmt(b.endAt)}  ${label}`);
}
for (const u of sr.draft.unscheduled) {
  console.log(`  ⚠ 排不下: ${store.get(u.taskId).title.slice(0, 24)} · 还需 ${dur(u.neededMs)} (${u.reasonCode})`);
}
if (sr.draft.projectedFinishAt) {
  const onTime = sr.draft.projectedFinishAt <= at(18, 0);
  console.log(`\n  预计 ${fmt(sr.draft.projectedFinishAt)} 完成，${onTime ? "可准点下班 ✅" : "有加班风险 ⚠️"}`);
}
console.log(`  建议今日承诺（仅完整排入）: ${sr.draft.commitmentCandidateTaskIds.map((id) => store.get(id).title.slice(0, 16)).join("、") || "(无)"}`);

console.log("\n═══ 个人速度乘数（历史：实际比估计短） ═══\n");
for (const c of ["MEETING", "WRITING", "DESIGN", "CODING"] as TaskCategory[]) {
  const m = personalMultiplier(history, c, NOW);
  console.log(`  ${pad(c, 14)} ×${m.multiplier.toFixed(2)}  样本 ${m.sampleCount}  ${m.learned ? "已启用" : "未启用(需5个)"}`);
}
console.log();
