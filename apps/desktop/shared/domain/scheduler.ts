import { randomUUID } from "node:crypto";
import type {
  FixedEvent,
  Importance,
  ScheduleBlock,
  ScheduleDraft,
  ScheduleProposal,
  Task,
  UnscheduledReason,
  Urgency,
  WorkSettings,
} from "./types.js";

export const SCHEDULE_POLICY_VERSION = "schedule-policy-proto-2";

const MIN = 60_000;
const MIN_SPLIT_BLOCK_MS = 25 * MIN;
const FOCUS_BLOCK_MS = 50 * MIN;
const BUFFER_MS = 10 * MIN;

const IMPORTANCE_RANK: Record<Importance, number> = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
const URGENCY_RANK: Record<Urgency, number> = { OVERDUE: 3, URGENT: 2, UPCOMING: 1, NOT_URGENT: 0 };

export interface ScheduleGenerationInput {
  tasks: Task[];
  settings: WorkSettings;
  fixedEvents?: FixedEvent[];
  nowMs: number;
}

/** Jaco 的 SiliconFlow 接口只需适配这个边界，不得直接写入正式日程。 */
export interface ScheduleProvider {
  generate(input: ScheduleGenerationInput): Promise<ScheduleProposal>;
}

function hm(dateMs: number, hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(dateMs);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

function eligibleTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) =>
    task.status !== "COMPLETED"
    && task.status !== "CANCELLED"
    && task.schedulingMode !== "CHILDREN",
  );
}

/**
 * 主路径：AI 生成时间块草案 → 确定性硬约束校验 → 正式 Draft。
 * AI 超时、未接入或输出不合法时，才使用本地确定性降级排程。
 */
export async function generateScheduleDraft(
  input: ScheduleGenerationInput,
  provider?: ScheduleProvider,
): Promise<{ draft: ScheduleDraft; source: "AI" | "BASELINE"; fallbackReason?: string; modelVersion?: string }> {
  if (!provider) {
    return { draft: solveSchedule(input), source: "BASELINE", fallbackReason: "PROVIDER_NOT_CONNECTED" };
  }

  try {
    const proposal = await provider.generate(input);
    const checked = validateScheduleProposal(input, proposal);
    if (!checked.ok) {
      const draft = solveSchedule(input);
      draft.warnings.unshift(`AI_SCHEDULE_REJECTED:${checked.errors.join("|")}`);
      return { draft, source: "BASELINE", fallbackReason: "HARD_CONSTRAINT_VIOLATION" };
    }
    return { draft: finalizeProposal(input, proposal), source: "AI", modelVersion: proposal.modelVersion };
  } catch (error) {
    const draft = solveSchedule(input);
    const reason = error instanceof Error ? error.message.slice(0, 80) : "UNKNOWN";
    draft.warnings.unshift(`AI_SCHEDULE_FAILED:${reason}`);
    return { draft, source: "BASELINE", fallbackReason: reason };
  }
}

export type ScheduleValidationResult = { ok: true } | { ok: false; errors: string[] };

/** 只做硬约束校验：AI 可以决定顺序与块形，但不能越过 DDL、午休、工作时间或用户固定事件。 */
export function validateScheduleProposal(
  input: ScheduleGenerationInput,
  proposal: ScheduleProposal,
): ScheduleValidationResult {
  const errors: string[] = [];
  const fixedEvents = input.fixedEvents ?? [];
  const dayStart = Math.max(input.nowMs, hm(input.nowMs, input.settings.workStart));
  const dayEnd = hm(input.nowMs, input.settings.workEnd);
  const lunchStart = hm(input.nowMs, input.settings.lunchStart);
  const lunchEnd = hm(input.nowMs, input.settings.lunchEnd);
  const tasks = new Map(eligibleTasks(input.tasks).map((task) => [task.id, task]));
  const sorted = [...proposal.blocks].sort((a, b) => a.startAt - b.startAt || a.endAt - b.endAt);
  const scheduledByTask = new Map<string, number>();
  const blockCountByTask = new Map<string, number>();

  for (let index = 0; index < sorted.length; index++) {
    const block = sorted[index];
    if (block.type !== "TASK") {
      errors.push(`AI_NON_TASK_BLOCK_FORBIDDEN:${block.blockId}`);
      continue;
    }
    const task = block.taskId ? tasks.get(block.taskId) : undefined;
    if (!task) {
      errors.push(`UNKNOWN_OR_INELIGIBLE_TASK:${block.taskId ?? "MISSING"}`);
      continue;
    }
    if (!Number.isFinite(block.startAt) || !Number.isFinite(block.endAt) || block.endAt <= block.startAt) {
      errors.push(`BLOCK_TIME_INVALID:${block.blockId}`);
      continue;
    }
    if (block.startAt < dayStart || block.endAt > dayEnd) errors.push(`BLOCK_OUTSIDE_WORKDAY:${task.id}`);
    if (block.endAt > task.dueAt) errors.push(`BLOCK_PAST_DUE:${task.id}`);
    if (overlaps(block.startAt, block.endAt, lunchStart, lunchEnd)) errors.push(`BLOCK_OVERLAPS_LUNCH:${task.id}`);
    if (fixedEvents.some((event) => overlaps(block.startAt, block.endAt, event.startAt, event.endAt))) {
      errors.push(`BLOCK_OVERLAPS_FIXED_EVENT:${task.id}`);
    }
    const previous = sorted[index - 1];
    if (previous && previous.endAt > block.startAt) errors.push(`BLOCK_OVERLAP:${block.blockId}`);
    scheduledByTask.set(task.id, (scheduledByTask.get(task.id) ?? 0) + block.endAt - block.startAt);
    blockCountByTask.set(task.id, (blockCountByTask.get(task.id) ?? 0) + 1);
  }

  for (const [taskId, scheduledMs] of scheduledByTask) {
    const task = tasks.get(taskId);
    const requiredMs = task?.estimatedDurationMs;
    if (!requiredMs) errors.push(`TASK_MISSING_ESTIMATE:${taskId}`);
    else if (scheduledMs > requiredMs) errors.push(`TASK_OVER_SCHEDULED:${taskId}`);
    else if (task?.splittability !== "SPLITTABLE" && scheduledMs < requiredMs) errors.push(`ATOMIC_TASK_PARTIAL:${taskId}`);
    if (task?.splittability !== "SPLITTABLE" && (blockCountByTask.get(taskId) ?? 0) > 1) {
      errors.push(`ATOMIC_TASK_SPLIT:${taskId}`);
    }
  }

  if (sorted.length === 0 && solveSchedule(input).blocks.some((block) => block.type === "TASK")) {
    errors.push("AI_EMPTY_SCHEDULE_WHEN_TASKS_FIT");
  }

  return errors.length ? { ok: false, errors: [...new Set(errors)] } : { ok: true };
}

/**
 * 无 AI 时的确定性降级生成器。它不是主排程智能，只用来保证模型不可用时流程不中断。
 */
export function solveSchedule(input: ScheduleGenerationInput, preferredTaskOrder: string[] = []): ScheduleDraft {
  const { tasks, settings, fixedEvents = [], nowMs } = input;
  const dayStart = hm(nowMs, settings.workStart);
  const lunchStart = hm(nowMs, settings.lunchStart);
  const lunchEnd = hm(nowMs, settings.lunchEnd);
  const dayEnd = hm(nowMs, settings.workEnd);
  const blocks: ScheduleBlock[] = [];
  const warnings: string[] = [];
  const unscheduled: ScheduleDraft["unscheduled"] = [];
  let seq = 0;
  const push = (block: Omit<ScheduleBlock, "blockId" | "sequence">) =>
    blocks.push({ ...block, blockId: randomUUID(), sequence: ++seq });

  push({ type: "BREAK", startAt: lunchStart, endAt: lunchEnd, lockedByUser: false });
  const busy = [
    { start: lunchStart, end: lunchEnd },
    ...fixedEvents.map((event) => ({ start: event.startAt, end: event.endAt })),
  ];
  for (const event of fixedEvents) {
    push({
      type: event.type === "MEETING" ? "MEETING" : "BREAK",
      startAt: event.startAt,
      endAt: event.endAt,
      lockedByUser: true,
    });
  }

  let slots = [{ start: Math.max(nowMs, dayStart), end: dayEnd }];
  for (const item of busy.sort((a, b) => a.start - b.start)) {
    slots = slots.flatMap((slot) => {
      if (item.end <= slot.start || item.start >= slot.end) return [slot];
      const output: Array<{ start: number; end: number }> = [];
      if (item.start > slot.start) output.push({ start: slot.start, end: item.start });
      if (item.end < slot.end) output.push({ start: item.end, end: slot.end });
      return output;
    });
  }

  const preferredRank = new Map(preferredTaskOrder.map((taskId, index) => [taskId, index]));
  const candidates = eligibleTasks(tasks).sort((a, b) => {
    const preferredA = preferredRank.get(a.id);
    const preferredB = preferredRank.get(b.id);
    if (preferredA !== undefined || preferredB !== undefined) {
      if (preferredA === undefined) return 1;
      if (preferredB === undefined) return -1;
      if (preferredA !== preferredB) return preferredA - preferredB;
    }
    const missA = a.estimatedDurationMs && a.dueAt - nowMs < a.estimatedDurationMs ? 1 : 0;
    const missB = b.estimatedDurationMs && b.dueAt - nowMs < b.estimatedDurationMs ? 1 : 0;
    if (missA !== missB) return missB - missA;
    if (IMPORTANCE_RANK[a.importance] !== IMPORTANCE_RANK[b.importance]) return IMPORTANCE_RANK[b.importance] - IMPORTANCE_RANK[a.importance];
    if (URGENCY_RANK[a.urgency] !== URGENCY_RANK[b.urgency]) return URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency];
    if (a.dueAt !== b.dueAt) return a.dueAt - b.dueAt;
    return a.id.localeCompare(b.id);
  });

  const scheduledByTask = new Map<string, number>();
  let continuousWork = 0;
  let lastWorkEnd: number | undefined;

  for (const task of candidates) {
    if (!task.estimatedDurationMs) {
      unscheduled.push({ taskId: task.id, reasonCode: "MISSING_ESTIMATE", neededMs: 0 });
      continue;
    }
    let remaining = task.estimatedDurationMs;
    const splittable = task.splittability === "SPLITTABLE";

    for (let index = 0; index < slots.length && remaining > 0; index++) {
      const slot = slots[index];
      if (lastWorkEnd !== undefined && slot.start > lastWorkEnd) continuousWork = 0;
      const availableEnd = Math.min(slot.end, task.dueAt);
      let capacity = availableEnd - slot.start;
      if (capacity <= 0) continue;

      if (continuousWork >= FOCUS_BLOCK_MS && capacity > BUFFER_MS) {
        push({ type: "BUFFER", startAt: slot.start, endAt: slot.start + BUFFER_MS, lockedByUser: false });
        slot.start += BUFFER_MS;
        continuousWork = 0;
        capacity -= BUFFER_MS;
      }

      const focusCapacity = splittable ? Math.max(0, FOCUS_BLOCK_MS - continuousWork) : capacity;
      const take = splittable ? Math.min(remaining, capacity, focusCapacity || capacity) : (capacity >= remaining ? remaining : 0);
      if (take < Math.min(remaining, splittable ? MIN_SPLIT_BLOCK_MS : remaining)) continue;

      push({ type: "TASK", taskId: task.id, startAt: slot.start, endAt: slot.start + take, lockedByUser: false });
      slot.start += take;
      remaining -= take;
      continuousWork += take;
      lastWorkEnd = slot.start;
      scheduledByTask.set(task.id, (scheduledByTask.get(task.id) ?? 0) + take);
      index--;
    }

    if (remaining > 0) {
      const reason: UnscheduledReason = task.dueAt < dayEnd ? "DEADLINE_CONFLICT" : "NO_CAPACITY";
      unscheduled.push({ taskId: task.id, reasonCode: reason, neededMs: remaining });
    }
  }

  if (unscheduled.length) warnings.push("CAPACITY_OR_DEADLINE_INSUFFICIENT_NO_COMPRESSION");
  return buildDraft(input, blocks, unscheduled, warnings, scheduledByTask);
}

function finalizeProposal(input: ScheduleGenerationInput, proposal: ScheduleProposal): ScheduleDraft {
  const lunchStart = hm(input.nowMs, input.settings.lunchStart);
  const lunchEnd = hm(input.nowMs, input.settings.lunchEnd);
  const blocks: ScheduleBlock[] = [
    ...proposal.blocks,
    {
      blockId: randomUUID(),
      type: "BREAK",
      startAt: lunchStart,
      endAt: lunchEnd,
      sequence: 0,
      lockedByUser: false,
    },
    ...(input.fixedEvents ?? []).map((event) => ({
      blockId: event.id,
      type: event.type === "MEETING" ? "MEETING" as const : "BREAK" as const,
      startAt: event.startAt,
      endAt: event.endAt,
      sequence: 0,
      lockedByUser: true,
    })),
  ];
  const scheduledByTask = new Map<string, number>();
  for (const block of blocks) {
    if (block.type === "TASK" && block.taskId) {
      scheduledByTask.set(block.taskId, (scheduledByTask.get(block.taskId) ?? 0) + block.endAt - block.startAt);
    }
  }
  const unscheduled: ScheduleDraft["unscheduled"] = [];
  for (const task of eligibleTasks(input.tasks)) {
    if (!task.estimatedDurationMs) {
      unscheduled.push({ taskId: task.id, reasonCode: "MISSING_ESTIMATE", neededMs: 0 });
      continue;
    }
    const scheduled = scheduledByTask.get(task.id) ?? 0;
    if (scheduled < task.estimatedDurationMs) {
      unscheduled.push({ taskId: task.id, reasonCode: task.dueAt < hm(input.nowMs, input.settings.workEnd) ? "DEADLINE_CONFLICT" : "NO_CAPACITY", neededMs: task.estimatedDurationMs - scheduled });
    }
  }
  return buildDraft(input, blocks, unscheduled, [], scheduledByTask);
}

function buildDraft(
  input: ScheduleGenerationInput,
  blocks: ScheduleBlock[],
  unscheduled: ScheduleDraft["unscheduled"],
  warnings: string[],
  scheduledByTask: Map<string, number>,
): ScheduleDraft {
  const tasks = eligibleTasks(input.tasks);
  const taskResults = tasks.map((task) => {
    const requiredMs = task.estimatedDurationMs ?? 0;
    const scheduledMs = scheduledByTask.get(task.id) ?? 0;
    const result = requiredMs > 0 && scheduledMs === requiredMs
      ? "FULLY_SCHEDULED" as const
      : scheduledMs > 0
        ? "PARTIALLY_SCHEDULED" as const
        : "UNSCHEDULED" as const;
    return { taskId: task.id, result, scheduledMs, requiredMs };
  });
  const sorted = [...blocks].sort((a, b) => a.startAt - b.startAt).map((block, index) => ({ ...block, sequence: index + 1 }));
  const taskBlocks = sorted.filter((block) => block.type === "TASK");

  return {
    draftId: randomUUID(),
    workdayDate: new Date(input.nowMs).toISOString().slice(0, 10),
    blocks: sorted,
    unscheduled,
    warnings,
    taskResults,
    // 只有完整排入日程的任务，才可建议给用户作为“今日必做”承诺。
    commitmentCandidateTaskIds: taskResults.filter((item) => item.result === "FULLY_SCHEDULED").map((item) => item.taskId),
    projectedFinishAt: taskBlocks.length ? Math.max(...taskBlocks.map((block) => block.endAt)) : undefined,
    policyVersion: SCHEDULE_POLICY_VERSION,
  };
}

function overlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB;
}
