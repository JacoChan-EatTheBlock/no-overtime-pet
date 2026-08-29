import { randomUUID } from "node:crypto";
import type { Task, UserTaskInput, TaskStatus } from "./types.js";
import { computeUrgency } from "./urgency.js";

/**
 * 内存任务库：演示 revision 乐观锁、幂等完成、软删除。
 * 正式版由服务端 PostgreSQL 承担，接口语义保持一致（PRD 13 §4）。
 */
export class TaskStore {
  private tasks = new Map<string, Task>();
  private completeRequests = new Map<string, { taskId: string; payloadHash: string; result: Task }>();

  create(input: UserTaskInput, nowMs = Date.now()): Task {
    if (!input.title.trim() || input.title.length > 120) {
      throw new Error("TASK_TITLE_INVALID");
    }
    if (!Number.isFinite(input.dueAt)) throw new Error("TASK_DUE_AT_INVALID");
    const task: Task = {
      ...input,
      id: randomUUID(),
      revision: 1,
      status: "BACKLOG",
      urgency: computeUrgency(nowMs, input.dueAt), // DDL 过去 → OVERDUE，允许创建（PRD 04 §9）
      fieldOrigins: { title: "USER", dueAt: "USER", importance: "USER" },
    };
    this.tasks.set(task.id, task);
    return cloneTask(task);
  }

  get(id: string): Task {
    const t = this.tasks.get(id);
    if (!t || t.deleted) throw new Error("TASK_NOT_FOUND");
    return cloneTask(t);
  }

  list(): Task[] {
    return [...this.tasks.values()].filter((t) => !t.deleted).map(cloneTask);
  }

  /** PATCH + If-Match：版本不符返回冲突，不覆盖（PRD 04 §9） */
  patch(id: string, ifMatchRevision: number, changes: Partial<Task>): Task {
    const t = this.get(id);
    if (t.revision !== ifMatchRevision) throw new Error("TASK_REVISION_CONFLICT");
    const next = { ...t, ...changes, revision: t.revision + 1 };
    this.tasks.set(id, next);
    return cloneTask(next);
  }

  /** 幂等完成：同 key 重放返回原结果，不重复写事件 */
  complete(id: string, idempotencyKey: string, opts: {
    completedAt?: number;
    actualDurationMs?: number;
    actualDurationSource?: Task["actualDurationSource"];
  } = {}): Task {
    if (!idempotencyKey.trim()) throw new Error("IDEMPOTENCY_KEY_INVALID");
    const payloadHash = JSON.stringify({
      completedAt: opts.completedAt ?? null,
      actualDurationMs: opts.actualDurationMs ?? null,
      actualDurationSource: opts.actualDurationSource ?? "USER_CONFIRMED",
    });
    const previous = this.completeRequests.get(idempotencyKey);
    if (previous) {
      if (previous.taskId !== id || previous.payloadHash !== payloadHash) {
        throw new Error("IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD");
      }
      return cloneTask(previous.result);
    }

    const t = this.get(id);
    const result = t.status === "COMPLETED" ? t : this.patch(id, t.revision, {
      status: "COMPLETED" satisfies TaskStatus,
      completedAt: opts.completedAt ?? Date.now(),
      actualDurationMs: opts.actualDurationMs,
      actualDurationSource: opts.actualDurationSource ?? "USER_CONFIRMED",
    });
    this.rollUpParentIfComplete(result, opts.completedAt ?? Date.now());
    this.completeRequests.set(idempotencyKey, { taskId: id, payloadHash, result: cloneTask(result) });
    return result;
  }

  /** 软删除；已进承诺快照的任务由上层禁止物理删除 */
  softDelete(id: string): void {
    const t = this.get(id);
    this.tasks.set(id, { ...t, deleted: true, revision: t.revision + 1 });
  }

  /**
   * 撤销完成（PRD 04 §5：COMPLETED → IN_PROGRESS）。非完成状态调用天然幂等、不报错。
   * 若该任务因“子任务全部完成”而被自动回填为完成的父任务，撤销后父任务的完成条件
   * 不再成立，一并撤销，避免父任务永远卡在“已完成”。
   */
  reopen(id: string): Task {
    const t = this.get(id);
    if (t.status !== "COMPLETED") return t;
    const reopened = this.patch(id, t.revision, {
      status: "IN_PROGRESS" satisfies TaskStatus,
      completedAt: undefined,
      actualDurationMs: undefined,
      actualDurationSource: undefined,
    });
    this.rollBackParentIfReopened(reopened);
    return reopened;
  }

  refreshUrgency(nowMs = Date.now()): void {
    for (const t of this.list()) {
      const u = computeUrgency(nowMs, t.dueAt, t.estimatedDurationMs);
      if (u !== t.urgency) this.tasks.set(t.id, { ...t, urgency: u });
    }
  }

  private rollUpParentIfComplete(task: Task, completedAt: number): void {
    if (!task.parentTaskId) return;
    const parent = this.tasks.get(task.parentTaskId);
    if (!parent || parent.schedulingMode !== "CHILDREN") return;
    const children = [...this.tasks.values()].filter((item) => item.parentTaskId === parent.id && !item.deleted);
    if (children.length > 0 && children.every((item) => item.status === "COMPLETED")) {
      this.tasks.set(parent.id, {
        ...parent,
        status: "COMPLETED",
        completedAt,
        revision: parent.revision + 1,
      });
    }
  }

  private rollBackParentIfReopened(task: Task): void {
    if (!task.parentTaskId) return;
    const parent = this.tasks.get(task.parentTaskId);
    if (!parent || parent.schedulingMode !== "CHILDREN" || parent.status !== "COMPLETED") return;
    this.tasks.set(parent.id, {
      ...parent,
      status: "IN_PROGRESS",
      completedAt: undefined,
      revision: parent.revision + 1,
    });
  }
}

function cloneTask(task: Task): Task {
  return { ...task, fieldOrigins: { ...task.fieldOrigins } };
}
