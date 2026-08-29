import { useMemo, useState, type FormEvent } from 'react'
import {
  IconAlertCircle,
  IconCalendarDue,
  IconCirclePlus,
  IconClock,
  IconFlag
} from '@tabler/icons-react'
import { Button } from '../../components/Button'
import { PixelSurface } from '../../components/PixelSurface'
import { PixelWindowHeader } from '../../components/PixelWindowHeader'
import type { ScreenId } from '../../App'
import styles from './TaskListScreen.module.css'

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'
export type TaskUrgency = '紧急' | '即将到期' | '不紧急'

export interface TaskItem {
  id: string
  title: string
  timeRange: string
  urgency: TaskUrgency
  priority: TaskPriority
}

type FilterTab = 'all' | 'today' | 'done'

const URGENCY_COLORS: Record<TaskUrgency, string> = {
  '紧急': styles.urgencyUrgent,
  '即将到期': styles.urgencyApproaching,
  '不紧急': styles.urgencyNormal,
}

const MOCK_TASKS: TaskItem[] = [
  { id: '1', title: '整理产品评审材料', timeRange: '10:20 – 11:10', urgency: '紧急', priority: 'HIGH' },
  { id: '2', title: '撰写需求文档', timeRange: '11:10 – 12:10', urgency: '即将到期', priority: 'HIGH' },
  { id: '3', title: '回复客户邮件', timeRange: '14:00 – 14:30', urgency: '不紧急', priority: 'MEDIUM' },
  { id: '4', title: '准备周一例会', timeRange: '15:00 – 16:00', urgency: '不紧急', priority: 'MEDIUM' },
  { id: '5', title: '更新项目排期', timeRange: '16:30 – 17:30', urgency: '不紧急', priority: 'LOW' },
]

interface TaskListScreenProps {
  onClose: () => void
  onNavigate: (id: ScreenId) => void
  onAIAnalysis: (task: TaskItem) => void
}

const today = new Date()
const dateLabel = `${today.getMonth() + 1}月${today.getDate()}日`
const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const dayLabel = dayNames[today.getDay()]

export function TaskListScreen({ onClose, onNavigate, onAIAnalysis }: TaskListScreenProps) {
  const [filter, setFilter] = useState<FilterTab>('all')
  const [tasks] = useState(MOCK_TASKS)

  // Create form state
  const [newTitle, setNewTitle] = useState('')
  const [newDeadline, setNewDeadline] = useState('')
  const [newPriority, setNewPriority] = useState<TaskPriority>('HIGH')

  const counts = useMemo(() => ({
    all: tasks.length,
    today: tasks.length,
    done: 2,
  }), [tasks])

  function handleCreateSubmit(e: FormEvent): void {
    e.preventDefault()
    if (!newTitle.trim()) return
    const newTask: TaskItem = {
      id: String(Date.now()),
      title: newTitle,
      timeRange: '',
      urgency: '不紧急',
      priority: newPriority,
    }
    onAIAnalysis(newTask)
  }

  return (
    <PixelSurface className={styles.window} innerClassName={styles.windowInner} ariaLabel="今天的待办">
      <PixelWindowHeader />
      <div className={styles.content}>
        {/* ─── Left: Task list ─── */}
        <section className={styles.listColumn}>
          <header className={styles.listHeader}>
            <div className={styles.listTitle}>
              <IconCalendarDue size={32} stroke={1.5} className={styles.titleIcon} />
              <div>
                <h1>今天的待办</h1>
                <span className={styles.dateLabel}>{dateLabel} · {dayLabel}</span>
              </div>
            </div>
          </header>

          <nav className={styles.filterTabs} role="tablist" aria-label="任务筛选">
            {(['all', 'today', 'done'] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={filter === tab}
                className={filter === tab ? styles.activeFilterTab : undefined}
                onClick={() => setFilter(tab)}
              >
                {tab === 'all' ? '全部' : tab === 'today' ? '今天' : '已完成'}
                <span className={styles.tabCount}>
                  {tab === 'all' ? counts.all : tab === 'today' ? counts.today : counts.done}
                </span>
              </button>
            ))}
          </nav>

          <ul className={styles.taskList}>
            {tasks.map((task) => (
              <li key={task.id} className={styles.taskItem}>
                <span className={styles.taskIcon}>
                  {task.urgency === '紧急' ? (
                    <IconAlertCircle size={22} stroke={2} className={styles.iconUrgent} />
                  ) : (
                    <IconClock size={22} stroke={1.5} className={styles.iconNormal} />
                  )}
                </span>
                <div className={styles.taskInfo}>
                  <strong>{task.title}</strong>
                  <span className={styles.taskTime}>{task.timeRange}</span>
                </div>
                <span className={`${styles.urgencyBadge} ${URGENCY_COLORS[task.urgency]}`}>
                  {task.urgency}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ─── Right: Create form ─── */}
        <aside className={styles.createColumn}>
          <div className={styles.createPanel}>
            <header className={styles.createHeader}>
              <IconCirclePlus size={22} stroke={1.6} />
              <h2>新增待办</h2>
            </header>

            <form className={styles.createForm} onSubmit={handleCreateSubmit}>
              <label className={styles.formLabel}>
                要做什么 <span className={styles.required}>*</span>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="梳理上线风险"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </label>

              <label className={styles.formLabel}>
                DDL <span className={styles.required}>*</span>
                <div className={styles.dateInput}>
                  <IconCalendarDue size={20} stroke={1.5} />
                  <input
                    type="text"
                    placeholder={`${today.getMonth() + 1}月${today.getDate()}日 17:30`}
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                  />
                </div>
              </label>

              <label className={styles.formLabel}>
                重要性 <span className={styles.required}>*</span>
                <div className={styles.prioritySelect}>
                  <IconFlag size={20} stroke={1.5} />
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                  >
                    <option value="HIGH">高</option>
                    <option value="MEDIUM">中</option>
                    <option value="LOW">低</option>
                  </select>
                </div>
              </label>

              <p className={styles.aiHint}>
                创建后将直接进入 AI 建议确认
              </p>

              <Button variant="primary" fullWidth type="submit">
                创建并进入 AI 分析
              </Button>
              <Button variant="secondary" fullWidth onClick={onClose}>
                取消
              </Button>
            </form>
          </div>

          {/* Capybara in bottom-right */}
          <img
            className={`${styles.petCharacter} pixel-art`}
            src="/assets/capybara/idle.png"
            alt="坐在电脑前工作的像素水豚"
          />
        </aside>
      </div>
    </PixelSurface>
  )
}
