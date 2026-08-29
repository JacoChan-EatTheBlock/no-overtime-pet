import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  IconAlertCircle,
  IconCalendarDue,
  IconCheck,
  IconCirclePlus,
  IconClock,
  IconFlag,
  IconLoader2,
  IconTrash,
} from '@tabler/icons-react'
import { Button } from '../../components/Button'
import { createTask, listTasks, completeTask, deleteTask } from '../../api/tasks'
import type { Task } from '../../api/types'
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
  done?: boolean
  dueAt?: string
  revision?: number
}

type FilterTab = 'all' | 'today' | 'done'

const URGENCY_COLORS: Record<TaskUrgency, string> = {
  '紧急': styles.urgencyUrgent,
  '即将到期': styles.urgencyApproaching,
  '不紧急': styles.urgencyNormal,
}

// ---------------------------------------------------------------------------
// Helpers: API Task → UI TaskItem
// ---------------------------------------------------------------------------

function importanceToUrgency(importance?: string): TaskUrgency {
  switch (importance) {
    case 'HIGH': return '紧急'
    case 'MEDIUM': return '即将到期'
    default: return '不紧急'
  }
}

function importanceToPriority(importance?: string): TaskPriority {
  switch (importance) {
    case 'HIGH': return 'HIGH'
    case 'MEDIUM': return 'MEDIUM'
    default: return 'LOW'
  }
}

function formatTimeRange(dueAt?: string): string {
  if (!dueAt) return ''
  try {
    const d = new Date(dueAt)
    if (Number.isNaN(d.getTime())) return ''
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `截止 ${hh}:${mm}`
  } catch {
    return ''
  }
}

function mapTaskToItem(task: Task): TaskItem {
  return {
    id: task.id,
    title: task.title,
    timeRange: formatTimeRange(task.dueAt ?? undefined),
    urgency: importanceToUrgency(task.importance),
    priority: importanceToPriority(task.importance),
    done: task.status === 'COMPLETED',
    dueAt: task.dueAt ?? undefined,
    revision: task.revision,
  }
}

// ---------------------------------------------------------------------------

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
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Create form state
  const [newTitle, setNewTitle] = useState('')
  const [newDeadline, setNewDeadline] = useState('')
  const [newPriority, setNewPriority] = useState<TaskPriority>('HIGH')
  const [creating, setCreating] = useState(false)

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])

  // ---------------------------------------------------------------------------
  // Load tasks from API
  // ---------------------------------------------------------------------------
  const fetchTasks = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      // Fetch both PENDING and COMPLETED for client-side filtering
      const [pending, completed] = await Promise.all([
        listTasks('PENDING'),
        listTasks('COMPLETED'),
      ])
      const allTasks = [...pending, ...completed].map(mapTaskToItem)
      setTasks(allTasks)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载任务失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // ---------------------------------------------------------------------------
  // Filter & counts (dynamic)
  // ---------------------------------------------------------------------------
  const filteredTasks = useMemo(() => {
    switch (filter) {
      case 'today':
        return tasks.filter((t) => !t.done && t.dueAt?.slice(0, 10) === todayStr)
      case 'done':
        return tasks.filter((t) => t.done)
      case 'all':
      default:
        return tasks.filter((t) => !t.done)
    }
  }, [tasks, filter, todayStr])

  const counts = useMemo(() => ({
    all: tasks.filter((t) => !t.done).length,
    today: tasks.filter((t) => !t.done && t.dueAt?.slice(0, 10) === todayStr).length,
    done: tasks.filter((t) => t.done).length,
  }), [tasks, todayStr])

  // ---------------------------------------------------------------------------
  // Create task → API
  // ---------------------------------------------------------------------------
  async function handleCreateSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!newTitle.trim() || creating) return

    try {
      setCreating(true)
      setActionError(null)
      const created = await createTask({
        title: newTitle.trim(),
        dueAt: newDeadline ? new Date(newDeadline).toISOString() : undefined,
        importance: newPriority,
      })
      const newItem = mapTaskToItem(created)
      setTasks((prev) => [newItem, ...prev])
      // Reset form
      setNewTitle('')
      setNewDeadline('')
      setNewPriority('HIGH')
      // Navigate to AI analysis
      onAIAnalysis(newItem)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '创建任务失败')
    } finally {
      setCreating(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Complete task → API (optimistic)
  // ---------------------------------------------------------------------------
  async function handleComplete(taskId: string): Promise<void> {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, done: true } : t))
    try {
      setActionError(null)
      const idempotencyKey = `complete-${taskId}-${Date.now()}`
      await completeTask(taskId, idempotencyKey)
    } catch (err) {
      // Revert on failure
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, done: false } : t))
      setActionError(err instanceof Error ? err.message : '完成任务失败')
    }
  }

  // ---------------------------------------------------------------------------
  // Delete task → API (optimistic)
  // ---------------------------------------------------------------------------
  async function handleDelete(taskId: string): Promise<void> {
    const snapshot = tasks
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    try {
      setActionError(null)
      await deleteTask(taskId)
    } catch (err) {
      // Revert on failure
      setTasks(snapshot)
      setActionError(err instanceof Error ? err.message : '删除任务失败')
    }
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

          {/* Loading state */}
          {loading && (
            <div className={styles.statusMessage}>
              <IconLoader2 size={24} stroke={1.5} className={styles.spinner} />
              <span>加载中…</span>
            </div>
          )}

          {/* Error state */}
          {(error || actionError) && (
            <div className={styles.errorMessage} role="alert">
              <IconAlertCircle size={18} stroke={1.5} />
              <span>{error || actionError}</span>
              {error && (
                <button type="button" onClick={fetchTasks} className={styles.retryButton}>
                  重试
                </button>
              )}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filteredTasks.length === 0 && (
            <div className={styles.statusMessage}>
              <span>{filter === 'done' ? '还没有已完成的任务' : '没有待办任务 🎉'}</span>
            </div>
          )}

          <ul className={styles.taskList}>
            {filteredTasks.map((task) => (
              <li key={task.id} className={`${styles.taskItem} ${task.done ? styles.taskDone : ''}`}>
                {/* Complete button (only for pending tasks) */}
                {!task.done && (
                  <button
                    type="button"
                    className={styles.completeBtn}
                    aria-label={`完成任务: ${task.title}`}
                    onClick={() => handleComplete(task.id)}
                  >
                    <IconCheck size={14} stroke={2.5} />
                  </button>
                )}
                {task.done && <span className={styles.doneMark}>✓</span>}
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
                {/* Delete button */}
                <button
                  type="button"
                  className={styles.deleteBtn}
                  aria-label={`删除任务: ${task.title}`}
                  onClick={() => handleDelete(task.id)}
                >
                  <IconTrash size={15} stroke={1.5} />
                </button>
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
                  disabled={creating}
                />
              </label>

              <label className={styles.formLabel}>
                DDL <span className={styles.required}>*</span>
                <div className={styles.dateInput}>
                  <IconCalendarDue size={20} stroke={1.5} />
                  <input
                    type="datetime-local"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    disabled={creating}
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
                    disabled={creating}
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

              <Button variant="primary" fullWidth type="submit" disabled={creating}>
                {creating ? '创建中…' : '创建并进入 AI 分析'}
              </Button>
              <Button variant="secondary" fullWidth onClick={onClose} disabled={creating}>
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
