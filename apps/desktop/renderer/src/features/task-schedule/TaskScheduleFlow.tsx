import {
  useMemo,
  useState,
  type DragEvent,
  type FormEvent,
  type ReactNode
} from 'react'
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconArrowsMove,
  IconBrain,
  IconCalendar,
  IconCaretDownFilled,
  IconCategory,
  IconCheck,
  IconChevronRight,
  IconCircleCheckFilled,
  IconClock,
  IconFileText,
  IconFlag,
  IconHelpCircle,
  IconInfoCircle,
  IconListCheck,
  IconLock,
  IconLockOpen,
  IconPencil,
  IconPuzzle,
  IconRefresh,
  IconRobot,
  IconRun,
  IconSettings,
  IconSparkles,
  IconUsers,
  IconX
} from '@tabler/icons-react'
import { Button } from '../../components/Button'
import { FormField } from '../../components/FormField'
import { PixelSurface } from '../../components/PixelSurface'
import {
  COMMITMENT_TITLES,
  DEFAULT_ANALYSIS,
  INITIAL_SCHEDULE_BLOCKS,
  INITIAL_TASKS,
  type Importance,
  type ScheduleBlock,
  type TaskItem,
  type TaskScheduleScreen
} from './taskScheduleFixtures'
import styles from './TaskScheduleFlow.module.css'

interface TaskScheduleFlowProps {
  initialScreen?: TaskScheduleScreen
  onScreenChange?: (screen: TaskScheduleScreen) => void
}

type SuggestionDecision = 'accepted' | 'editing' | 'rejected'
type ClockoutOutcome = 'WIN' | 'TASKS_INCOMPLETE'

const SUGGESTION_KEYS = [
  'category',
  'duration',
  'cognitiveLoad',
  'splittability',
  ...DEFAULT_ANALYSIS.subtasks.map((subtask) => subtask.id)
]

function initialDecisions(): Record<string, SuggestionDecision> {
  return Object.fromEntries(SUGGESTION_KEYS.map((key) => [key, 'accepted']))
}

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

function ProgressSegments({ completed, total = 5 }: { completed: number; total?: number }) {
  return (
    <div
      className={styles.progressSegments}
      role="progressbar"
      aria-label="承诺任务完成进度"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={completed}
    >
      {Array.from({ length: total }, (_, index) => (
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

function TaskBubbleScreen({
  completedCount,
  onComplete,
  onReschedule,
  onClockout
}: {
  completedCount: number
  onComplete: () => void
  onReschedule: () => void
  onClockout: () => void
}) {
  const nextTasks = ['整理产品评审材料', '撰写需求文档', '问题修复与优化', '整理今日工作']
  const activeTask = completedCount >= 5 ? '今日承诺已经完成' : nextTasks[Math.min(Math.max(0, completedCount - 3), nextTasks.length - 1)]
  const nextTask = completedCount >= 5 ? '可以放心准点跑路' : '11:10　撰写需求文档'

  return (
    <section className={styles.overlayStage} data-ui-screen="01-task-bubble" data-ui-state={`completed-${completedCount}`}>
      <PixelSurface className={styles.taskBubble} innerClassName={styles.taskBubbleInner} ariaLabel="今日任务气泡">
        <header className={styles.bubbleHeader}>
          <h1>今天，8月29日</h1>
          <div className={styles.headerActions}>
            <IconButton label="好友"><IconUsers size={27} stroke={2} aria-hidden="true" /></IconButton>
            <IconButton label="设置"><IconSettings size={27} stroke={2} aria-hidden="true" /></IconButton>
          </div>
        </header>

        <div className={styles.nowLabel}>{completedCount >= 5 ? '全部完成' : '正在进行'}</div>
        <h2 className={styles.currentTask}>{activeTask}</h2>
        <p className={styles.currentTime}>{completedCount >= 5 ? '18:28' : '10:20–11:10'}</p>

        <div className={styles.bubbleButtons}>
          <Button variant="primary" onClick={onComplete} disabled={completedCount >= 5}>完成这项</Button>
          <Button onClick={onReschedule}>重新安排</Button>
        </div>

        <div className={styles.progressLabel}>承诺任务　{completedCount}/5</div>
        <ProgressSegments completed={completedCount} />

        <div className={styles.nextTask}>
          <span aria-hidden="true" />
          <strong>{nextTask}</strong>
        </div>

        <footer className={styles.bubbleFooter}>
          <div><IconClock size={25} stroke={2} aria-hidden="true" /><span>距离下班<br /><strong>{completedCount >= 5 ? '2分钟' : '4小时12分'}</strong></span></div>
          <div><IconFlag size={25} stroke={2} aria-hidden="true" /><span>窝囊费<br /><strong>¥86.40</strong></span></div>
          <Button variant="danger" onClick={onClockout}>跑路</Button>
        </footer>
      </PixelSurface>
      <IconCaretDownFilled className={styles.bubbleTail} size={45} aria-hidden="true" />
      <PetCompanion />
    </section>
  )
}

function TaskListScreen({
  tasks,
  onCreate
}: {
  tasks: TaskItem[]
  onCreate: (task: { title: string; dueAt: string; importance: Importance }) => void
}) {
  const [filter, setFilter] = useState<'all' | 'today' | 'completed'>('all')
  const [title, setTitle] = useState('梳理上线风险')
  const [dueAt, setDueAt] = useState('8月29日 17:30')
  const [importance, setImportance] = useState<Importance>('HIGH')

  const visibleTasks = useMemo(() => {
    if (filter === 'completed') return tasks.filter((task) => task.completed)
    if (filter === 'today') return tasks.slice(0, 5)
    return tasks
  }, [filter, tasks])

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (!title.trim()) return
    onCreate({ title: title.trim(), dueAt, importance })
  }

  return (
    <section className={styles.mainStage} data-ui-screen="05-task-list" data-ui-state={filter}>
      <PixelSurface className={styles.taskWindow} innerClassName={styles.taskWindowInner} ariaLabel="待办列表与新建">
        <div className={styles.taskListColumn}>
          <header className={styles.pageHeading}>
            <div className={styles.headingIcon}><IconListCheck size={38} stroke={1.8} aria-hidden="true" /></div>
            <div>
              <h1>今天的待办</h1>
              <p>8月29日 · 星期六</p>
            </div>
            <IconHelpCircle className={styles.helpIcon} size={23} stroke={1.8} aria-hidden="true" />
          </header>

          <div className={styles.taskTabs} role="tablist" aria-label="筛选任务">
            {([
              ['all', '全部　7'],
              ['today', '今天　5'],
              ['completed', '已完成　2']
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filter === value}
                className={filter === value ? styles.activeTaskTab : undefined}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={styles.taskRows} aria-live="polite">
            {visibleTasks.map((task) => (
              <article key={task.id} className={styles.taskRow}>
                <IconAlertCircle
                  className={styles[`${task.urgency}Icon`]}
                  size={27}
                  stroke={2}
                  aria-hidden="true"
                />
                <div>
                  <h2>{task.title}</h2>
                  <p>{task.time}</p>
                </div>
                <span className={`${styles.urgencyChip} ${styles[task.urgency]}`}>{task.urgencyLabel}</span>
              </article>
            ))}
          </div>
        </div>

        <form className={styles.createTaskPanel} onSubmit={submit}>
          <h2><IconPencil size={28} stroke={1.8} aria-hidden="true" />新增待办</h2>
          <FormField
            id="new-task-title"
            label="要做什么 *"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <FormField
            id="new-task-due"
            label="DDL *"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            leadingIcon={<IconCalendar size={23} stroke={1.8} aria-hidden="true" />}
          />
          <label className={styles.selectField} htmlFor="new-task-importance">
            <span>重要性 *</span>
            <select id="new-task-importance" value={importance} onChange={(event) => setImportance(event.target.value as Importance)}>
              <option value="LOW">低</option>
              <option value="MEDIUM">中</option>
              <option value="HIGH">高</option>
              <option value="CRITICAL">最高</option>
            </select>
          </label>
          <p className={styles.autoAnalysisHint}>创建后将直接进入 AI 建议确认</p>
          <Button variant="primary" fullWidth type="submit">创建并进入 AI 分析</Button>
          <Button fullWidth type="button" onClick={() => setTitle('')}>取消</Button>
        </form>
      </PixelSurface>
      <PetCompanion />
    </section>
  )
}

interface AnalysisScreenProps {
  taskTitle: string
  dueAt: string
  importance: Importance
  onConfirm: () => void
  onClose: () => void
}

function AnalysisScreen({ taskTitle, dueAt, importance, onConfirm, onClose }: AnalysisScreenProps) {
  const [decisions, setDecisions] = useState<Record<string, SuggestionDecision>>(initialDecisions)
  const [category, setCategory] = useState(DEFAULT_ANALYSIS.category)
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_ANALYSIS.durationMinutes)
  const [cognitiveLoad, setCognitiveLoad] = useState(DEFAULT_ANALYSIS.cognitiveLoad)
  const [splittability, setSplittability] = useState(DEFAULT_ANALYSIS.splittability)
  const [status, setStatus] = useState('')

  function setDecision(key: string, decision: SuggestionDecision): void {
    setDecisions((current) => ({ ...current, [key]: decision }))
  }

  function rejectAll(): void {
    setDecisions(Object.fromEntries(SUGGESTION_KEYS.map((key) => [key, 'rejected'])))
    setStatus('已拒绝全部建议，将保留你的原始设置。')
  }

  function reanalyse(): void {
    setDecisions(initialDecisions())
    setStatus('已重新载入固定的 mock 分析建议。')
  }

  const formattedDueAt = dueAt.includes('T')
    ? `${Number(dueAt.slice(5, 7))}月${Number(dueAt.slice(8, 10))}日 ${dueAt.slice(11, 16)}`
    : '8月29日 17:00'
  const importanceLabel = importance === 'CRITICAL' ? '最高' : importance === 'HIGH' ? '高' : importance === 'MEDIUM' ? '中' : '低'

  const rows = [
    { key: 'category', icon: <IconCategory size={24} stroke={1.9} />, label: '任务类型', value: category },
    { key: 'duration', icon: <IconClock size={24} stroke={1.9} />, label: '预计时长', value: `${durationMinutes}分钟　${DEFAULT_ANALYSIS.durationRange}` },
    { key: 'cognitiveLoad', icon: <IconBrain size={24} stroke={1.9} />, label: '认知负荷', value: cognitiveLoad },
    { key: 'splittability', icon: <IconPuzzle size={24} stroke={1.9} />, label: '可拆分性', value: splittability }
  ]

  return (
    <section className={styles.mainStage} data-ui-screen="06-ai-analysis" data-ui-state="proposal">
      <PixelSurface className={styles.analysisWindow} innerClassName={styles.analysisWindowInner} ariaLabel="AI 分析建议">
        <header className={styles.analysisHeader}>
          <div className={styles.robotBadge}><IconRobot size={38} stroke={1.8} aria-hidden="true" /></div>
          <div>
            <h1>AI 分析建议</h1>
            <p>这是建议，确认后才会写入任务。</p>
          </div>
          <ScreenClose onClick={onClose} />
        </header>

        <section className={styles.analysisTaskHeading}>
          <IconFileText size={30} stroke={1.8} aria-hidden="true" />
          <h2>{taskTitle}</h2>
          <span>建议</span>
        </section>

        <p className={styles.yourInputLabel}>你填写的</p>
        <div className={styles.userInputSummary}>
          <span><IconCalendar size={24} stroke={1.8} aria-hidden="true" />DDL　{formattedDueAt}</span>
          <span><IconFlag size={24} stroke={1.8} aria-hidden="true" />重要性　{importanceLabel}</span>
        </div>

        <section className={styles.suggestionPanel}>
          <h3>AI 分析建议（不会修改你的设置）</h3>
          <div className={styles.suggestionRows}>
            {rows.map((row) => (
              <div key={row.key} className={`${styles.suggestionRow} ${decisions[row.key] === 'rejected' ? styles.rejectedSuggestion : ''}`}>
                <span className={styles.suggestionIcon} aria-hidden="true">{row.icon}</span>
                <strong>{row.label}</strong>
                <span className={styles.suggestionValue}>{row.value}</span>
                <Button
                  className={styles.smallButton}
                  variant={decisions[row.key] === 'accepted' ? 'primary' : 'secondary'}
                  onClick={() => setDecision(row.key, 'accepted')}
                >
                  {decisions[row.key] === 'accepted' ? '已采用' : '采用'}
                </Button>
                <Button className={styles.smallButton} onClick={() => setDecision(row.key, 'editing')}>修改</Button>
              </div>
            ))}
          </div>

          {Object.values(decisions).includes('editing') ? (
            <div className={styles.inlineEditor} aria-label="修改 AI 建议">
              <label>任务类型<input value={category} onChange={(event) => setCategory(event.target.value)} /></label>
              <label>预计分钟<input type="number" min="5" max="2400" value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} /></label>
              <label>认知负荷<select value={cognitiveLoad} onChange={(event) => setCognitiveLoad(event.target.value)}><option>低</option><option>中</option><option>高</option></select></label>
              <label>可拆分性<select value={splittability} onChange={(event) => setSplittability(event.target.value)}><option>不可拆分</option><option>可拆分</option><option>需确认</option></select></label>
            </div>
          ) : null}

          <div className={styles.confidenceRow}>
            <span><IconInfoCircle size={20} stroke={1.8} aria-hidden="true" />参考了 4 个相似任务；你的历史速度比目录基线快约 12%。</span>
            <strong>置信度　{DEFAULT_ANALYSIS.confidence}</strong>
          </div>

          <h3 className={styles.subtaskTitle}>建议的子任务（可选）</h3>
          <div className={styles.subtaskRows}>
            {DEFAULT_ANALYSIS.subtasks.map((subtask, index) => (
              <div key={subtask.id} className={decisions[subtask.id] === 'rejected' ? styles.rejectedSuggestion : ''}>
                <span>{index + 1}</span>
                <strong>{subtask.title}</strong>
                <span>{subtask.durationMinutes}分钟</span>
                <Button className={styles.smallButton} variant={decisions[subtask.id] === 'accepted' ? 'primary' : 'secondary'} onClick={() => setDecision(subtask.id, 'accepted')}>
                  {decisions[subtask.id] === 'accepted' ? '已采用' : '采用'}
                </Button>
                <Button className={styles.smallButton} onClick={() => setDecision(subtask.id, 'editing')}>修改</Button>
              </div>
            ))}
          </div>
        </section>

        <footer className={styles.analysisActions}>
          <button className={styles.reanalyseButton} type="button" onClick={reanalyse}><IconRefresh size={22} stroke={1.9} aria-hidden="true" />重新分析</button>
          <p role="status">{status}</p>
          <Button onClick={rejectAll}>全部拒绝</Button>
          <Button variant="primary" onClick={onConfirm}>确认建议</Button>
        </footer>
      </PixelSurface>
      <PetCompanion />
    </section>
  )
}

function ScheduleScreen({ onConfirm, onBack, onClose }: { onConfirm: () => void; onBack: () => void; onClose: () => void }) {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>(INITIAL_SCHEDULE_BLOCKS)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [selectedCommitments, setSelectedCommitments] = useState(() => new Set(COMMITMENT_TITLES))
  const [status, setStatus] = useState('')

  function dropBlock(targetId: string): void {
    if (!draggedId || draggedId === targetId) return
    setBlocks((current) => {
      const from = current.findIndex((block) => block.id === draggedId)
      const to = current.findIndex((block) => block.id === targetId)
      if (from < 0 || to < 0 || current[from].locked || current[to].locked) return current
      const next = [...current]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
    setDraggedId(null)
    setStatus('已按你的顺序调整草案。')
  }

  function toggleLock(id: string): void {
    setBlocks((current) => current.map((block) => block.id === id ? { ...block, locked: !block.locked } : block))
  }

  function adjustDuration(id: string): void {
    setBlocks((current) => current.map((block) => block.id === id ? { ...block, durationMinutes: block.durationMinutes + 10 } : block))
    setStatus('已把该时间块增加 10 分钟；这是本地 mock 草案。')
  }

  function toggleCommitment(title: string): void {
    setSelectedCommitments((current) => {
      const next = new Set(current)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  return (
    <section className={styles.mainStage} data-ui-screen="07-schedule-draft" data-ui-state={`commitments-${selectedCommitments.size}`}>
      <PixelSurface className={styles.scheduleWindow} innerClassName={styles.scheduleWindowInner} ariaLabel="今日安排草案">
        <header className={styles.scheduleHeader}>
          <div className={styles.headingIcon}><IconCalendar size={38} stroke={1.8} aria-hidden="true" /></div>
          <div><h1>今日安排草案</h1><p>8月29日 · 星期六</p></div>
          <p className={styles.aiDraftHint}><IconSparkles size={22} stroke={1.8} aria-hidden="true" />AI 负责建议，最终安排由你确认。</p>
          <ScreenClose onClick={onClose} />
        </header>

        <div className={styles.scheduleContent}>
          <section className={styles.scheduleTimeline} aria-label="可拖动日程时间轴">
            <div className={styles.timelineHours} aria-hidden="true">
              {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '18:30'].map((time) => <span key={time}>{time}</span>)}
            </div>
            {blocks.map((block) => (
              <article
                key={block.id}
                className={`${styles.scheduleBlock} ${block.kind === 'break' ? styles.breakBlock : ''} ${draggedId === block.id ? styles.draggingBlock : ''}`}
                draggable={block.kind === 'task' && !block.locked}
                onDragStart={(event: DragEvent<HTMLElement>) => {
                  event.dataTransfer.effectAllowed = 'move'
                  setDraggedId(block.id)
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => dropBlock(block.id)}
              >
                <span className={styles.blockTime}>{block.time}</span>
                <strong>{block.title}</strong>
                {block.kind === 'task' ? (
                  <div className={styles.blockActions}>
                    <span><IconArrowsMove size={20} stroke={1.9} aria-hidden="true" />拖动</span>
                    <button type="button" aria-label={`${block.locked ? '解锁' : '锁定'}${block.title}`} onClick={() => toggleLock(block.id)}>
                      {block.locked ? <IconLock size={20} stroke={1.9} /> : <IconLockOpen size={20} stroke={1.9} />}{block.locked ? '已锁定' : '锁定'}
                    </button>
                    <button type="button" aria-label={`调整${block.title}时长`} onClick={() => adjustDuration(block.id)}>
                      <IconClock size={20} stroke={1.9} />调整时长
                    </button>
                  </div>
                ) : <span className={styles.breakLock}><IconLock size={20} stroke={1.9} aria-hidden="true" />锁定</span>}
              </article>
            ))}
            <div className={styles.finishEstimate}><IconCircleCheckFilled size={30} stroke={1.5} aria-hidden="true" />预计 18:10 完成，可准点下班</div>
          </section>

          <aside className={styles.commitmentPanel}>
            <h2>今日承诺任务 <span>{selectedCommitments.size}</span></h2>
            <div className={styles.commitmentList}>
              {COMMITMENT_TITLES.map((title) => (
                <label key={title}>
                  <input type="checkbox" checked={selectedCommitments.has(title)} onChange={() => toggleCommitment(title)} />
                  <span>{title}</span>
                </label>
              ))}
            </div>
            <hr />
            <h3>排不下的任务 <span>1</span></h3>
            <p className={styles.unscheduledTask}><IconClock size={24} stroke={1.9} aria-hidden="true" /><strong>准备周一例会</strong> · 还需 45分钟</p>
            <div className={styles.capacityWarning}><IconAlertTriangle size={22} stroke={1.9} aria-hidden="true" />今日容量不足，不会偷偷压缩时长。</div>
            <Button variant="primary" fullWidth onClick={onConfirm} disabled={selectedCommitments.size === 0}>确认今日安排</Button>
            <Button fullWidth onClick={onBack}>返回修改任务</Button>
            <Button fullWidth onClick={() => setBlocks(INITIAL_SCHEDULE_BLOCKS)}><IconRefresh size={20} stroke={1.9} aria-hidden="true" />重新生成</Button>
            <p className={styles.scheduleStatus} role="status">{status}</p>
          </aside>
        </div>
      </PixelSurface>
      <PetCompanion />
    </section>
  )
}

function ClockoutConfirmScreen({ completedCount, onClockout, onReturn, onAdjust }: { completedCount: number; onClockout: () => void; onReturn: () => void; onAdjust: () => void }) {
  const incomplete = ['问题修复与优化', '整理今日工作'].slice(0, Math.max(0, 5 - completedCount))

  return (
    <section className={styles.overlayStage} data-ui-screen="12-clockout-confirm" data-ui-state={`completed-${completedCount}`}>
      <PixelSurface className={styles.clockoutDialog} innerClassName={styles.clockoutDialogInner} ariaLabel="跑路确认">
        <h1>现在跑路？</h1>
        <p className={styles.clockoutTime}><IconClock size={26} stroke={1.9} aria-hidden="true" />18:27 · 距离下班 3分钟</p>
        <div className={styles.progressLabel}>承诺任务　{completedCount}/5</div>
        <ProgressSegments completed={completedCount} />
        <ul className={styles.incompleteTasks}>
          {incomplete.length > 0 ? incomplete.map((title) => <li key={title}>{title}</li>) : <li>今日承诺任务已全部完成</li>}
        </ul>
        <div className={styles.clockoutMessages}>
          <p className={styles.safeMessage}><IconCircleCheckFilled size={25} stroke={1.8} aria-hidden="true" />你仍然可以下班。</p>
          {incomplete.length > 0 ? <p className={styles.warningMessage}><IconAlertTriangle size={27} stroke={1.9} aria-hidden="true" />今天会记录为「任务未完成」，不会获得准点奖励。</p> : <p className={styles.safeMessage}><IconCheck size={25} stroke={2} aria-hidden="true" />任务已完成，可以获得准点奖励资格。</p>}
          <p><IconInfoCircle size={25} stroke={1.8} aria-hidden="true" />系统不会阻止你，也不会评价你。</p>
        </div>
        <div className={styles.clockoutButtons}>
          <Button variant="danger" onClick={onClockout}><IconRun size={24} stroke={2} aria-hidden="true" />照样跑路</Button>
          <Button variant="primary" onClick={onReturn}>回去完成</Button>
        </div>
        <button className={styles.adjustCommitment} type="button" onClick={onAdjust}>
          <IconSettings size={26} stroke={1.9} aria-hidden="true" />
          <span><strong>调整承诺任务</strong><small>需记录取消原因和资格影响</small></span>
          <IconChevronRight size={24} stroke={1.9} aria-hidden="true" />
        </button>
      </PixelSurface>
      <PetCompanion />
    </section>
  )
}

function SuccessScreen({ outcome, onFinish, onViewRecord }: { outcome: ClockoutOutcome; onFinish: () => void; onViewRecord: () => void }) {
  const won = outcome === 'WIN'

  return (
    <section className={styles.overlayStage} data-ui-screen="13-clockout-success" data-ui-state={outcome.toLowerCase()}>
      <PixelSurface className={styles.successDialog} innerClassName={styles.successDialogInner} ariaLabel="跑路结果">
        <div className={`${styles.successMark} ${won ? '' : styles.incompleteMark}`}>
          {won ? <IconSparkles className={styles.leftSuccessSparkle} size={28} stroke={1.8} aria-hidden="true" /> : null}
          {won ? <IconCircleCheckFilled size={84} stroke={1.4} aria-hidden="true" /> : <IconAlertCircle size={84} stroke={1.6} aria-hidden="true" />}
          {won ? <IconSparkles className={styles.rightSuccessSparkle} size={28} stroke={1.8} aria-hidden="true" /> : null}
        </div>
        <h1>{won ? '准点跑路成功' : '已经跑路'}</h1>
        <p className={styles.successTime}>18:28 · 提前 2分钟</p>
        <h2>{won ? '今天胜利' : '今天未胜利'}</h2>

        <div className={styles.resultRows}>
          <div><IconListCheck size={25} stroke={1.9} aria-hidden="true" /><span>承诺任务　{won ? '5/5' : '3/5'}</span><ProgressSegments completed={won ? 5 : 3} /></div>
          <div><IconFlag size={25} stroke={1.9} aria-hidden="true" /><span>今日获得窝囊费</span><strong>{won ? '+¥88.00' : '+¥52.80'}</strong></div>
          <div><IconClock size={25} stroke={1.9} aria-hidden="true" /><span>{won ? '准点奖池奖励：待 18:35 结算' : '准点奖池奖励：无资格'}</span></div>
          <div><IconUsers size={25} stroke={1.9} aria-hidden="true" /><span>好友将看到：<strong>{won ? '已跑路' : '已下班'}</strong></span><IconRun className={styles.resultRunIcon} size={34} stroke={2.2} aria-hidden="true" /></div>
        </div>

        <div className={styles.dayTimeline} aria-label="今日时间线">
          <span><strong>09:00</strong><small>上班</small></span>
          <span><strong>12:00</strong><small>午休</small></span>
          <span className={styles.timelineEnd}><strong>18:28</strong><small>跑路</small></span>
        </div>

        <div className={styles.successActions}>
          <Button variant="primary" onClick={onFinish}>收工</Button>
          <Button onClick={onViewRecord}>查看今天记录</Button>
        </div>
        <p className={styles.settlementHint}><IconSparkles size={21} stroke={1.8} aria-hidden="true" />{won ? '奖励结算完成后会静默入账。' : '明天仍然可以重新确认承诺。'}</p>
      </PixelSurface>
      <PetCompanion celebrate={won} />
    </section>
  )
}

export function TaskScheduleFlow({ initialScreen = '05-task-list', onScreenChange }: TaskScheduleFlowProps) {
  const [screen, setScreen] = useState<TaskScheduleScreen>(initialScreen)
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS)
  const [analysisTask, setAnalysisTask] = useState({
    title: '整理产品评审材料',
    dueAt: '2026-08-29T17:00',
    importance: 'HIGH' as Importance
  })
  const [completedCount, setCompletedCount] = useState(initialScreen === '13-clockout-success' ? 5 : 3)
  const [clockoutOutcome, setClockoutOutcome] = useState<ClockoutOutcome>(initialScreen === '13-clockout-success' ? 'WIN' : 'TASKS_INCOMPLETE')

  function navigate(nextScreen: TaskScheduleScreen): void {
    setScreen(nextScreen)
    onScreenChange?.(nextScreen)
  }

  function createTask(task: { title: string; dueAt: string; importance: Importance }): void {
    setAnalysisTask(task)
    setTasks((current) => [
      ...current,
      {
        id: `task-${current.length + 1}`,
        title: task.title,
        time: '待 AI 建议确认',
        urgencyLabel: '即将到期',
        urgency: 'upcoming',
        completed: false
      }
    ])
    navigate('06-ai-analysis')
  }

  if (screen === '01-task-bubble') {
    return <TaskBubbleScreen completedCount={completedCount} onComplete={() => setCompletedCount((current) => Math.min(5, current + 1))} onReschedule={() => navigate('07-schedule-draft')} onClockout={() => navigate('12-clockout-confirm')} />
  }

  if (screen === '06-ai-analysis') {
    return <AnalysisScreen taskTitle={analysisTask.title} dueAt={analysisTask.dueAt} importance={analysisTask.importance} onConfirm={() => navigate('07-schedule-draft')} onClose={() => navigate('05-task-list')} />
  }

  if (screen === '07-schedule-draft') {
    return <ScheduleScreen onConfirm={() => { setCompletedCount(3); navigate('01-task-bubble') }} onBack={() => navigate('05-task-list')} onClose={() => navigate('05-task-list')} />
  }

  if (screen === '12-clockout-confirm') {
    return <ClockoutConfirmScreen completedCount={completedCount} onClockout={() => { const outcome = completedCount === 5 ? 'WIN' : 'TASKS_INCOMPLETE'; setClockoutOutcome(outcome); navigate('13-clockout-success') }} onReturn={() => navigate('01-task-bubble')} onAdjust={() => navigate('07-schedule-draft')} />
  }

  if (screen === '13-clockout-success') {
    return <SuccessScreen outcome={clockoutOutcome} onFinish={() => navigate('05-task-list')} onViewRecord={() => navigate('01-task-bubble')} />
  }

  return <TaskListScreen tasks={tasks} onCreate={createTask} />
}
