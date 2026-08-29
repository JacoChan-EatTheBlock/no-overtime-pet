import { useState, type FormEvent } from 'react'
import { IconChevronLeft } from '@tabler/icons-react'
import { Button } from '../../components/Button'
import type { TaskPriority } from './TaskListScreen'
import styles from './TaskCreateForm.module.css'

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}

export interface TaskCreateData {
  title: string
  deadline: string
  priority: TaskPriority
}

interface TaskCreateFormProps {
  onBack: () => void
  onSubmit: (data: TaskCreateData) => void
}

const PRIORITY_OPTIONS: Array<{ value: TaskPriority; label: string; className: string }> = [
  { value: 'LOW', label: '低', className: styles.priorityLow },
  { value: 'MEDIUM', label: '中', className: styles.priorityMedium },
  { value: 'HIGH', label: '高', className: styles.priorityHigh }
]

export function TaskCreateForm({ onBack, onSubmit }: TaskCreateFormProps) {
  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM')
  const [statusMessage, setStatusMessage] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (!title.trim()) {
      setStatusMessage('请输入任务标题')
      return
    }

    setStatusMessage('')
    onSubmit({ title: title.trim(), deadline, priority })
  }

  return (
    <div className={styles.stage} data-ui-screen="tasks-create">
      <div className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          aria-label="返回任务列表"
          onClick={onBack}
        >
          <IconChevronLeft size={24} stroke={2} />
        </button>
        <h1>新建任务</h1>
      </div>

      <div className={styles.formArea}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="task-title">
              任务标题
            </label>
            <input
              id="task-title"
              className={styles.textInput}
              type="text"
              placeholder="输入任务标题…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="task-deadline">
              截止时间
            </label>
            <input
              id="task-deadline"
              className={styles.dateInput}
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>重要性</span>
            <div className={styles.priorityGroup} role="radiogroup" aria-label="任务重要性">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={priority === opt.value}
                  className={joinClassNames(
                    styles.priorityOption,
                    opt.className,
                    priority === opt.value ? styles.selected : undefined
                  )}
                  onClick={() => setPriority(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <p className={styles.status} role="status">
            {statusMessage}
          </p>

          <div className={styles.actions}>
            <Button onClick={onBack}>取消</Button>
            <Button
              variant="primary"
              type="submit"
              fullWidth
              className={styles.submitButton}
            >
              确认建议
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
