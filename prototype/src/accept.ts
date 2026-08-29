import type { Task, TaskAnalysisProposal, ProposalField } from "./types.js";
import { COGNITIVE_LOADS, PROPOSAL_FIELDS, SPLITTABILITIES, TASK_CATEGORIES } from "./types.js";
import type { TaskStore } from "./store.js";
import { DURATION_MAX_MS, DURATION_MIN_MS, validateProposal } from "./validator.js";
import { taskInputHash } from "./proposal.js";

/**
 * “确认建议”装配器（PRD 05 §3 / 13 §5.2）：
 * 只有用户点确认后，接受/修改过的字段才写入正式 Task；
 * overrides 视为 USER 来源，此后再分析不得覆盖（store 层由 fieldOrigins 保护）。
 */
export interface AcceptRequest {
  acceptedFields: ProposalField[];
  overrides?: Partial<Record<ProposalField, unknown>>;
  acceptedSubtaskOrders?: number[]; // 采用哪些建议子任务
}

export function applyProposal(
  store: TaskStore,
  task: Task,
  proposal: TaskAnalysisProposal,
  req: AcceptRequest,
): { task: Task; createdSubtasks: Task[] } {
  if (proposal.taskId !== task.id) throw new Error("PROPOSAL_TASK_MISMATCH");
  if (proposal.taskRevision !== task.revision) throw new Error("PROPOSAL_TASK_REVISION_STALE");
  if (proposal.inputHash !== taskInputHash(task)) throw new Error("PROPOSAL_INPUT_STALE");
  const proposalCheck = validateProposal(proposal);
  if (!proposalCheck.ok) throw new Error(`PROPOSAL_INVALID:${proposalCheck.errors.join(",")}`);

  const accepted = new Set(req.acceptedFields);
  for (const field of Object.keys(req.overrides ?? {})) {
    if (!PROPOSAL_FIELDS.includes(field as ProposalField)) throw new Error(`FIELD_NOT_ACCEPTABLE:${field}`);
    if (!accepted.has(field as ProposalField)) throw new Error(`OVERRIDE_FIELD_NOT_ACCEPTED:${field}`);
  }

  const changes: Partial<Task> = { analysisProposalId: proposal.proposalId };
  const origins = { ...task.fieldOrigins };

  for (const field of req.acceptedFields) {
    if (!PROPOSAL_FIELDS.includes(field)) throw new Error(`FIELD_NOT_ACCEPTABLE:${field}`);
    // 已是 USER 来源的字段，AI 不得静默覆盖（PRD 04 §6）——除非本次 override 也来自用户
    const hasOverride = req.overrides && field in req.overrides;
    if (origins[field] === "USER" && !hasOverride) continue;
    const value = hasOverride ? req.overrides![field] : proposal[field];
    validateAcceptedValue(field, value);
    (changes as Record<string, unknown>)[field] = value;
    origins[field] = hasOverride ? "USER" : "AI_ACCEPTED";
  }
  changes.fieldOrigins = origins;

  const acceptedSubtaskOrders = new Set(req.acceptedSubtaskOrders ?? []);
  if (acceptedSubtaskOrders.size) {
    const validOrders = new Set((proposal.suggestedSubtasks ?? []).map((st) => st.order));
    for (const order of acceptedSubtaskOrders) {
      if (!validOrders.has(order)) throw new Error(`SUBTASK_ORDER_INVALID:${order}`);
    }
    // 确认拆分后，父任务只作汇总容器，子任务替代它参与排程。
    changes.schedulingMode = "CHILDREN";
  }

  const updated = store.patch(task.id, task.revision, changes);

  const createdSubtasks: Task[] = [];
  if (acceptedSubtaskOrders.size && proposal.suggestedSubtasks) {
    for (const st of proposal.suggestedSubtasks) {
      if (!acceptedSubtaskOrders.has(st.order)) continue;
      const sub = store.create({ title: st.title, dueAt: task.dueAt, importance: task.importance });
      createdSubtasks.push(
        store.patch(sub.id, sub.revision, {
          parentTaskId: task.id,
          estimatedDurationMs: st.estimatedDurationMs,
          fieldOrigins: { ...sub.fieldOrigins, estimatedDurationMs: "AI_ACCEPTED" },
        }),
      );
    }
  }
  return { task: updated, createdSubtasks };
}

function validateAcceptedValue(field: ProposalField, value: unknown): void {
  if (field === "category" && !TASK_CATEGORIES.includes(value as never)) {
    throw new Error("TASK_CATEGORY_INVALID");
  }
  if (field === "estimatedDurationMs" && (
    typeof value !== "number" || !Number.isFinite(value) || value < DURATION_MIN_MS || value > DURATION_MAX_MS
  )) {
    throw new Error("TASK_DURATION_INVALID");
  }
  if (field === "cognitiveLoad" && !COGNITIVE_LOADS.includes(value as never)) {
    throw new Error("TASK_COGNITIVE_LOAD_INVALID");
  }
  if (field === "splittability" && !SPLITTABILITIES.includes(value as never)) {
    throw new Error("TASK_SPLITTABILITY_INVALID");
  }
}
