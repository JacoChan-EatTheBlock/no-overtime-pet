/**
 * 任务与排程 6 屏。视觉结构与 codex/ui-task-schedule 的还原稿一致；
 * 数据全部来自 useEngine()，背后是 prototype 逻辑层 + 真实 AI 调用（失败自动降级）。
 */
import { useMemo, useState, type CSSProperties, type DragEvent, type FormEvent, type ReactNode } from 'react'
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconArrowsMove,
  IconBrain,
  IconCalendar,
  IconCaretDownFilled,
  IconCategory,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconChevronUp,
  IconCircleCheckFilled,
  IconClock,
  IconDeviceFloppy,
  IconEdit,
  IconFileText,
  IconFlag,
  IconHelpCircle,
  IconInfoCircle,
  IconListCheck,
  IconLock,
  IconLockOpen,
  IconMinus,
  IconPencil,
  IconPlus,
  IconPuzzle,
  IconRefresh,
  IconRobot,
  IconRun,
  IconSettings,
  IconSparkles,
  IconSquare,
  IconSquareCheckFilled,
  IconTrash,
  IconUsers,
  IconX
} from '@tabler/icons-react'
import { Button } from '../../components/Button'
import { FormField } from '../../components/FormField'
import { PixelSurface } from '../../components/PixelSurface'
import type { Engine, Screen } from './adapter/useEngine'
import type { AcceptRequest } from '@domain/accept.js'
import type { CognitiveLoad, Importance, ProposalField, Splittability, TaskCategory } from '@domain/types.js'
import {
  CATEGORY_LABEL,
  IMPORTANCE_LABEL,
  durationLabel,
  fromDatetimeLocalValue,
  shortDateLabel,
  toDatetimeLocalValue,
  toMs,
  type UiProposal,
  type UiTask
} from './adapter/mapping'
import styles from './TaskScheduleFlow.module.css'

/** 子任务的采用/不用；主建议字段不再有单独的采用态，直接编辑即代表修改。 */
type SuggestionDecision = 'accepted' | 'rejected'

function PetCompanion({ celebrate = false }: { celebrate?: boolean }) {
  return (
    <img
      className={`${styles.pet} pixel-art`}
      src={celebrate ? '/assets/capybara/celebrate.png' : '/assets/capybara/idle.png'}
      alt={celebrate ? '举起双爪庆祝的像素水豚' : '坐在电脑前工作的像素水豚'}
    />
  )
}

function IconButton({ label, children, onClick }: { label: string; children: ReactNode; onClick?: () => void }) {
  return (
    <button className={styles.iconButton} type="button" aria-label={label} onClick={onClick}>
      {children}
    </button>
  )
}

function ProgressSegments({ completed, total }: { completed: number; total: number }) {
  const segments = Math.max(total, 1)
  return (
    <div
      className={styles.progressSegments}
      style={{ '--segment-count': segments } as CSSProperties}
      role="progressbar"
      aria-label="承诺任务完成进度"
      aria-valuemin={0}
      aria-valuemax={segments}
      aria-valuenow={completed}
    >
      {Array.from({ length: segments }, (_, index) => (
        <span key={index} className={index < completed ? styles.completedSegment : undefined} />
      ))}
    </div>
  )
}

function ScreenClose({ onClick }: { onClick: () => void }) {
  return (
    <IconButton label="关闭当前画面" onClick={onClick}>
      <IconX size={28} stroke={2} aria-hidden="true" />
    </IconButton>
  )
}

// ─── 01 今日任务气泡 ────────────────────────────────────────

function TaskBubbleScreen({ engine, nav }: { engine: Engine; nav?: ShellNav }) {
  const { commitments, completedCommitments, activeCommitment, nextCommitment } = engine
  const allDone = commitments.length > 0 && completedCommitments === commitments.length

  return (
    <section
      className={styles.overlayStage}
      data-ui-screen="01-task-bubble"
      data-ui-state={`completed-${completedCommitments}`}
    >
      <PixelSurface className={styles.taskBubble} innerClassName={styles.taskBubbleInner} ariaLabel="今日任务气泡">
        <header className={styles.bubbleHeader}>
          <h1>今天，{shortDateLabel(engine.nowMs)}</h1>
          <div className={styles.headerActions}>
            <IconButton label="好友" onClick={nav?.openFriends}><IconUsers size={27} stroke={2} aria-hidden="true" /></IconButton>
            <IconButton label="设置" onClick={nav?.openSettings}><IconSettings size={27} stroke={2} aria-hidden="true" /></IconButton>
          </div>
        </header>

        <div className={styles.nowLabel}>{allDone ? '全部完成' : '正在进行'}</div>
        <h2 className={styles.currentTask}>{activeCommitment?.title ?? '今日承诺已经完成'}</h2>
        <p className={styles.currentTime}>{activeCommitment?.time ?? '可以放心准点跑路'}</p>

        <div className={styles.bubbleButtons}>
          <Button
            variant="primary"
            onClick={() => activeCommitment && engine.completeTask(activeCommitment.id)}
            disabled={!activeCommitment}
          >
            完成这项
          </Button>
          <Button onClick={() => engine.navigate('07-schedule-draft')}>重新安排</Button>
        </div>

        <div className={styles.progressLabel}>承诺任务　{completedCommitments}/{commitments.length}</div>
        <ProgressSegments completed={completedCommitments} total={commitments.length} />

        <div className={styles.nextTask}>
          <span aria-hidden="true" />
          <strong>{nextCommitment ? `${nextCommitment.time}　${nextCommitment.title}` : '没有更多承诺任务'}</strong>
        </div>

        <footer className={styles.bubbleFooter}>
          <div>
            <IconClock size={25} stroke={2} aria-hidden="true" />
            <span>距离下班<br /><strong>{durationLabel(engine.minutesToClockout)}</strong></span>
          </div>
          <div>
            <IconFlag size={25} stroke={2} aria-hidden="true" />
            <span>窝囊费<br /><strong>{engine.nangFeeLabel}</strong></span>
          </div>
          <Button variant="danger" onClick={() => engine.navigate('12-clockout-confirm')}>跑路</Button>
        </footer>
      </PixelSurface>
      <IconCaretDownFilled className={styles.bubbleTail} size={45} aria-hidden="true" />
      <PetCompanion />
    </section>
  )
}

// ─── 05 待办列表与新建 ──────────────────────────────────────

/** 编辑任务自己的三个字段（标题/DDL/重要性）；key 里的 isEditing 变化会让表单以初始值重新挂载。 */
function TaskEditForm({
  task,
  onSave,
  onCancel
}: {
  task: UiTask
  onSave: (changes: { title: string; dueAt: number; importance: Importance }) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(task.title)
  const [dueAt, setDueAt] = useState(() => toDatetimeLocalValue(task.dueAt))
  const [importance, setImportance] = useState<Importance>(task.importance)
  const [error, setError] = useState('')

  function save(): void {
    if (!title.trim()) {
      setError('请填写要做什么。')
      return
    }
    const parsed = fromDatetimeLocalValue(dueAt)
    if (parsed === undefined) {
      setError('请选择 DDL 日期和时间。')
      return
    }
    onSave({ title: title.trim(), dueAt: parsed, importance })
  }

  return (
    <div className={styles.taskEditForm}>
      <input aria-label="任务标题" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} />
      <input aria-label="DDL" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
      <select aria-label="重要性" value={importance} onChange={(event) => setImportance(event.target.value as Importance)}>
        {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((value) => (
          <option key={value} value={value}>{IMPORTANCE_LABEL[value]}</option>
        ))}
      </select>
      <Button className={styles.smallButton} variant="primary" onClick={save}>
        <IconDeviceFloppy size={16} stroke={2} aria-hidden="true" />保存
      </Button>
      <Button className={styles.smallButton} onClick={onCancel}>取消</Button>
      {error ? <p className={styles.formError} role="alert">{error}</p> : null}
    </div>
  )
}

/** 一行的操作条：完成切换、±5 分钟调时长（有估时才显示）、上移/下移（仅“全部”页签）、编辑、删除。 */
function TaskRowActions({
  engine,
  task,
  showReorder,
  isFirst,
  isLast,
  committed,
  deleteArmed,
  onArmDelete,
  onEdit
}: {
  engine: Engine
  task: UiTask
  showReorder: boolean
  isFirst: boolean
  isLast: boolean
  committed: boolean
  deleteArmed: boolean
  onArmDelete: () => void
  onEdit: () => void
}) {
  return (
    <div className={styles.taskRowActions}>
      {showReorder ? (
        <>
          <button
            type="button"
            className={styles.rowIconButton}
            aria-label={`把「${task.title}」上移`}
            disabled={isFirst}
            onClick={() => engine.moveTask(task.id, 'up')}
          >
            <IconChevronUp size={17} stroke={2} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.rowIconButton}
            aria-label={`把「${task.title}」下移`}
            disabled={isLast}
            onClick={() => engine.moveTask(task.id, 'down')}
          >
            <IconChevronDown size={17} stroke={2} aria-hidden="true" />
          </button>
        </>
      ) : null}

      <button
        type="button"
        className={styles.completeToggle}
        aria-pressed={task.completed}
        onClick={() => (task.completed ? engine.reopenTask(task.id) : engine.completeTask(task.id))}
      >
        {task.completed ? (
          <><IconSquareCheckFilled size={18} stroke={1.9} aria-hidden="true" />已完成</>
        ) : (
          <><IconSquare size={18} stroke={1.9} aria-hidden="true" />完成</>
        )}
      </button>

      {task.durationMinutes !== null ? (
        <span className={styles.durationStepper}>
          <button
            type="button"
            className={styles.rowIconButton}
            aria-label={`「${task.title}」预计时长减 5 分钟`}
            onClick={() => engine.adjustTaskDuration(task.id, -5)}
          >
            <IconMinus size={15} stroke={2} aria-hidden="true" />
          </button>
          {task.durationMinutes}分
          <button
            type="button"
            className={styles.rowIconButton}
            aria-label={`「${task.title}」预计时长加 5 分钟`}
            onClick={() => engine.adjustTaskDuration(task.id, 5)}
          >
            <IconPlus size={15} stroke={2} aria-hidden="true" />
          </button>
        </span>
      ) : null}

      <button type="button" className={styles.rowTextButton} onClick={onEdit}>
        <IconEdit size={17} stroke={1.9} aria-hidden="true" />编辑
      </button>
      <button
        type="button"
        className={`${styles.rowTextButton} ${deleteArmed ? styles.dangerArmed : ''}`}
        disabled={committed}
        title={committed ? '已进入今日承诺快照，请先在日程草案页取消勾选再删除' : undefined}
        onClick={onArmDelete}
      >
        <IconTrash size={17} stroke={1.9} aria-hidden="true" />
        {committed ? '已承诺' : deleteArmed ? '确定删除？' : '删除'}
      </button>
    </div>
  )
}

function TaskListScreen({ engine }: { engine: Engine }) {
  const [filter, setFilter] = useState<'all' | 'today' | 'completed'>('all')
  const [title, setTitle] = useState('梳理上线风险')
  const [dueAt, setDueAt] = useState(() => {
    // 默认给今天 17:30，用户直接用日期时间选择器改，不用照格式打字。
    const defaultDue = new Date(engine.nowMs)
    defaultDue.setHours(17, 30, 0, 0)
    return toDatetimeLocalValue(defaultDue.getTime())
  })
  const [importance, setImportance] = useState<Importance>('HIGH')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteArmedId, setDeleteArmedId] = useState<string | null>(null)

  const scheduledIds = useMemo(
    () => new Set(engine.blocks.filter((block) => block.taskId).map((block) => block.taskId as string)),
    [engine.blocks]
  )

  /** 已进入今日承诺快照的任务：只有这里禁止删除，其余操作（完成/调时长/编辑）不受影响。 */
  const committedTaskIds = useMemo(
    () => new Set(engine.commitments.map((task) => task.id)),
    [engine.commitments]
  )

  const visibleTasks = useMemo(() => {
    if (filter === 'completed') return engine.tasks.filter((task) => task.completed)
    if (filter === 'today') return engine.tasks.filter((task) => scheduledIds.has(task.id))
    return engine.tasks
  }, [filter, engine.tasks, scheduledIds])

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (!title.trim()) {
      setError('请填写要做什么。')
      return
    }
    const parsed = fromDatetimeLocalValue(dueAt)
    if (parsed === undefined) {
      setError('请选择 DDL 日期和时间。')
      return
    }
    setError('')
    void engine.createTask({ title: title.trim(), dueAt: parsed, importance })
  }

  /** 删除要点两下：第一下只“上膛”，点别的行的删除会换目标，真正的删除只发生在第二下点同一行。 */
  function handleArmDelete(taskId: string): void {
    if (deleteArmedId === taskId) {
      engine.deleteTask(taskId)
      setDeleteArmedId(null)
    } else {
      setEditingId(null)
      setDeleteArmedId(taskId)
    }
  }

  function handleEdit(taskId: string): void {
    setDeleteArmedId(null)
    setEditingId(taskId)
  }

  return (
    <section className={styles.mainStage} data-ui-screen="05-task-list" data-ui-state={filter}>
      <PixelSurface className={styles.taskWindow} innerClassName={styles.taskWindowInner} ariaLabel="待办列表与新建">
        <div className={styles.taskListColumn}>
          <header className={styles.pageHeading}>
            <div className={styles.headingIcon}><IconListCheck size={38} stroke={1.8} aria-hidden="true" /></div>
            <div>
              <h1>今天的待办</h1>
              <p>{engine.todayLabel}</p>
            </div>
            <IconHelpCircle className={styles.helpIcon} size={23} stroke={1.8} aria-hidden="true" />
          </header>

          <div className={styles.taskTabs} role="tablist" aria-label="筛选任务">
            {([
              ['all', '全部', engine.tabCounts.all],
              ['today', '今天', engine.tabCounts.today],
              ['completed', '已完成', engine.tabCounts.completed]
            ] as const).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filter === value}
                className={filter === value ? styles.activeTaskTab : undefined}
                onClick={() => setFilter(value)}
              >
                {label}　{count}
              </button>
            ))}
          </div>
          {filter === 'all' ? <p className={styles.reorderHint}>用 ▲▼ 调整顺序时，日程会按新顺序重排。</p> : null}

          <div className={styles.taskRows} aria-live="polite">
            {visibleTasks.map((task, index) => (
              <article key={task.id} className={styles.taskRow}>
                <IconAlertCircle className={styles[`${task.urgency}Icon`]} size={27} stroke={2} aria-hidden="true" />
                <div>
                  <h2>{task.title}</h2>
                  <p>{task.time}</p>
                </div>
                <span className={`${styles.urgencyChip} ${styles[task.urgency]}`}>{task.urgencyLabel}</span>

                {editingId === task.id ? (
                  <TaskEditForm
                    key={`edit-${task.id}`}
                    task={task}
                    onSave={(changes) => { engine.editTask(task.id, changes); setEditingId(null) }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <TaskRowActions
                    engine={engine}
                    task={task}
                    showReorder={filter === 'all'}
                    isFirst={index === 0}
                    isLast={index === visibleTasks.length - 1}
                    committed={committedTaskIds.has(task.id)}
                    deleteArmed={deleteArmedId === task.id}
                    onArmDelete={() => handleArmDelete(task.id)}
                    onEdit={() => handleEdit(task.id)}
                  />
                )}
              </article>
            ))}
            {visibleTasks.length === 0 ? <p className={styles.emptyTasks}>这个筛选下还没有任务。</p> : null}
          </div>
          <p className={styles.taskListStatus} role="status">{engine.statusMessage}</p>
        </div>

        <form className={styles.createTaskPanel} onSubmit={submit}>
          <h2><IconPencil size={28} stroke={1.8} aria-hidden="true" />新增待办</h2>
          <FormField
            id="new-task-title"
            label="要做什么 *"
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
          />
          <FormField
            id="new-task-due"
            label="DDL *"
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            leadingIcon={<IconCalendar size={23} stroke={1.8} aria-hidden="true" />}
          />
          <label className={styles.selectField} htmlFor="new-task-importance">
            <span>重要性 *</span>
            <select
              id="new-task-importance"
              value={importance}
              onChange={(event) => setImportance(event.target.value as typeof importance)}
            >
              {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((value) => (
                <option key={value} value={value}>{IMPORTANCE_LABEL[value]}</option>
              ))}
            </select>
          </label>
          <p className={styles.autoAnalysisHint}>创建后将直接进入 AI 建议确认</p>
          {error ? <p className={styles.formError} role="alert">{error}</p> : null}
          <Button variant="primary" fullWidth type="submit" disabled={engine.busy}>
            {engine.busy ? 'AI 分析中…' : '创建并进入 AI 分析'}
          </Button>
          <Button fullWidth type="button" onClick={() => { setTitle(''); setError('') }}>取消</Button>
        </form>
      </PixelSurface>
      <PetCompanion />
    </section>
  )
}

// ─── 06 AI 建议确认 ─────────────────────────────────────────

function AnalysisScreen({ engine, proposal }: { engine: Engine; proposal: UiProposal }) {
  const subtaskKeys = proposal.subtasks.map((subtask) => subtask.id)
  const [decisions, setDecisions] = useState<Record<string, SuggestionDecision>>(() =>
    Object.fromEntries(subtaskKeys.map((key) => [key, 'accepted']))
  )
  const [category, setCategory] = useState<TaskCategory>(proposal.categoryCode)
  const [durationMinutes, setDurationMinutes] = useState(proposal.durationMinutes)
  const [cognitiveLoad, setCognitiveLoad] = useState(proposal.cognitiveLoadCode)
  const [splittability, setSplittability] = useState(proposal.splittabilityCode)

  function setDecision(key: string, decision: SuggestionDecision): void {
    setDecisions((current) => ({ ...current, [key]: decision }))
  }

  function rejectAllSubtasks(): void {
    setDecisions((current) => {
      const next = { ...current }
      for (const key of subtaskKeys) next[key] = 'rejected'
      return next
    })
  }

  /** 关闭本次建议、不确认——任务仍只保留你填写的三个字段，和点右上角 ✕ 效果一致。 */
  function rejectAll(): void {
    engine.navigate('05-task-list')
    engine.setStatusMessage('已放弃本次 AI 建议，任务仍保留你填写的三个字段。')
  }

  function confirm(): void {
    // 四个建议字段永远一起写入；用户改过哪个，哪个就带 override 以 USER 来源落地，
    // 没改的沿用 AI 原值（AI_ACCEPTED）。不再需要单独的“采用”状态。
    const overrides: Partial<Record<ProposalField, unknown>> = {}
    if (category !== proposal.categoryCode) overrides.category = category
    if (durationMinutes !== proposal.durationMinutes) overrides.estimatedDurationMs = toMs(durationMinutes)
    if (cognitiveLoad !== proposal.cognitiveLoadCode) overrides.cognitiveLoad = cognitiveLoad
    if (splittability !== proposal.splittabilityCode) overrides.splittability = splittability

    const request: AcceptRequest = {
      acceptedFields: ['category', 'estimatedDurationMs', 'cognitiveLoad', 'splittability'],
      overrides: Object.keys(overrides).length ? overrides : undefined,
      acceptedSubtaskOrders: proposal.subtasks
        .filter((subtask) => decisions[subtask.id] !== 'rejected')
        .map((subtask) => subtask.order)
    }
    void engine.confirmProposal(request)
  }

  return (
    <section className={styles.mainStage} data-ui-screen="06-ai-analysis" data-ui-state={proposal.source.toLowerCase()}>
      <PixelSurface className={styles.analysisWindow} innerClassName={styles.analysisWindowInner} ariaLabel="AI 分析建议">
        <header className={styles.analysisHeader}>
          <div className={styles.robotBadge}><IconRobot size={38} stroke={1.8} aria-hidden="true" /></div>
          <div>
            <h1>AI 分析建议</h1>
            <p>这是建议，确认后才会写入任务。</p>
          </div>
          <ScreenClose onClick={() => engine.navigate('05-task-list')} />
        </header>

        <section className={styles.analysisTaskHeading}>
          <IconFileText size={30} stroke={1.8} aria-hidden="true" />
          <h2>{proposal.taskTitle}</h2>
          <span>{proposal.source === 'AI' ? '建议' : '基线'}</span>
        </section>

        <p className={styles.yourInputLabel}>你填写的</p>
        <div className={styles.userInputSummary}>
          <span><IconCalendar size={24} stroke={1.8} aria-hidden="true" />模型　{proposal.modelVersion}</span>
          <span><IconFlag size={24} stroke={1.8} aria-hidden="true" />置信度　{proposal.confidence}（{proposal.confidenceValue.toFixed(2)}）</span>
        </div>

        <section className={styles.suggestionPanel}>
          <h3>AI 分析建议（不会修改你的设置）</h3>
          <p className={styles.suggestionEditHint}>觉得不对就直接在右边改，不用先“采用”。</p>
          <div className={styles.suggestionRows}>
            <div className={`${styles.suggestionRow} ${category !== proposal.categoryCode ? styles.editedSuggestion : ''}`}>
              <span className={styles.suggestionIcon} aria-hidden="true"><IconCategory size={24} stroke={1.9} /></span>
              <strong>任务类型</strong>
              <select
                className={styles.suggestionControl}
                value={category}
                onChange={(event) => setCategory(event.target.value as TaskCategory)}
              >
                {(Object.keys(CATEGORY_LABEL) as TaskCategory[]).map((code) => (
                  <option key={code} value={code}>{CATEGORY_LABEL[code]}</option>
                ))}
              </select>
              {category !== proposal.categoryCode ? <span className={styles.editedBadge}>已改</span> : null}
            </div>

            <div className={`${styles.suggestionRow} ${durationMinutes !== proposal.durationMinutes ? styles.editedSuggestion : ''}`}>
              <span className={styles.suggestionIcon} aria-hidden="true"><IconClock size={24} stroke={1.9} /></span>
              <strong>预计时长</strong>
              <span className={styles.durationControl}>
                <input
                  className={styles.suggestionControl}
                  type="number"
                  min={5}
                  max={2400}
                  step={5}
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(Number(event.target.value))}
                />
                <small>分钟　建议区间 {proposal.durationRange}</small>
              </span>
              {durationMinutes !== proposal.durationMinutes ? <span className={styles.editedBadge}>已改</span> : null}
            </div>

            <div className={`${styles.suggestionRow} ${cognitiveLoad !== proposal.cognitiveLoadCode ? styles.editedSuggestion : ''}`}>
              <span className={styles.suggestionIcon} aria-hidden="true"><IconBrain size={24} stroke={1.9} /></span>
              <strong>认知负荷</strong>
              <select
                className={styles.suggestionControl}
                value={cognitiveLoad}
                onChange={(event) => setCognitiveLoad(event.target.value as CognitiveLoad)}
              >
                <option value="LOW">低</option>
                <option value="MEDIUM">中</option>
                <option value="HIGH">高</option>
              </select>
              {cognitiveLoad !== proposal.cognitiveLoadCode ? <span className={styles.editedBadge}>已改</span> : null}
            </div>

            <div className={`${styles.suggestionRow} ${splittability !== proposal.splittabilityCode ? styles.editedSuggestion : ''}`}>
              <span className={styles.suggestionIcon} aria-hidden="true"><IconPuzzle size={24} stroke={1.9} /></span>
              <strong>可拆分性</strong>
              <select
                className={styles.suggestionControl}
                value={splittability}
                onChange={(event) => setSplittability(event.target.value as Splittability)}
              >
                <option value="ATOMIC">不可拆分</option>
                <option value="SPLITTABLE">可拆分</option>
                <option value="REQUIRES_REVIEW">需确认</option>
              </select>
              {splittability !== proposal.splittabilityCode ? <span className={styles.editedBadge}>已改</span> : null}
            </div>
          </div>

          <div className={styles.confidenceRow}>
            <span><IconInfoCircle size={20} stroke={1.8} aria-hidden="true" />{proposal.rationale}</span>
            <strong>置信度　{proposal.confidence}</strong>
          </div>

          {proposal.warnings.length ? (
            <p className={styles.analysisWarning}>
              <IconAlertTriangle size={20} stroke={1.9} aria-hidden="true" />{proposal.warnings.join('　')}
            </p>
          ) : null}

          {proposal.subtasks.length ? (
            <>
              <h3 className={styles.subtaskTitle}>
                建议的子任务（可选）
                <button type="button" className={styles.subtaskRejectAll} onClick={rejectAllSubtasks}>
                  全部不采用
                </button>
              </h3>
              <div className={styles.subtaskRows}>
                {proposal.subtasks.map((subtask, index) => (
                  <div key={subtask.id} className={decisions[subtask.id] === 'rejected' ? styles.rejectedSuggestion : ''}>
                    <span>{index + 1}</span>
                    <strong>{subtask.title}</strong>
                    <span>{subtask.durationMinutes}分钟</span>
                    <Button
                      className={styles.smallButton}
                      variant={decisions[subtask.id] === 'accepted' ? 'primary' : 'secondary'}
                      onClick={() => setDecision(subtask.id, 'accepted')}
                    >
                      {decisions[subtask.id] === 'accepted' ? '已采用' : '采用'}
                    </Button>
                    <Button className={styles.smallButton} onClick={() => setDecision(subtask.id, 'rejected')}>不用</Button>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </section>

        <footer className={styles.analysisActions}>
          <button className={styles.reanalyseButton} type="button" onClick={() => void engine.reanalyse()} disabled={engine.busy}>
            <IconRefresh size={22} stroke={1.9} aria-hidden="true" />重新分析
          </button>
          <p role="status">{engine.statusMessage}</p>
          <Button onClick={rejectAll}>全部拒绝</Button>
          <Button variant="primary" onClick={confirm} disabled={engine.busy}>确认建议</Button>
        </footer>
      </PixelSurface>
      <PetCompanion />
    </section>
  )
}

// ─── 07 今日安排草案 ────────────────────────────────────────

function ScheduleScreen({ engine }: { engine: Engine }) {
  const [draggedId, setDraggedId] = useState<string | null>(null)

  return (
    <section
      className={styles.mainStage}
      data-ui-screen="07-schedule-draft"
      data-ui-state={`commitments-${engine.selectedCommitments.size}`}
    >
      <PixelSurface className={styles.scheduleWindow} innerClassName={styles.scheduleWindowInner} ariaLabel="今日安排草案">
        <header className={styles.scheduleHeader}>
          <div className={styles.headingIcon}><IconCalendar size={38} stroke={1.8} aria-hidden="true" /></div>
          <div><h1>今日安排草案</h1><p>{engine.todayLabel}</p></div>
          <p className={styles.aiDraftHint}>
            <IconSparkles size={22} stroke={1.8} aria-hidden="true" />
            {engine.scheduleSource !== 'AI'
              ? '模型未参与，本次由确定性求解器生成。'
              : engine.scheduleAdjusted
                ? 'AI 建议的顺序 + 你的调整，时间已重算。'
                : 'AI 负责建议，最终安排由你确认。'}
          </p>
          <ScreenClose onClick={() => engine.navigate('05-task-list')} />
        </header>

        <div className={styles.scheduleContent}>
          <section className={styles.scheduleTimeline} aria-label="可拖动日程时间轴">
            <div className={styles.timelineHours} aria-hidden="true">
              {engine.hourRail.map((time) => <span key={time}>{time}</span>)}
            </div>
            {engine.blocks.map((block) => (
              <article
                key={block.id}
                className={[
                  styles.scheduleBlock,
                  block.kind !== 'task' ? styles.breakBlock : '',
                  draggedId === block.id ? styles.draggingBlock : ''
                ].filter(Boolean).join(' ')}
                style={{ '--block-minutes': block.durationMinutes } as CSSProperties}
                draggable={block.kind === 'task' && !block.locked}
                onDragStart={(event: DragEvent<HTMLElement>) => {
                  event.dataTransfer.effectAllowed = 'move'
                  setDraggedId(block.id)
                }}
                onDragEnd={() => setDraggedId(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedId) engine.reorderBlock(draggedId, block.id)
                  setDraggedId(null)
                }}
              >
                <span className={styles.blockTime}>{block.time}</span>
                <strong>{block.title}</strong>
                {block.kind === 'task' ? (
                  <div className={styles.blockActions}>
                    <span><IconArrowsMove size={20} stroke={1.9} aria-hidden="true" />拖动</span>
                    <button
                      type="button"
                      aria-label={`${block.locked ? '解锁' : '锁定'}${block.title}`}
                      onClick={() => engine.toggleLock(block.id)}
                    >
                      {block.locked ? <IconLock size={20} stroke={1.9} /> : <IconLockOpen size={20} stroke={1.9} />}
                      {block.locked ? '已锁定' : '锁定'}
                    </button>
                    <button
                      type="button"
                      aria-label={`「${block.title}」预计时长减 5 分钟`}
                      onClick={() => engine.adjustDuration(block.id, -5)}
                    >
                      <IconMinus size={18} stroke={1.9} />
                    </button>
                    <span>{block.durationMinutes}分</span>
                    <button
                      type="button"
                      aria-label={`「${block.title}」预计时长加 5 分钟`}
                      onClick={() => engine.adjustDuration(block.id, 5)}
                    >
                      <IconPlus size={18} stroke={1.9} />
                    </button>
                  </div>
                ) : (
                  <span className={styles.breakLock}><IconLock size={20} stroke={1.9} aria-hidden="true" />锁定</span>
                )}
              </article>
            ))}
            {engine.projectedFinishLabel ? (
              <div className={styles.finishEstimate}>
                <IconCircleCheckFilled size={30} stroke={1.5} aria-hidden="true" />
                预计 {engine.projectedFinishLabel} 完成，可准点下班
              </div>
            ) : null}
          </section>

          <aside className={styles.commitmentPanel}>
            {/* 承诺项和排不下的任务条数都随任务量变化，滚动它们，别把底部操作挤出窗口。 */}
            <div className={styles.commitmentScroll}>
            <h2>今日承诺任务 <span>{engine.selectedCommitments.size}</span></h2>
            <div className={styles.commitmentList}>
              {engine.commitmentCandidates.map((task) => (
                <label key={task.id}>
                  <input
                    type="checkbox"
                    checked={engine.selectedCommitments.has(task.id)}
                    onChange={() => engine.toggleCommitment(task.id)}
                  />
                  <span>{task.title}</span>
                </label>
              ))}
              {engine.commitmentCandidates.length === 0 ? (
                <p className={styles.emptyTasks}>没有能完整排入今日的任务。</p>
              ) : null}
            </div>
            <hr />
            <h3>排不下的任务 <span>{engine.unscheduled.length}</span></h3>
            {engine.unscheduled.map((item) => (
              <p key={item.taskId} className={styles.unscheduledTask}>
                <IconClock size={24} stroke={1.9} aria-hidden="true" />
                <strong>{item.title}</strong> · {item.reason}
                {item.neededMinutes > 0 ? ` · 还需 ${durationLabel(item.neededMinutes)}` : ''}
              </p>
            ))}
            {engine.scheduleWarnings.map((warning) => (
              <div key={warning} className={styles.capacityWarning}>
                <IconAlertTriangle size={22} stroke={1.9} aria-hidden="true" />{warning}
              </div>
            ))}
            </div>
            <Button
              variant="primary"
              fullWidth
              onClick={engine.confirmSchedule}
              disabled={engine.selectedCommitments.size === 0}
            >
              确认今日安排
            </Button>
            <Button fullWidth onClick={() => engine.navigate('05-task-list')}>返回修改任务</Button>
            <Button fullWidth onClick={() => void engine.regenerateSchedule()} disabled={engine.busy}>
              <IconRefresh size={20} stroke={1.9} aria-hidden="true" />{engine.busy ? '生成中…' : '重新生成'}
            </Button>
            <p className={styles.scheduleStatus} role="status">{engine.statusMessage}</p>
          </aside>
        </div>
      </PixelSurface>
      <PetCompanion />
    </section>
  )
}

// ─── 12 跑路确认 ────────────────────────────────────────────

function ClockoutConfirmScreen({ engine }: { engine: Engine }) {
  const incomplete = engine.commitments.filter((task) => !task.completed)

  return (
    <section
      className={styles.overlayStage}
      data-ui-screen="12-clockout-confirm"
      data-ui-state={`completed-${engine.completedCommitments}`}
    >
      <PixelSurface className={styles.clockoutDialog} innerClassName={styles.clockoutDialogInner} ariaLabel="跑路确认">
        <h1>现在跑路？</h1>
        <p className={styles.clockoutTime}>
          <IconClock size={26} stroke={1.9} aria-hidden="true" />
          距离下班 {durationLabel(engine.minutesToClockout)}
        </p>
        <div className={styles.progressLabel}>承诺任务　{engine.completedCommitments}/{engine.commitments.length}</div>
        <ProgressSegments completed={engine.completedCommitments} total={engine.commitments.length} />
        <ul className={styles.incompleteTasks}>
          {incomplete.length > 0
            ? incomplete.map((task) => <li key={task.id}>{task.title}</li>)
            : <li>今日承诺任务已全部完成</li>}
        </ul>
        <div className={styles.clockoutMessages}>
          <p className={styles.safeMessage}><IconCircleCheckFilled size={25} stroke={1.8} aria-hidden="true" />你仍然可以下班。</p>
          {incomplete.length > 0 ? (
            <p className={styles.warningMessage}>
              <IconAlertTriangle size={27} stroke={1.9} aria-hidden="true" />今天会记录为「任务未完成」，不会获得准点奖励。
            </p>
          ) : (
            <p className={styles.safeMessage}>
              <IconCheck size={25} stroke={2} aria-hidden="true" />任务已完成，可以获得准点奖励资格。
            </p>
          )}
          <p><IconInfoCircle size={25} stroke={1.8} aria-hidden="true" />系统不会阻止你，也不会评价你。</p>
        </div>
        <div className={styles.clockoutButtons}>
          <Button variant="danger" onClick={engine.clockout}><IconRun size={24} stroke={2} aria-hidden="true" />照样跑路</Button>
          <Button variant="primary" onClick={() => engine.navigate('01-task-bubble')}>回去完成</Button>
        </div>
        <button className={styles.adjustCommitment} type="button" onClick={() => engine.navigate('07-schedule-draft')}>
          <IconSettings size={26} stroke={1.9} aria-hidden="true" />
          <span><strong>调整承诺任务</strong><small>需记录取消原因和资格影响</small></span>
          <IconChevronRight size={24} stroke={1.9} aria-hidden="true" />
        </button>
      </PixelSurface>
      <PetCompanion />
    </section>
  )
}

// ─── 13 跑路结果 ────────────────────────────────────────────

function SuccessScreen({ engine }: { engine: Engine }) {
  const won = engine.clockoutOutcome === 'WIN'

  return (
    <section
      className={styles.overlayStage}
      data-ui-screen="13-clockout-success"
      data-ui-state={engine.clockoutOutcome.toLowerCase()}
    >
      <PixelSurface className={styles.successDialog} innerClassName={styles.successDialogInner} ariaLabel="跑路结果">
        <div className={`${styles.successMark} ${won ? '' : styles.incompleteMark}`}>
          {won ? <IconSparkles className={styles.leftSuccessSparkle} size={28} stroke={1.8} aria-hidden="true" /> : null}
          {won
            ? <IconCircleCheckFilled size={84} stroke={1.4} aria-hidden="true" />
            : <IconAlertCircle size={84} stroke={1.6} aria-hidden="true" />}
          {won ? <IconSparkles className={styles.rightSuccessSparkle} size={28} stroke={1.8} aria-hidden="true" /> : null}
        </div>
        <h1>{won ? '准点跑路成功' : '已经跑路'}</h1>
        <p className={styles.successTime}>距离下班还有 {durationLabel(engine.minutesToClockout)}</p>
        <h2>{won ? '今天胜利' : '今天未胜利'}</h2>

        <div className={styles.resultRows}>
          <div>
            <IconListCheck size={25} stroke={1.9} aria-hidden="true" />
            <span>承诺任务　{engine.completedCommitments}/{engine.commitments.length}</span>
            <ProgressSegments completed={engine.completedCommitments} total={engine.commitments.length} />
          </div>
          <div>
            <IconFlag size={25} stroke={1.9} aria-hidden="true" />
            <span>今日获得窝囊费</span>
            <strong>+{engine.nangFeeLabel}</strong>
          </div>
          <div>
            <IconClock size={25} stroke={1.9} aria-hidden="true" />
            <span>{won ? '准点奖池奖励：待结算' : '准点奖池奖励：无资格'}</span>
          </div>
          <div>
            <IconUsers size={25} stroke={1.9} aria-hidden="true" />
            <span>好友将看到：<strong>{won ? '已跑路' : '已下班'}</strong></span>
            <IconRun className={styles.resultRunIcon} size={34} stroke={2.2} aria-hidden="true" />
          </div>
        </div>

        <div className={styles.dayTimeline} aria-label="今日时间线">
          <span><strong>{engine.workdayTimeline.start}</strong><small>上班</small></span>
          <span><strong>{engine.workdayTimeline.lunch}</strong><small>午休</small></span>
          <span className={styles.timelineEnd}><strong>{engine.workdayTimeline.clockout}</strong><small>跑路</small></span>
        </div>

        <div className={styles.successActions}>
          <Button variant="primary" onClick={() => engine.navigate('05-task-list')}>收工</Button>
          <Button onClick={() => engine.navigate('01-task-bubble')}>查看今天记录</Button>
        </div>
        <p className={styles.settlementHint}>
          <IconSparkles size={21} stroke={1.8} aria-hidden="true" />
          {won ? '奖励结算完成后会静默入账。' : '明天仍然可以重新确认承诺。'}
        </p>
      </PixelSurface>
      <PetCompanion celebrate={won} />
    </section>
  )
}

// ─── 路由 ───────────────────────────────────────────────────

/** 外壳导航：把气泡右上角的好友/设置接到 App 的屏幕栈上。未传时按钮无动作。 */
export interface ShellNav {
  openFriends?: () => void
  openSettings?: () => void
}

export function TaskScheduleFlow({ engine, nav }: { engine: Engine; nav?: ShellNav }) {
  switch (engine.screen) {
    case '01-task-bubble':
      return <TaskBubbleScreen engine={engine} nav={nav} />
    case '06-ai-analysis':
      return engine.proposal
        ? <AnalysisScreen engine={engine} proposal={engine.proposal} />
        : <TaskListScreen engine={engine} />
    case '07-schedule-draft':
      return <ScheduleScreen engine={engine} />
    case '12-clockout-confirm':
      return <ClockoutConfirmScreen engine={engine} />
    case '13-clockout-success':
      return <SuccessScreen engine={engine} />
    default:
      return <TaskListScreen engine={engine} />
  }
}

export type { Screen }
