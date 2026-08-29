// 最小契约类型 —— 与 docs/prd/01-shared-contracts.md 同名同语义的子集。
// 原型阶段先内联；接入正式 monorepo 时替换为 @not/contracts。

export type Importance = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type Urgency = "NOT_URGENT" | "UPCOMING" | "URGENT" | "OVERDUE";
export type TaskStatus = "BACKLOG" | "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type TaskCategory =
  | "WRITING" | "CODING" | "DESIGN" | "RESEARCH"
  | "COMMUNICATION" | "MEETING" | "ADMIN" | "REVIEW"
  | "LEARNING" | "OTHER";
export type CognitiveLoad = "LOW" | "MEDIUM" | "HIGH";
export type Splittability = "ATOMIC" | "SPLITTABLE" | "REQUIRES_REVIEW";
export type FieldOrigin = "USER" | "AI_ACCEPTED" | "SYSTEM_DERIVED";

export const TASK_CATEGORIES: readonly TaskCategory[] = [
  "WRITING", "CODING", "DESIGN", "RESEARCH", "COMMUNICATION",
  "MEETING", "ADMIN", "REVIEW", "LEARNING", "OTHER",
];
export const COGNITIVE_LOADS: readonly CognitiveLoad[] = ["LOW", "MEDIUM", "HIGH"];
export const SPLITTABILITIES: readonly Splittability[] = ["ATOMIC", "SPLITTABLE", "REQUIRES_REVIEW"];

/** 用户只填这三个字段（PRD 04 §2） */
export interface UserTaskInput {
  title: string;
  dueAt: number;              // epoch ms（原型用数值时间，正式版用 RFC3339）
  importance: Importance;
}

export interface Task extends UserTaskInput {
  id: string;
  revision: number;
  status: TaskStatus;
  urgency: Urgency;           // 派生缓存，可重算
  category?: TaskCategory;
  estimatedDurationMs?: number;
  cognitiveLoad?: CognitiveLoad;
  splittability?: Splittability;
  fieldOrigins: Record<string, FieldOrigin>;
  analysisProposalId?: string;
  completedAt?: number;
  actualDurationMs?: number;
  actualDurationSource?: "EXPLICIT_TIMER" | "USER_CONFIRMED" | "SYSTEM_INFERRED";
  parentTaskId?: string;
  /** DIRECT 任务自身参与排程；CHILDREN 表示父任务仅作汇总容器，由子任务替代排程。 */
  schedulingMode?: "DIRECT" | "CHILDREN";
  deleted?: boolean;
}

export interface SuggestedSubtask {
  title: string;
  estimatedDurationMs: number;
  order: number;
}

export interface TaskAnalysisProposal {
  proposalId: string;
  taskId: string;
  taskRevision: number;
  inputHash: string;
  createdAt: number;
  category: TaskCategory;
  estimatedDurationMs: number;
  estimateRangeMs: { low: number; high: number };
  cognitiveLoad: CognitiveLoad;
  splittability: Splittability;
  suggestedSubtasks?: SuggestedSubtask[];
  confidence: number;         // 0–1
  rationaleCodes: string[];
  warnings: string[];
  policyVersion: string;
  modelVersion: string;       // "baseline" 表示确定性降级
}

/** AI 可建议、accept 时可写入的字段白名单（用户三字段永不在内） */
export const PROPOSAL_FIELDS = ["category", "estimatedDurationMs", "cognitiveLoad", "splittability"] as const;
export type ProposalField = (typeof PROPOSAL_FIELDS)[number];

export interface WorkSettings {
  workStart: string;  // "HH:mm" 当地时间
  lunchStart: string;
  lunchEnd: string;
  workEnd: string;
}

export interface FixedEvent {
  id: string;
  titleSafe: string;
  startAt: number;
  endAt: number;
  type: "MEETING" | "BREAK" | "PERSONAL";
}

export interface ScheduleBlock {
  blockId: string;
  taskId?: string;
  type: "TASK" | "MEETING" | "BREAK" | "BUFFER";
  startAt: number;
  endAt: number;
  sequence: number;
  lockedByUser: boolean;
}

export type UnscheduledReason = "NO_CAPACITY" | "DEADLINE_CONFLICT" | "LOCK_CONFLICT" | "MISSING_ESTIMATE";

export interface ScheduleDraft {
  draftId: string;
  workdayDate: string;
  blocks: ScheduleBlock[];
  unscheduled: Array<{ taskId: string; reasonCode: UnscheduledReason; neededMs: number }>;
  warnings: string[];
  taskResults: Array<{
    taskId: string;
    result: "FULLY_SCHEDULED" | "PARTIALLY_SCHEDULED" | "UNSCHEDULED";
    scheduledMs: number;
    requiredMs: number;
  }>;
  commitmentCandidateTaskIds: string[];
  projectedFinishAt?: number;  // 末个任务块结束时间
  policyVersion: string;
}

/** AI 排程 Provider 可返回的原始草案；正式 Draft 必须经过硬约束校验。 */
export interface ScheduleProposal {
  proposalId: string;
  blocks: ScheduleBlock[];
  modelVersion: string;
}
