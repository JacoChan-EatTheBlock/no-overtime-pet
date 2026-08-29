/**
 * 契约适配层：把 prototype 逻辑层的枚举/毫秒，翻译成像素 UI 直接渲染的中文和分钟。
 *
 * 单向依赖：UI 只认这里导出的 Ui* 视图模型，不 import 逻辑层类型；
 * 逻辑层完全不知道 UI 的存在。换后端时只改这一个文件。
 */
import type {
  CognitiveLoad,
  Importance,
  ScheduleBlock,
  ScheduleDraft,
  Splittability,
  Task,
  TaskAnalysisProposal,
  TaskCategory,
  Urgency
} from '../../src/types.js'

const MIN = 60_000

// ─── 视图模型 ──────────────────────────────────────────────

export type UiUrgency = 'urgent' | 'upcoming' | 'normal' | 'overdue'
export type UiBlockKind = 'task' | 'break' | 'meeting' | 'buffer'

export interface UiTask {
  id: string
  title: string
  time: string
  urgency: UiUrgency
  urgencyLabel: string
  completed: boolean
  dueAt: number
  importance: Importance
  /** 分钟；尚未确认 AI 建议、没有估计时长时为 null（此时不渲染时长调整控件）。 */
  durationMinutes: number | null
}

export interface UiScheduleBlock {
  id: string
  taskId?: string
  title: string
  time: string
  kind: UiBlockKind
  locked: boolean
  durationMinutes: number
  startAt: number
  endAt: number
}

export interface UiSubtask {
  id: string
  order: number
  title: string
  durationMinutes: number
}

export interface UiProposal {
  proposalId: string
  taskId: string
  taskTitle: string
  category: string
  categoryCode: TaskCategory
  durationMinutes: number
  durationRange: string
  cognitiveLoad: string
  cognitiveLoadCode: CognitiveLoad
  splittability: string
  splittabilityCode: Splittability
  confidence: string
  confidenceValue: number
  subtasks: UiSubtask[]
  source: 'AI' | 'BASELINE'
  fallbackReason?: string
  modelVersion: string
  rationale: string
  warnings: string[]
}

export interface UiUnscheduled {
  taskId: string
  title: string
  reason: string
  neededMinutes: number
}

// ─── 枚举字典 ──────────────────────────────────────────────

export const CATEGORY_LABEL: Record<TaskCategory, string> = {
  WRITING: '文档撰写',
  CODING: '开发编码',
  DESIGN: '设计',
  RESEARCH: '调研分析',
  COMMUNICATION: '沟通协作',
  MEETING: '会议',
  ADMIN: '事务处理',
  REVIEW: '评审校对',
  LEARNING: '学习',
  OTHER: '其他'
}

export const COGNITIVE_LOAD_LABEL: Record<CognitiveLoad, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高'
}

export const SPLITTABILITY_LABEL: Record<Splittability, string> = {
  ATOMIC: '不可拆分',
  SPLITTABLE: '可拆分',
  REQUIRES_REVIEW: '需确认'
}

export const IMPORTANCE_LABEL: Record<Importance, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  CRITICAL: '最高'
}

const URGENCY_VIEW: Record<Urgency, { kind: UiUrgency; label: string }> = {
  OVERDUE: { kind: 'overdue', label: '已逾期' },
  URGENT: { kind: 'urgent', label: '紧急' },
  UPCOMING: { kind: 'upcoming', label: '即将到期' },
  NOT_URGENT: { kind: 'normal', label: '不紧急' }
}

const BLOCK_KIND: Record<ScheduleBlock['type'], UiBlockKind> = {
  TASK: 'task',
  BREAK: 'break',
  MEETING: 'meeting',
  BUFFER: 'buffer'
}

const BLOCK_FALLBACK_TITLE: Record<UiBlockKind, string> = {
  task: '未命名任务',
  break: '午休',
  meeting: '会议',
  buffer: '缓冲'
}

const UNSCHEDULED_REASON: Record<string, string> = {
  NO_CAPACITY: '今日容量不足',
  DEADLINE_CONFLICT: 'DDL 早于可排完时间',
  LOCK_CONFLICT: '与锁定块冲突',
  MISSING_ESTIMATE: '缺少时长估计'
}

/** 逻辑层 warning code → 用户可读文案。未知 code 原样透出，不吞掉。 */
const WARNING_LABEL: Record<string, string> = {
  CAPACITY_OR_DEADLINE_INSUFFICIENT_NO_COMPRESSION: '今日容量不足，不会偷偷压缩时长。',
  BASELINE_ONLY_LOW_CONFIDENCE: '样本不足，本次为确定性基线估计。'
}

// ─── 格式化 ────────────────────────────────────────────────

export const toMinutes = (ms: number): number => Math.round(ms / MIN)
export const toMs = (minutes: number): number => minutes * MIN

export function clockTime(epochMs: number): string {
  return new Date(epochMs).toTimeString().slice(0, 5)
}

export function timeRange(startAt: number, endAt: number, separator = '–'): string {
  return `${clockTime(startAt)}${separator}${clockTime(endAt)}`
}

export function dateLabel(epochMs: number): string {
  const date = new Date(epochMs)
  const weekday = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getDay()]
  return `${date.getMonth() + 1}月${date.getDate()}日 · ${weekday}`
}

export function shortDateLabel(epochMs: number): string {
  const date = new Date(epochMs)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

export function dueAtLabel(epochMs: number): string {
  return `${shortDateLabel(epochMs)} ${clockTime(epochMs)}`
}

/**
 * epoch ms ↔ `<input type="datetime-local">` 的值（本地时区，"YYYY-MM-DDTHH:mm"）。
 * 该格式不带时区标记时，浏览器按本地时间解析/序列化，往返不需要自己转 UTC。
 */
export function toDatetimeLocalValue(epochMs: number): string {
  const date = new Date(epochMs)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 留空或浏览器给出非法值时返回 undefined，由调用方决定怎么提示。 */
export function fromDatetimeLocalValue(value: string): number | undefined {
  if (!value) return undefined
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : undefined
}

export function confidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return '高'
  if (confidence >= 0.5) return '中'
  return '低'
}

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}小时${rest}分` : `${hours}小时`
}

export function warningLabel(code: string): string {
  return WARNING_LABEL[code] ?? code
}

// ─── 逻辑层 → 视图模型 ─────────────────────────────────────

export function toUiTask(task: Task, draft?: ScheduleDraft): UiTask {
  const view = URGENCY_VIEW[task.urgency]
  const blocks = (draft?.blocks ?? []).filter((block) => block.taskId === task.id)
  const time = blocks.length
    ? timeRange(Math.min(...blocks.map((b) => b.startAt)), Math.max(...blocks.map((b) => b.endAt)), ' – ')
    : task.estimatedDurationMs
      ? `预计 ${durationLabel(toMinutes(task.estimatedDurationMs))}`
      : '待 AI 建议确认'

  return {
    id: task.id,
    title: task.title,
    time,
    urgency: view.kind,
    urgencyLabel: view.label,
    completed: task.status === 'COMPLETED',
    dueAt: task.dueAt,
    importance: task.importance,
    durationMinutes: task.estimatedDurationMs ? toMinutes(task.estimatedDurationMs) : null
  }
}

export function toUiBlock(block: ScheduleBlock, taskTitles: Map<string, string>): UiScheduleBlock {
  const kind = BLOCK_KIND[block.type]
  return {
    id: block.blockId,
    taskId: block.taskId,
    title: (block.taskId ? taskTitles.get(block.taskId) : undefined) ?? BLOCK_FALLBACK_TITLE[kind],
    time: timeRange(block.startAt, block.endAt),
    kind,
    locked: block.lockedByUser || kind !== 'task',
    durationMinutes: toMinutes(block.endAt - block.startAt),
    startAt: block.startAt,
    endAt: block.endAt
  }
}

export function toUiProposal(
  proposal: TaskAnalysisProposal,
  taskTitle: string,
  source: 'AI' | 'BASELINE',
  fallbackReason?: string
): UiProposal {
  const durationMinutes = toMinutes(proposal.estimatedDurationMs)
  return {
    proposalId: proposal.proposalId,
    taskId: proposal.taskId,
    taskTitle,
    category: CATEGORY_LABEL[proposal.category],
    categoryCode: proposal.category,
    durationMinutes,
    durationRange: `${toMinutes(proposal.estimateRangeMs.low)}–${toMinutes(proposal.estimateRangeMs.high)}分钟`,
    cognitiveLoad: COGNITIVE_LOAD_LABEL[proposal.cognitiveLoad],
    cognitiveLoadCode: proposal.cognitiveLoad,
    splittability: SPLITTABILITY_LABEL[proposal.splittability],
    splittabilityCode: proposal.splittability,
    confidence: confidenceLabel(proposal.confidence),
    confidenceValue: proposal.confidence,
    subtasks: (proposal.suggestedSubtasks ?? []).map((subtask) => ({
      id: `subtask-${subtask.order}`,
      order: subtask.order,
      title: subtask.title,
      durationMinutes: toMinutes(subtask.estimatedDurationMs)
    })),
    source,
    fallbackReason,
    modelVersion: proposal.modelVersion,
    rationale: rationaleSentence(proposal.rationaleCodes, source),
    warnings: proposal.warnings.map(warningLabel)
  }
}

/** rationaleCodes 是机器码，转成 06 屏那句人话。 */
function rationaleSentence(codes: string[], source: 'AI' | 'BASELINE'): string {
  const multiplier = codes
    .find((code) => code.startsWith('PERSONAL_MULTIPLIER_APPLIED:'))
    ?.split(':')

  const parts: string[] = [source === 'AI' ? '模型给出客观估计' : '模型不可用，使用类别目录基线']
  if (multiplier) {
    const value = Number(multiplier[1])
    const samples = multiplier[2]
    const delta = Math.round(Math.abs(1 - value) * 100)
    parts.push(
      `参考了 ${samples} 个历史样本；你的实际速度比基线${value < 1 ? '快' : '慢'}约 ${delta}%`
    )
  } else if (codes.includes('INSUFFICIENT_HISTORY')) {
    parts.push('历史样本不足 5 个，尚未启用个人速度校准')
  }
  return `${parts.join('；')}。`
}

export function toUiUnscheduled(draft: ScheduleDraft, taskTitles: Map<string, string>): UiUnscheduled[] {
  return draft.unscheduled.map((item) => ({
    taskId: item.taskId,
    title: taskTitles.get(item.taskId) ?? '未命名任务',
    reason: UNSCHEDULED_REASON[item.reasonCode] ?? item.reasonCode,
    neededMinutes: toMinutes(item.neededMs)
  }))
}
