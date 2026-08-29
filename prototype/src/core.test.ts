import { test } from "node:test";
import assert from "node:assert/strict";
import { computeUrgency } from "./urgency.js";
import { TaskStore } from "./store.js";
import { validateProposal } from "./validator.js";
import { applyProposal } from "./accept.js";
import { baselineProposal } from "./baseline.js";
import { generateScheduleDraft, solveSchedule, validateScheduleProposal } from "./scheduler.js";
import { personalMultiplier } from "./calibration.js";
import { SiliconFlowTaskAnalysisProvider, applyPersonalCalibration, enforceCategoryInvariants, type ProviderProposal } from "./ai.js";
import { SiliconFlowScheduleProvider } from "./schedule-ai.js";
import type { ScheduleProposal, TaskAnalysisProposal, WorkSettings } from "./types.js";

const MIN = 60_000;
const HOUR = 60 * MIN;
const NOW = new Date("2026-08-29T09:30:00+08:00").getTime();
const settings: WorkSettings = { workStart: "09:00", lunchStart: "12:00", lunchEnd: "13:00", workEnd: "18:00" };

test("urgency: 边界正确", () => {
  assert.equal(computeUrgency(NOW, NOW - 1), "OVERDUE");
  assert.equal(computeUrgency(NOW, NOW + 1 * HOUR), "URGENT");             // 无估时 → 固定 2h 阈值
  assert.equal(computeUrgency(NOW, NOW + 4 * HOUR, 3 * HOUR), "URGENT");   // 剩余 <= 估时+2h
  assert.equal(computeUrgency(NOW, NOW + 2 * 24 * HOUR), "UPCOMING");
  assert.equal(computeUrgency(NOW, NOW + 10 * 24 * HOUR), "NOT_URGENT");
});

test("store: revision 冲突不覆盖；完成幂等", () => {
  const store = new TaskStore();
  const t = store.create({ title: "x", dueAt: NOW + HOUR, importance: "HIGH" }, NOW);
  store.patch(t.id, 1, { status: "PLANNED" });
  assert.throws(() => store.patch(t.id, 1, { status: "IN_PROGRESS" }), /TASK_REVISION_CONFLICT/);
  const done1 = store.complete(t.id, "k1", { actualDurationMs: 30 * MIN });
  const done2 = store.complete(t.id, "k1", { actualDurationMs: 30 * MIN }); // 同 payload 重放
  assert.equal(done1.status, "COMPLETED");
  assert.equal(done2.actualDurationMs, 30 * MIN);
  assert.throws(
    () => store.complete(t.id, "k1", { actualDurationMs: 999 * MIN }),
    /IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD/,
  );
});

test("store: 撤销完成恢复为 IN_PROGRESS；父任务因子任务撤销而一并撤销", () => {
  const store = new TaskStore();
  const t = store.create({ title: "写文档", dueAt: NOW + HOUR, importance: "HIGH" }, NOW);
  const done = store.complete(t.id, "k1", { actualDurationMs: 20 * MIN });
  const reopened = store.reopen(done.id);
  assert.equal(reopened.status, "IN_PROGRESS");
  assert.equal(reopened.completedAt, undefined);
  assert.equal(reopened.actualDurationMs, undefined);
  assert.equal(store.reopen(reopened.id).revision, reopened.revision); // 非完成状态调用天然幂等，不报错、不产生新版本

  const parent = store.create({ title: "父任务", dueAt: NOW + 8 * HOUR, importance: "HIGH" }, NOW);
  const parentWithMode = store.patch(parent.id, parent.revision, { schedulingMode: "CHILDREN" });
  const childA = store.patch(
    store.create({ title: "子任务A", dueAt: NOW + 8 * HOUR, importance: "HIGH" }, NOW).id,
    1,
    { parentTaskId: parentWithMode.id },
  );
  const childB = store.patch(
    store.create({ title: "子任务B", dueAt: NOW + 8 * HOUR, importance: "HIGH" }, NOW).id,
    1,
    { parentTaskId: parentWithMode.id },
  );
  store.complete(childA.id, "child-a", {});
  store.complete(childB.id, "child-b", {});
  assert.equal(store.get(parentWithMode.id).status, "COMPLETED");
  store.reopen(childB.id);
  assert.equal(store.get(parentWithMode.id).status, "IN_PROGRESS", "子任务被撤销完成后，父任务的完成条件不再成立");
});

test("validator: 未知枚举/超范围/子任务和偏差 → 整体拒绝", () => {
  const base = baselineProposal("t1", { title: "写文档", dueAt: NOW + HOUR, importance: "HIGH" });
  assert.equal(validateProposal(base).ok, true);
  assert.equal(validateProposal({ ...base, category: "MAGIC" as never }).ok, false);
  assert.equal(validateProposal({ ...base, estimatedDurationMs: 2 * MIN, estimateRangeMs: { low: MIN, high: 3 * MIN } }).ok, false);
  const badSub: TaskAnalysisProposal = { ...base, suggestedSubtasks: [{ title: "a", estimatedDurationMs: base.estimatedDurationMs * 3, order: 1 }] };
  assert.equal(validateProposal(badSub).ok, false);
});

test("accept: 用户覆盖字段标 USER，再次接受不被 AI 覆盖", () => {
  const store = new TaskStore();
  const t = store.create({ title: "写需求文档", dueAt: NOW + 8 * HOUR, importance: "MEDIUM" }, NOW);
  const p1 = baselineProposal(t.id, t);
  const { task: v1 } = applyProposal(store, t, p1, {
    acceptedFields: ["category", "estimatedDurationMs"],
    overrides: { estimatedDurationMs: 90 * MIN },
  });
  assert.equal(v1.estimatedDurationMs, 90 * MIN);
  assert.equal(v1.fieldOrigins.estimatedDurationMs, "USER");
  // 第二次分析后全量接受（无 override）：USER 字段保持不变
  const p2 = baselineProposal(t.id, v1, [], v1.revision, NOW);
  const { task: v2 } = applyProposal(store, v1, p2, { acceptedFields: ["category", "estimatedDurationMs"] });
  assert.equal(v2.estimatedDurationMs, 90 * MIN);
  assert.equal(v2.fieldOrigins.estimatedDurationMs, "USER");
});

test("accept: 旧 Proposal 不能写入已变更任务；override 需运行时校验", () => {
  const store = new TaskStore();
  const task = store.create({ title: "写需求", dueAt: NOW + 8 * HOUR, importance: "HIGH" }, NOW);
  const proposal = baselineProposal(task.id, task, [], task.revision, NOW);
  const changed = store.patch(task.id, task.revision, { title: "回复邮件", fieldOrigins: { ...task.fieldOrigins, title: "USER" } });
  assert.throws(
    () => applyProposal(store, changed, proposal, { acceptedFields: ["category"] }),
    /PROPOSAL_TASK_REVISION_STALE/,
  );

  const fresh = baselineProposal(changed.id, changed, [], changed.revision, NOW);
  assert.throws(
    () => applyProposal(store, changed, fresh, {
      acceptedFields: ["estimatedDurationMs"],
      overrides: { estimatedDurationMs: -1 },
    }),
    /TASK_DURATION_INVALID/,
  );
});

test("accept: 确认子任务后由子任务替代父任务参与排程", () => {
  const store = new TaskStore();
  const parent = store.create({ title: "写需求", dueAt: NOW + 8 * HOUR, importance: "HIGH" }, NOW);
  const base = baselineProposal(parent.id, parent, [], parent.revision, NOW);
  const proposal: TaskAnalysisProposal = {
    ...base,
    estimatedDurationMs: 60 * MIN,
    estimateRangeMs: { low: 45 * MIN, high: 90 * MIN },
    suggestedSubtasks: [
      { title: "初稿", estimatedDurationMs: 35 * MIN, order: 1 },
      { title: "检查", estimatedDurationMs: 25 * MIN, order: 2 },
    ],
  };
  const result = applyProposal(store, parent, proposal, {
    acceptedFields: ["category", "estimatedDurationMs", "cognitiveLoad", "splittability"],
    acceptedSubtaskOrders: [1, 2],
  });
  assert.equal(result.task.schedulingMode, "CHILDREN");
  const draft = solveSchedule({ tasks: store.list(), settings, nowMs: NOW });
  assert.equal(draft.blocks.some((block) => block.taskId === parent.id), false);
  assert.equal(result.createdSubtasks.every((task) => draft.blocks.some((block) => block.taskId === task.id)), true);
  for (const child of result.createdSubtasks) {
    store.complete(child.id, `complete-${child.id}`, { actualDurationMs: child.estimatedDurationMs });
  }
  assert.equal(store.get(parent.id).status, "COMPLETED");
});

test("accept: 用户三字段永不可被建议写入", () => {
  const store = new TaskStore();
  const t = store.create({ title: "x", dueAt: NOW + HOUR, importance: "LOW" }, NOW);
  const p = baselineProposal(t.id, t);
  assert.throws(() => applyProposal(store, t, p, { acceptedFields: ["title" as never] }), /FIELD_NOT_ACCEPTABLE/);
});

test("scheduler: 确定性 + 午休无任务块 + 容量不足如实报告", () => {
  const store = new TaskStore();
  const mk = (title: string, est: number, imp: "HIGH" | "LOW") => {
    const t = store.create({ title, dueAt: NOW + 8 * HOUR, importance: imp }, NOW);
    return store.patch(t.id, 1, { estimatedDurationMs: est, splittability: "SPLITTABLE" });
  };
  mk("A", 3 * HOUR, "HIGH");
  mk("B", 4 * HOUR, "HIGH");
  mk("C", 5 * HOUR, "LOW"); // 总需求 12h > 可用 ~7.5h → C 部分排不下

  const d1 = solveSchedule({ tasks: store.list(), settings, nowMs: NOW });
  const d2 = solveSchedule({ tasks: store.list(), settings, nowMs: NOW });
  assert.deepEqual(
    d1.blocks.map((b) => [b.type, b.startAt, b.endAt, b.taskId]),
    d2.blocks.map((b) => [b.type, b.startAt, b.endAt, b.taskId]),
  ); // 同输入同输出

  const lunch = d1.blocks.find((b) => b.type === "BREAK")!;
  for (const b of d1.blocks.filter((b) => b.type === "TASK")) {
    assert.ok(b.endAt <= lunch.startAt || b.startAt >= lunch.endAt, "任务块不得压午休");
  }
  assert.ok(d1.unscheduled.length >= 1);
  assert.ok(d1.unscheduled[0].neededMs > 0);
  // 不压缩：已排块总时长 + 排不下时长 = 总需求
  const scheduled = d1.blocks.filter((b) => b.type === "TASK").reduce((s, b) => s + (b.endAt - b.startAt), 0);
  const missing = d1.unscheduled.reduce((s, u) => s + u.neededMs, 0);
  assert.equal(scheduled + missing, 12 * HOUR);
  for (const candidateId of d1.commitmentCandidateTaskIds) {
    assert.equal(d1.taskResults.find((item) => item.taskId === candidateId)?.result, "FULLY_SCHEDULED");
  }
});

test("scheduler: DDL 是硬约束，不会把时间块排到 DDL 之后", () => {
  const store = new TaskStore();
  const task = store.create({ title: "紧急任务", dueAt: NOW + HOUR, importance: "CRITICAL" }, NOW);
  store.patch(task.id, task.revision, { estimatedDurationMs: 2 * HOUR, splittability: "SPLITTABLE" });
  const draft = solveSchedule({ tasks: store.list(), settings, nowMs: NOW });
  assert.equal(draft.blocks.filter((block) => block.taskId === task.id).every((block) => block.endAt <= task.dueAt), true);
  assert.equal(draft.unscheduled.find((item) => item.taskId === task.id)?.reasonCode, "DEADLINE_CONFLICT");
  assert.equal(draft.commitmentCandidateTaskIds.includes(task.id), false);
});

test("scheduler: AI 草案必须通过硬约束，越过 DDL 时整份拒绝并降级", async () => {
  const store = new TaskStore();
  const task = store.create({ title: "写文档", dueAt: NOW + HOUR, importance: "HIGH" }, NOW);
  const ready = store.patch(task.id, task.revision, { estimatedDurationMs: 30 * MIN, splittability: "SPLITTABLE" });
  const invalid: ScheduleProposal = {
    proposalId: "ai-1",
    modelVersion: "fake-siliconflow",
    blocks: [{
      blockId: "b1", taskId: ready.id, type: "TASK",
      startAt: ready.dueAt, endAt: ready.dueAt + 30 * MIN,
      sequence: 1, lockedByUser: false,
    }],
  };
  const checked = validateScheduleProposal({ tasks: store.list(), settings, nowMs: NOW }, invalid);
  assert.equal(checked.ok, false);
  const empty = validateScheduleProposal(
    { tasks: store.list(), settings, nowMs: NOW },
    { proposalId: "empty", modelVersion: "fake", blocks: [] },
  );
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.equal(empty.errors.includes("AI_EMPTY_SCHEDULE_WHEN_TASKS_FIT"), true);
  const generated = await generateScheduleDraft(
    { tasks: store.list(), settings, nowMs: NOW },
    { generate: async () => invalid },
  );
  assert.equal(generated.source, "BASELINE");
  assert.equal(generated.fallbackReason, "HARD_CONSTRAINT_VIOLATION");
});

test("scheduler: 原子任务不能只排一部分", () => {
  const store = new TaskStore();
  const task = store.create({ title: "不可拆任务", dueAt: NOW + 4 * HOUR, importance: "HIGH" }, NOW);
  const ready = store.patch(task.id, task.revision, { estimatedDurationMs: HOUR, splittability: "ATOMIC" });
  const partial: ScheduleProposal = {
    proposalId: "partial-atomic",
    modelVersion: "fake",
    blocks: [{
      blockId: "b1", taskId: ready.id, type: "TASK",
      startAt: NOW, endAt: NOW + 30 * MIN, sequence: 1, lockedByUser: false,
    }],
  };
  const checked = validateScheduleProposal({ tasks: store.list(), settings, nowMs: NOW }, partial);
  assert.equal(checked.ok, false);
  if (!checked.ok) assert.equal(checked.errors.includes(`ATOMIC_TASK_PARTIAL:${ready.id}`), true);
});

test("scheduler: 缺估时 → MISSING_ESTIMATE", () => {
  const store = new TaskStore();
  store.create({ title: "无估时", dueAt: NOW + 8 * HOUR, importance: "HIGH" }, NOW);
  const d = solveSchedule({ tasks: store.list(), settings, nowMs: NOW });
  assert.equal(d.unscheduled[0]?.reasonCode, "MISSING_ESTIMATE");
});

test("calibration: 乘数 clamp 到 [0.5, 3.0]，样本不足不启用", () => {
  const few = personalMultiplier([{ category: "CODING", estimatedMs: HOUR, actualMs: 10 * HOUR, source: "EXPLICIT_TIMER" }], "CODING");
  assert.equal(few.learned, false);
  assert.equal(few.multiplier, 1);
  const many = personalMultiplier(
    Array.from({ length: 5 }, () => ({ category: "CODING" as const, estimatedMs: HOUR, actualMs: 10 * HOUR, source: "EXPLICIT_TIMER" as const })),
    "CODING",
  );
  assert.equal(many.multiplier, 3.0);
  const lowConfidence = personalMultiplier(
    Array.from({ length: 5 }, () => ({ category: "CODING" as const, estimatedMs: HOUR, actualMs: 2 * HOUR, source: "EXPLICIT_TIMER" as const, confidence: 0.4 })),
    "CODING",
  );
  assert.equal(lowConfidence.learned, false);
});

test("ai: 会议类别强制 ATOMIC，其余类别与已是 ATOMIC 的情况不受影响", () => {
  const meetingSplit: ProviderProposal = {
    category: "MEETING", estimatedDurationMs: 60 * MIN,
    estimateRangeMs: { low: 45 * MIN, high: 90 * MIN },
    cognitiveLoad: "MEDIUM", splittability: "SPLITTABLE",
    suggestedSubtasks: [], confidence: 0.6, rationaleCodes: ["TITLE_SEMANTICS"], warnings: [], modelVersion: "test",
  };
  const fixed = enforceCategoryInvariants(meetingSplit);
  assert.equal(fixed.splittability, "ATOMIC");
  assert.equal(fixed.rationaleCodes.includes("MEETING_FORCED_ATOMIC"), true);

  const meetingAtomic: ProviderProposal = { ...meetingSplit, splittability: "ATOMIC" };
  assert.equal(enforceCategoryInvariants(meetingAtomic), meetingAtomic);

  const writingSplit: ProviderProposal = { ...meetingSplit, category: "WRITING" };
  assert.equal(enforceCategoryInvariants(writingSplit), writingSplit);
});

test("ai: 确定性层按 AI 返回类别套用个人速度乘数，样本不足则原样返回", () => {
  const history = Array.from({ length: 5 }, () => ({
    category: "MEETING" as const, estimatedMs: 60 * MIN, actualMs: 45 * MIN,
    source: "EXPLICIT_TIMER" as const, confidence: 0.9,
  }));
  const fields: ProviderProposal = {
    category: "MEETING", estimatedDurationMs: 120 * MIN,
    estimateRangeMs: { low: 60 * MIN, high: 180 * MIN },
    cognitiveLoad: "MEDIUM", splittability: "ATOMIC",
    suggestedSubtasks: [
      { title: "会前准备", estimatedDurationMs: 60 * MIN, order: 1 },
      { title: "参会", estimatedDurationMs: 60 * MIN, order: 2 },
    ],
    confidence: 0.6, rationaleCodes: ["TITLE_SEMANTICS"], warnings: [], modelVersion: "test",
  };
  const expectedMultiplier = personalMultiplier(history, "MEETING", NOW).multiplier;
  const calibrated = applyPersonalCalibration(fields, history, NOW);
  assert.equal(calibrated.estimatedDurationMs, Math.round(120 * MIN * expectedMultiplier));
  assert.equal(calibrated.estimateRangeMs.low, Math.round(60 * MIN * expectedMultiplier));
  assert.equal(calibrated.estimateRangeMs.high, Math.round(180 * MIN * expectedMultiplier));
  assert.equal(calibrated.suggestedSubtasks?.[0].estimatedDurationMs, Math.round(60 * MIN * expectedMultiplier));
  assert.ok(calibrated.rationaleCodes.some((code) => code.startsWith("PERSONAL_MULTIPLIER_APPLIED:")));

  const uncalibrated = applyPersonalCalibration(fields, [], NOW); // 样本不足 → 原样返回，不臆造调整
  assert.equal(uncalibrated, fields);
});

test("ai: SiliconFlow Provider 读取结构化输出且不绕过统一 Proposal 契约", async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.LLM_API_KEY;
  const previousModel = process.env.LLM_MODEL;
  const previousBaseUrl = process.env.LLM_BASE_URL;
  process.env.LLM_API_KEY = "test-secret";
  process.env.LLM_MODEL = "test-model";
  process.env.LLM_BASE_URL = "https://example.invalid/v1";
  globalThis.fetch = async (_input, init) => {
    assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer test-secret");
    return new Response(JSON.stringify({
      model: "test-model",
      choices: [{
        message: {
          content: JSON.stringify({
            category: "WRITING",
            estimatedMinutes: 60,
            estimateLowMinutes: 40,
            estimateHighMinutes: 90,
            cognitiveLoad: "HIGH",
            splittability: "SPLITTABLE",
            suggestedSubtasks: [],
            confidence: 0.8,
            rationaleCodes: ["TITLE_SEMANTICS"],
          }),
        },
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const result = await new SiliconFlowTaskAnalysisProvider().analyze({
      task: { title: "写需求文档", dueAt: NOW + 8 * HOUR, importance: "HIGH" },
      history: [],
      nowMs: NOW,
    });
    assert.equal(result.category, "WRITING");
    assert.equal(result.estimatedDurationMs, 60 * MIN);
    assert.equal(result.modelVersion, "test-model");
  } finally {
    globalThis.fetch = previousFetch;
    restoreEnv("LLM_API_KEY", previousKey);
    restoreEnv("LLM_MODEL", previousModel);
    restoreEnv("LLM_BASE_URL", previousBaseUrl);
  }
});

test("ai schedule: 只发送结构化排程约束，不发送任务标题", async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.LLM_API_KEY;
  const previousModel = process.env.LLM_MODEL;
  const previousBaseUrl = process.env.LLM_BASE_URL;
  process.env.LLM_API_KEY = "test-secret";
  process.env.LLM_MODEL = "test-model";
  process.env.LLM_BASE_URL = "https://example.invalid/v1";
  const store = new TaskStore();
  const created = store.create({ title: "私密任务正文", dueAt: NOW + 3 * HOUR, importance: "HIGH" }, NOW);
  const task = store.patch(created.id, created.revision, {
    estimatedDurationMs: 30 * MIN,
    cognitiveLoad: "HIGH",
    splittability: "ATOMIC",
  });
  globalThis.fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body));
    const userPayload = JSON.parse(request.messages[1].content);
    assert.equal(JSON.stringify(userPayload).includes("私密任务正文"), false);
    assert.equal("title" in userPayload.tasks[0], false);
    assert.equal(userPayload.tasks[0].taskId, task.id);
    return new Response(JSON.stringify({
      model: "test-model",
      choices: [{ message: { content: JSON.stringify({
        orderedTaskIds: [task.id],
      }) } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const proposal = await new SiliconFlowScheduleProvider().generate({ tasks: store.list(), settings, nowMs: NOW });
    assert.equal(proposal.blocks[0].taskId, task.id);
    assert.equal(proposal.modelVersion, "test-model");
  } finally {
    globalThis.fetch = previousFetch;
    restoreEnv("LLM_API_KEY", previousKey);
    restoreEnv("LLM_MODEL", previousModel);
    restoreEnv("LLM_BASE_URL", previousBaseUrl);
  }
});

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
