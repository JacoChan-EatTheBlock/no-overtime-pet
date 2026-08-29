/**
 * 把 prototype 逻辑层装配成像素 UI 的数据源。
 *
 * 职责边界：
 * - 浏览器本地跑 TaskStore / applyProposal / solveSchedule / computeUrgency —— 逻辑层源码零改动，
 *   node:crypto 由 vite alias 指向 web/shims。
 * - AI 调用走 web-server 的 /api/task-analysis 和 /api/schedule，Key 只留在 Node 侧。
 * - 任何 AI 失败都由逻辑层自己降级到确定性基线，这里只负责把 source/fallbackReason 透出给 UI。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TaskStore } from '@domain/store.js'
import { applyProposal, type AcceptRequest } from '@domain/accept.js'
import { baselineProposal } from '@domain/baseline.js'
import { reorderScheduleBlocks, solveSchedule } from '@domain/scheduler.js'
import { personalMultiplier, type CalibrationSample } from '@domain/calibration.js'
import type {
  Importance,
  ProposalField,
  ScheduleDraft,
  Task,
  TaskAnalysisProposal,
  UserTaskInput,
  WorkSettings
} from '@domain/types.js'
import {
  clockTime,
  dateLabel,
  durationLabel,
  timeRange,
  toMinutes,
  toMs,
  toUiBlock,
  toUiProposal,
  toUiTask,
  toUiUnscheduled,
  warningLabel,
  type UiProposal,
  type UiScheduleBlock,
  type UiTask,
  type UiUnscheduled
} from './mapping.js'
import { DEMO_DAILY_SALARY_MINOR, accrue, formatMoney } from './nang-fee.js'

const MIN = 60_000

export type Screen =
  | '01-task-bubble'
  | '05-task-list'
  | '06-ai-analysis'
  | '07-schedule-draft'
  | '12-clockout-confirm'
  | '13-clockout-success'

export type ClockoutOutcome = 'WIN' | 'TASKS_INCOMPLETE'

export const WORK_SETTINGS: WorkSettings = {
  workStart: '09:00',
  lunchStart: '12:00',
  lunchEnd: '13:00',
  workEnd: '18:00'
}

/**
 * 演示历史：这位用户写文档比目录基线快（与 src/demo.ts 同一组样本）。
 * 满足 5 个高置信样本门槛，所以 06 屏会显示"已启用个人速度校准"。
 */
const DEMO_HISTORY: CalibrationSample[] = [
  { category: 'WRITING', estimatedMs: 60 * MIN, actualMs: 45 * MIN, source: 'EXPLICIT_TIMER' },
  { category: 'WRITING', estimatedMs: 90 * MIN, actualMs: 70 * MIN, source: 'USER_CONFIRMED' },
  { category: 'WRITING', estimatedMs: 60 * MIN, actualMs: 50 * MIN, source: 'EXPLICIT_TIMER' },
  { category: 'WRITING', estimatedMs: 120 * MIN, actualMs: 90 * MIN, source: 'EXPLICIT_TIMER' },
  { category: 'WRITING', estimatedMs: 45 * MIN, actualMs: 38 * MIN, source: 'USER_CONFIRMED' }
]

/**
 * 种子任务。dueIn 是相对演示时钟（09:30）的小时偏移，刻意覆盖四档紧急度：
 * +2h → URGENT、当天 → UPCOMING、+4 天 → NOT_URGENT、昨天 → OVERDUE。
 * 紧急度不是写死的标签，由 computeUrgency 按 DDL 和估计时长真实算出来。
 */
const SEED_TASKS: Array<{ title: string; dueIn: number; importance: Importance }> = [
  { title: '整理产品评审材料', dueIn: 2, importance: 'HIGH' },
  { title: '回复客户邮件', dueIn: 5.5, importance: 'LOW' },
  { title: '撰写需求文档', dueIn: 8.5, importance: 'MEDIUM' },
  { title: '开发与自测', dueIn: 8.5, importance: 'HIGH' },
  { title: '准备周一例会', dueIn: 4 * 24, importance: 'LOW' },
  { title: '提交上月报销', dueIn: -18, importance: 'MEDIUM' }
]

function atHour(referenceMs: number, hour: number, minute = 0): number {
  const date = new Date(referenceMs)
  date.setHours(hour, minute, 0, 0)
  return date.getTime()
}

/**
 * 演示时钟固定为当天 09:30 —— 与 src/demo.ts 同一约定。
 * 用真实时间会让"今日容量"随打开时刻变化：下午打开就只排得下两三个任务，
 * 演示和视觉 QA 都不可复现。日期仍取今天，所以 DDL 和紧急度是真实计算的。
 */
function demoNow(): number {
  return atHour(Date.now(), 9, 30)
}

/**
 * 按用户手动调整过的顺序排列；order 中未出现的任务保持原有相对顺序排在后面。
 * 与 scheduler.ts::solveSchedule 对 preferredTaskOrder 的排序语义保持一致，
 * 这样 05 列表看到的顺序，和它反过来喂给求解器产生的日程顺序不会对不上。
 */
function sortByOrder<T extends { id: string }>(items: T[], order: string[]): T[] {
  if (!order.length) return items
  const rank = new Map(order.map((id, index) => [id, index]))
  return [...items].sort((a, b) => {
    const ra = rank.get(a.id)
    const rb = rank.get(b.id)
    if (ra === undefined && rb === undefined) return 0
    if (ra === undefined) return 1
    if (rb === undefined) return -1
    return ra - rb
  })
}

interface AnalysisState {
  task: Task
  proposal: TaskAnalysisProposal
  source: 'AI' | 'BASELINE'
  fallbackReason?: string
}

export interface Engine {
  screen: Screen
  navigate: (screen: Screen) => void

  nowMs: number
  todayLabel: string
  busy: boolean
  statusMessage: string
  setStatusMessage: (message: string) => void

  // 05 待办列表
  tasks: UiTask[]
  tabCounts: { all: number; today: number; completed: number }
  createTask: (input: { title: string; dueAt: number; importance: Importance }) => Promise<void>
  editTask: (taskId: string, changes: { title: string; dueAt: number; importance: Importance }) => void
  deleteTask: (taskId: string) => void
  reopenTask: (taskId: string) => void
  moveTask: (taskId: string, direction: 'up' | 'down') => void
  adjustTaskDuration: (taskId: string, deltaMinutes: number) => void

  // 06 AI 建议确认
  proposal: UiProposal | null
  confirmProposal: (request: AcceptRequest) => Promise<void>
  reanalyse: () => Promise<void>

  // 07 今日安排草案
  blocks: UiScheduleBlock[]
  unscheduled: UiUnscheduled[]
  scheduleWarnings: string[]
  scheduleSource: 'AI' | 'BASELINE' | null
  /** 草案在生成后被用户拖动/改时长重排过；来源仍是 scheduleSource。 */
  scheduleAdjusted: boolean
  projectedFinishLabel: string | null
  hourRail: string[]
  commitmentCandidates: UiTask[]
  selectedCommitments: Set<string>
  toggleCommitment: (taskId: string) => void
  reorderBlock: (draggedBlockId: string, targetBlockId: string) => void
  toggleLock: (blockId: string) => void
  adjustDuration: (blockId: string, deltaMinutes: number) => void
  regenerateSchedule: () => Promise<void>
  confirmSchedule: () => void

  // 01 / 12 / 13 承诺与跑路
  commitments: UiTask[]
  completedCommitments: number
  activeCommitment: UiTask | null
  nextCommitment: UiTask | null
  completeTask: (taskId: string) => void
  minutesToClockout: number
  nangFeeLabel: string
  workdayTimeline: { start: string; lunch: string; clockout: string }
  clockoutOutcome: ClockoutOutcome
  clockout: () => void
}

export function useEngine(initialScreen: Screen = '05-task-list'): Engine {
  const storeRef = useRef<TaskStore>(null as unknown as TaskStore)
  if (storeRef.current === null) storeRef.current = new TaskStore()
  const store = storeRef.current

  const nowRef = useRef(demoNow())
  const nowMs = nowRef.current

  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [tasks, setTasks] = useState<Task[]>([])
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null)
  const [draft, setDraft] = useState<ScheduleDraft | null>(null)
  const [scheduleSource, setScheduleSource] = useState<'AI' | 'BASELINE' | null>(null)
  const [scheduleAdjusted, setScheduleAdjusted] = useState(false)
  const [preferredOrder, setPreferredOrder] = useState<string[]>([])
  const [lockedBlockIds, setLockedBlockIds] = useState<Set<string>>(() => new Set())
  const [selectedCommitments, setSelectedCommitments] = useState<Set<string>>(() => new Set())
  const [committedIds, setCommittedIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const sync = useCallback(() => {
    store.refreshUrgency(nowMs)
    setTasks(store.list())
  }, [store, nowMs])

  /** 当前草案里任务块的先后顺序。AI 排完后，这就是模型给的顺序。 */
  const orderFromDraft = useCallback((source: ScheduleDraft | null): string[] => {
    const order: string[] = []
    for (const block of source?.blocks ?? []) {
      if (block.type === 'TASK' && block.taskId && !order.includes(block.taskId)) order.push(block.taskId)
    }
    return order
  }, [])

  /**
   * 本地确定性重排。默认继承**当前草案**的任务顺序，而不是 preferredOrder——
   * 后者只在用户手动拖过之后才有值，之前是空数组，会让求解器从头按自己的启发式重排，
   * 于是「+5 分钟」这种小调整会把 AI 排好的整天推翻。
   *
   * 也不再改写 scheduleSource：草案的来源仍然是 AI，只是时间被重算了，
   * 用 scheduleAdjusted 单独表达「已按你的调整重排」。
   */
  const runLocalSchedule = useCallback(
    (order?: string[]) => {
      const effective = order ?? orderFromDraft(draft)
      const next = solveSchedule({ tasks: store.list(), settings: WORK_SETTINGS, nowMs }, effective)
      setDraft(next)
      setScheduleAdjusted(true)
      return next
    },
    [store, nowMs, draft, orderFromDraft]
  )

  // 种子任务用本地确定性基线分析，开屏即有内容且不消耗 AI 调用；
  // 之后用户新建的任务才走真实 /api/task-analysis。
  useEffect(() => {
    for (const seed of SEED_TASKS) {
      const input: UserTaskInput = {
        title: seed.title,
        dueAt: nowMs + seed.dueIn * 3_600_000,
        importance: seed.importance
      }
      const task = store.create(input, nowMs)
      const proposal = baselineProposal(task.id, input, DEMO_HISTORY, task.revision, nowMs)
      applyProposal(store, task, proposal, {
        acceptedFields: ['category', 'estimatedDurationMs', 'cognitiveLoad', 'splittability']
      })
    }
    store.refreshUrgency(nowMs)
    setTasks(store.list())
    const seeded = solveSchedule({ tasks: store.list(), settings: WORK_SETTINGS, nowMs }, [])
    setDraft(seeded)
    setScheduleSource('BASELINE')
    setScheduleAdjusted(false)
    setSelectedCommitments(new Set(seeded.commitmentCandidateTaskIds))
    setCommittedIds(seeded.commitmentCandidateTaskIds)
    // 只在挂载时播种一次。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const navigate = useCallback((next: Screen) => {
    setScreen(next)
    setStatusMessage('')
  }, [])

  const taskTitles = useMemo(
    () => new Map(tasks.map((task) => [task.id, task.title])),
    [tasks]
  )

  // ─── 05 待办列表 ─────────────────────────────────────────

  const analyseTask = useCallback(
    async (task: Task): Promise<AnalysisState> => {
      try {
        const result = (await window.notAI.analyzeTask({
          taskId: task.id,
          title: task.title,
          dueAt: task.dueAt,
          importance: task.importance,
          taskRevision: task.revision,
          history: DEMO_HISTORY
        })) as {
          proposal: TaskAnalysisProposal
          source: 'AI' | 'BASELINE'
          fallbackReason?: string
        }
        return { task, ...result }
      } catch (error) {
        // IPC 层失败也不能中断流程 —— 与逻辑层同样的降级承诺（PRD 05 §7）。
        return {
          task,
          proposal: baselineProposal(task.id, task, DEMO_HISTORY, task.revision, nowMs),
          source: 'BASELINE',
          fallbackReason: `IPC_${error instanceof Error ? error.message : 'UNKNOWN'}`
        }
      }
    },
    [nowMs]
  )

  const createTask = useCallback(
    async (input: { title: string; dueAt: number; importance: Importance }) => {
      setBusy(true)
      try {
        const task = store.create({ title: input.title, dueAt: input.dueAt, importance: input.importance }, nowMs)
        sync()
        setAnalysis(await analyseTask(task))
        navigate('06-ai-analysis')
      } catch (error) {
        setStatusMessage(error instanceof Error ? `创建失败：${error.message}` : '创建失败')
      } finally {
        setBusy(false)
      }
    },
    [store, nowMs, sync, analyseTask, navigate]
  )

  // ─── 06 AI 建议确认 ──────────────────────────────────────

  const reanalyse = useCallback(async () => {
    if (!analysis) return
    setBusy(true)
    try {
      const fresh = await analyseTask(store.get(analysis.task.id))
      setAnalysis(fresh)
      setStatusMessage(
        fresh.source === 'AI' ? '已重新分析。' : `模型不可用，已降级为基线估计（${fresh.fallbackReason ?? '未知原因'}）。`
      )
    } finally {
      setBusy(false)
    }
  }, [analysis, analyseTask, store])

  const requestRemoteSchedule = useCallback(async (): Promise<void> => {
    const current = store.list()
    try {
      const result = (await window.notAI.generateSchedule({
        nowMs,
        settings: WORK_SETTINGS,
        // 只送结构化约束，标题在主进程里已替换成 [LOCAL_TASK]，供应商拿不到任务内容。
        tasks: current.map((task) => ({
          id: task.id,
          dueAt: task.dueAt,
          importance: task.importance,
          status: task.status,
          urgency: task.urgency,
          estimatedDurationMs: task.estimatedDurationMs,
          cognitiveLoad: task.cognitiveLoad,
          splittability: task.splittability,
          schedulingMode: task.schedulingMode
        }))
      })) as {
        draft: ScheduleDraft
        source: 'AI' | 'BASELINE'
        fallbackReason?: string
      }
      setDraft(result.draft)
      setScheduleSource(result.source)
      setScheduleAdjusted(false)
      setLockedBlockIds(new Set())
      setSelectedCommitments(new Set(result.draft.commitmentCandidateTaskIds))
      setStatusMessage(
        result.source === 'AI'
          ? '已生成 AI 安排草案，并通过确定性硬约束校验。'
          : `模型未参与排程，已用确定性求解器生成（${result.fallbackReason ?? '未知原因'}）。`
      )
    } catch {
      const local = runLocalSchedule([])
      setScheduleSource('BASELINE')
      setScheduleAdjusted(false)
      setLockedBlockIds(new Set())
      setSelectedCommitments(new Set(local.commitmentCandidateTaskIds))
      setStatusMessage('排程服务不可用，已用本地确定性求解器生成。')
    }
  }, [store, nowMs, runLocalSchedule])

  const confirmProposal = useCallback(
    async (request: AcceptRequest) => {
      if (!analysis) return
      setBusy(true)
      try {
        applyProposal(store, store.get(analysis.task.id), analysis.proposal, request)
        sync()
        setAnalysis(null)
        navigate('07-schedule-draft')
        await requestRemoteSchedule()
      } catch (error) {
        setStatusMessage(error instanceof Error ? `确认失败：${error.message}` : '确认失败')
      } finally {
        setBusy(false)
      }
    },
    [analysis, store, sync, navigate, requestRemoteSchedule]
  )

  // ─── 07 今日安排草案 ─────────────────────────────────────

  const blocks = useMemo<UiScheduleBlock[]>(() => {
    if (!draft) return []
    return draft.blocks.map((block) => {
      const view = toUiBlock(block, taskTitles)
      return { ...view, locked: view.locked || lockedBlockIds.has(block.blockId) }
    })
  }, [draft, taskTitles, lockedBlockIds])

  const taskOrderFromBlocks = useCallback(
    (source: UiScheduleBlock[]): string[] => {
      const order: string[] = []
      for (const block of source) {
        if (block.kind === 'task' && block.taskId && !order.includes(block.taskId)) order.push(block.taskId)
      }
      return order
    },
    []
  )

  /**
   * 拖动只是换任务先后顺序，不能借机整份改跑确定性求解器（那套 50 分钟聚焦上限、
   * 强制缓冲块的启发式和 AI 的排法是两回事，跑一遍等于把 AI 草案换成另一份方案）。
   * reorderScheduleBlocks 原样保留当前草案里每个任务已经决定的块时长，只按新顺序
   * 重新塞回空闲时段——因此不经过 runLocalSchedule/solveSchedule。
   */
  const reorderBlock = useCallback(
    (draggedBlockId: string, targetBlockId: string) => {
      if (draggedBlockId === targetBlockId) return
      if (!draft) return
      const from = blocks.findIndex((block) => block.id === draggedBlockId)
      const to = blocks.findIndex((block) => block.id === targetBlockId)
      if (from < 0 || to < 0) return
      if (blocks[from].locked || blocks[to].locked) {
        setStatusMessage('锁定的时间块不参与重排。')
        return
      }

      const next = [...blocks]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      const order = taskOrderFromBlocks(next)
      setPreferredOrder(order)
      const result = reorderScheduleBlocks({ tasks: store.list(), settings: WORK_SETTINGS, nowMs }, draft.blocks, order)
      setDraft(result)
      setScheduleAdjusted(true)
      setSelectedCommitments((current) => {
        const candidates = new Set(result.commitmentCandidateTaskIds)
        return new Set([...current].filter((id) => candidates.has(id)))
      })
      setStatusMessage('已按你的顺序重排：沿用 AI 草案原有的每块时长，只是换了先后和时间，AI 草案没有被丢弃。')
    },
    [blocks, taskOrderFromBlocks, draft, store, nowMs]
  )

  const toggleLock = useCallback((blockId: string) => {
    setLockedBlockIds((current) => {
      const next = new Set(current)
      if (next.has(blockId)) next.delete(blockId)
      else next.add(blockId)
      return next
    })
  }, [])

  /**
   * 改时长是改任务的估计值本身，然后整日重排 —— 不是只把一个方块拉长。
   * 按 5 分钟粒度增减（PROPOSAL_FIELDS 的 estimatedDurationMs 仍受 5 分钟–40 小时校验），
   * 不依赖任务当前是否已在日程块上，05 列表里未排程的任务也能直接调。
   */
  const adjustTaskDuration = useCallback(
    (taskId: string, deltaMinutes: number) => {
      let task: Task
      try {
        task = store.get(taskId)
      } catch (error) {
        setStatusMessage(error instanceof Error ? `调整失败：${error.message}` : '调整失败')
        return
      }
      const current = task.estimatedDurationMs ?? 0
      const nextMs = Math.max(5 * MIN, current + toMs(deltaMinutes))
      store.patch(task.id, task.revision, {
        estimatedDurationMs: nextMs,
        fieldOrigins: { ...task.fieldOrigins, estimatedDurationMs: 'USER' }
      })
      sync()
      const result = runLocalSchedule()
      setSelectedCommitments((currentSet) => {
        const candidates = new Set(result.commitmentCandidateTaskIds)
        return new Set([...currentSet].filter((id) => candidates.has(id)))
      })
      setStatusMessage(
        `「${task.title}」估计时长改为 ${durationLabel(toMinutes(nextMs))}，已沿用当前顺序重排；估计值来源标记为你本人。`
      )
    },
    [store, sync, runLocalSchedule]
  )

  /** 07 屏时间块上的调整按钮：先按 blockId 解出对应任务，再走同一套确定性重排逻辑。 */
  const adjustDuration = useCallback(
    (blockId: string, deltaMinutes: number) => {
      const block = blocks.find((item) => item.id === blockId)
      if (!block?.taskId) return
      adjustTaskDuration(block.taskId, deltaMinutes)
    },
    [blocks, adjustTaskDuration]
  )

  /**
   * 05 列表的手动排序：只在“全部”页签使用（此时可见顺序即完整顺序，不会因筛选
   * 隐藏相邻项造成“点了却看不出变化”）。复用 preferredTaskOrder 机制，
   * 排序结果立即反馈到日程重排，和拖动时间块共享同一个顺序状态。
   */
  const moveTask = useCallback(
    (taskId: string, direction: 'up' | 'down') => {
      const order = preferredOrder.length ? preferredOrder : tasks.map((task) => task.id)
      const index = order.indexOf(taskId)
      const swapWith = direction === 'up' ? index - 1 : index + 1
      if (index < 0 || swapWith < 0 || swapWith >= order.length) return
      const next = [...order]
      ;[next[index], next[swapWith]] = [next[swapWith], next[index]]
      setPreferredOrder(next)
      const result = runLocalSchedule(next)
      setSelectedCommitments((current) => {
        const candidates = new Set(result.commitmentCandidateTaskIds)
        return new Set([...current].filter((id) => candidates.has(id)))
      })
      setStatusMessage('已调整任务顺序，日程已按新顺序重排。')
    },
    [preferredOrder, tasks, runLocalSchedule]
  )

  /** 编辑用户自己填写的三个字段；AI 建议字段（类别/时长等）走 06 屏确认流程，这里不碰。 */
  const editTask = useCallback(
    (taskId: string, changes: { title: string; dueAt: number; importance: Importance }) => {
      try {
        const task = store.get(taskId)
        store.patch(task.id, task.revision, {
          title: changes.title,
          dueAt: changes.dueAt,
          importance: changes.importance
        })
        sync()
        const result = runLocalSchedule()
        setSelectedCommitments((current) => {
          const candidates = new Set(result.commitmentCandidateTaskIds)
          return new Set([...current].filter((id) => candidates.has(id)))
        })
        setStatusMessage('已保存修改。')
      } catch (error) {
        setStatusMessage(error instanceof Error ? `保存失败：${error.message}` : '保存失败')
      }
    },
    [store, sync, runLocalSchedule]
  )

  /**
   * 删除即软删除（PRD 04 §5）。已进入今日承诺快照的任务不接受这里直接删——
   * 承诺集合“仅允许追加、移除须走审计”（PRD 04 §7.2），需要先在 07 屏取消承诺。
   */
  const deleteTask = useCallback(
    (taskId: string) => {
      if (committedIds.includes(taskId)) {
        setStatusMessage('该任务已进入今日承诺快照，请先在日程草案页取消勾选，再删除。')
        return
      }
      try {
        store.softDelete(taskId)
      } catch (error) {
        setStatusMessage(error instanceof Error ? `删除失败：${error.message}` : '删除失败')
        return
      }
      if (analysis?.task.id === taskId) setAnalysis(null)
      const baseOrder = preferredOrder.length ? preferredOrder : orderFromDraft(draft)
      const nextOrder = baseOrder.filter((id) => id !== taskId)
      setPreferredOrder(preferredOrder.filter((id) => id !== taskId))
      sync()
      const result = runLocalSchedule(nextOrder)
      setSelectedCommitments((current) => {
        const candidates = new Set(result.commitmentCandidateTaskIds)
        const next = new Set([...current].filter((id) => candidates.has(id)))
        next.delete(taskId)
        return next
      })
      setStatusMessage('已删除任务。')
    },
    [store, committedIds, analysis, preferredOrder, sync, runLocalSchedule]
  )

  const regenerateSchedule = useCallback(async () => {
    setBusy(true)
    setPreferredOrder([])
    try {
      await requestRemoteSchedule()
    } finally {
      setBusy(false)
    }
  }, [requestRemoteSchedule])

  const toggleCommitment = useCallback((taskId: string) => {
    setSelectedCommitments((current) => {
      const next = new Set(current)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }, [])

  const confirmSchedule = useCallback(() => {
    setCommittedIds([...selectedCommitments])
    navigate('01-task-bubble')
  }, [selectedCommitments, navigate])

  // ─── 承诺、完成与跑路 ────────────────────────────────────

  const uiTasks = useMemo(
    () => sortByOrder(tasks, preferredOrder).map((task) => toUiTask(task, draft ?? undefined)),
    [tasks, draft, preferredOrder]
  )

  const commitmentCandidates = useMemo(() => {
    const candidates = new Set(draft?.commitmentCandidateTaskIds ?? [])
    return uiTasks.filter((task) => candidates.has(task.id))
  }, [draft, uiTasks])

  const commitments = useMemo(
    () => committedIds.map((id) => uiTasks.find((task) => task.id === id)).filter((task): task is UiTask => Boolean(task)),
    [committedIds, uiTasks]
  )

  const completedCommitments = commitments.filter((task) => task.completed).length
  const activeCommitment = commitments.find((task) => !task.completed) ?? null
  const nextCommitment = commitments.filter((task) => !task.completed)[1] ?? null

  const completeTask = useCallback(
    (taskId: string) => {
      try {
        // 幂等键按“任务 + 当前 revision”生成：同一状态下重复点击不重复记账（PRD 13 §4）；
        // 撤销完成会推进 revision，所以撤销后再次完成不会撞上旧缓存、被当成同一次请求吞掉。
        const task = store.get(taskId)
        store.complete(taskId, `complete-${taskId}-rev${task.revision}`, { completedAt: nowMs })
        sync()
      } catch (error) {
        setStatusMessage(error instanceof Error ? `完成失败：${error.message}` : '完成失败')
      }
    },
    [store, nowMs, sync]
  )

  /** 撤销完成（PRD 04 §5：COMPLETED → IN_PROGRESS）。 */
  const reopenTask = useCallback(
    (taskId: string) => {
      try {
        store.reopen(taskId)
        sync()
        setStatusMessage('已恢复为未完成。')
      } catch (error) {
        setStatusMessage(error instanceof Error ? `恢复失败：${error.message}` : '恢复失败')
      }
    },
    [store, sync]
  )

  const clockoutOutcome: ClockoutOutcome =
    commitments.length > 0 && completedCommitments === commitments.length ? 'WIN' : 'TASKS_INCOMPLETE'

  const clockout = useCallback(() => navigate('13-clockout-success'), [navigate])

  const workEndMs = atHour(nowMs, 18)
  const workStartMs = atHour(nowMs, 9)
  const minutesToClockout = Math.max(0, Math.round((workEndMs - nowMs) / MIN))
  const nangFeeLabel = formatMoney(
    accrue(Math.max(0, nowMs - workStartMs), DEMO_DAILY_SALARY_MINOR, workEndMs - workStartMs).displayDeltaMinor
  )
  const workdayTimeline = {
    start: WORK_SETTINGS.workStart,
    lunch: WORK_SETTINGS.lunchStart,
    clockout: clockTime(nowMs)
  }

  // ─── 派生展示数据 ────────────────────────────────────────

  const tabCounts = useMemo(
    () => ({
      all: uiTasks.length,
      today: uiTasks.filter((task) => (draft?.blocks ?? []).some((block) => block.taskId === task.id)).length,
      completed: uiTasks.filter((task) => task.completed).length
    }),
    [uiTasks, draft]
  )

  /** 小时刻度由草案实际跨度推导，不再写死 09:00–18:30。 */
  const hourRail = useMemo(() => {
    if (!draft?.blocks.length) return []
    const start = Math.min(...draft.blocks.map((block) => block.startAt))
    const end = Math.max(...draft.blocks.map((block) => block.endAt))
    const rail: string[] = []
    for (let cursor = new Date(start).setMinutes(0, 0, 0); cursor <= end; cursor += 60 * MIN) {
      rail.push(timeRange(cursor, cursor).slice(0, 5))
    }
    rail.push(new Date(end).toTimeString().slice(0, 5))
    return rail
  }, [draft])

  return {
    screen,
    navigate,
    nowMs,
    todayLabel: dateLabel(nowMs),
    busy,
    statusMessage,
    setStatusMessage,

    tasks: uiTasks,
    tabCounts,
    createTask,
    editTask,
    deleteTask,
    reopenTask,
    moveTask,
    adjustTaskDuration,

    proposal: analysis
      ? toUiProposal(analysis.proposal, analysis.task.title, analysis.source, analysis.fallbackReason)
      : null,
    confirmProposal,
    reanalyse,

    blocks,
    unscheduled: draft ? toUiUnscheduled(draft, taskTitles) : [],
    scheduleWarnings: (draft?.warnings ?? []).map(warningLabel),
    scheduleSource,
    scheduleAdjusted,
    projectedFinishLabel: draft?.projectedFinishAt ? new Date(draft.projectedFinishAt).toTimeString().slice(0, 5) : null,
    hourRail,
    commitmentCandidates,
    selectedCommitments,
    toggleCommitment,
    reorderBlock,
    toggleLock,
    adjustDuration,
    regenerateSchedule,
    confirmSchedule,

    commitments,
    completedCommitments,
    activeCommitment,
    nextCommitment,
    completeTask,
    minutesToClockout,
    nangFeeLabel,
    workdayTimeline,
    clockoutOutcome,
    clockout
  }
}

export type { AcceptRequest, ProposalField }
export { personalMultiplier, DEMO_HISTORY }
