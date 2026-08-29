import { useState, type FormEvent } from 'react'
import {
  IconCalendarDue,
  IconChevronLeft,
  IconCirclePlus,
  IconFlag,
  IconSparkles,
} from '@tabler/icons-react'
import { Button } from '../../components/Button'
import type { TaskPriority } from './TaskListScreen'
import styles from './TaskCreateForm.module.css'

export interface TaskCreateData {
  title: string
  deadline: string
  priority: TaskPriority
}

interface TaskCreateFormProps {
  onBack: () => void
  onSubmit: (data: TaskCreateData) => void
}

const today = new Date()

export function TaskCreateForm({ onBack, onSubmit }: TaskCreateFormProps) {
  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('HIGH')
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
        <IconCirclePlus size={22} stroke={1.6} />
        <h1>新增待办</h1>
      </div>

      <div className={styles.formArea}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="task-title">
              要做什么 <span className={styles.required}>*</span>
            </label>
            <input
              id="task-title"
              className={styles.textInput}
              type="text"
              placeholder="梳理上线风险"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="task-deadline">
              DDL <span className={styles.required}>*</span>
            </label>
            <div className={styles.selectInput}>
              <IconCalendarDue size={20} stroke={1.5} />
              <input
                id="task-deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="task-priority">
              重要性 <span className={styles.required}>*</span>
            </label>
            <div className={styles.selectInput}>
              <IconFlag size={20} stroke={1.5} />
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                <option value="HIGH">高</option>
                <option value="MEDIUM">中</option>
                <option value="LOW">低</option>
              </select>
            </div>
          </div>

          <p className={styles.status} role="status">
            {statusMessage}
          </p>

          <p className={styles.aiHint}>
            <IconSparkles size={16} stroke={1.5} />
            创建后将直接进入 AI 建议确认
          </p>

          <div className={styles.actions}>
            <Button
              variant="primary"
              type="submit"
              fullWidth
              className={styles.submitButton}
            >
              创建并进入 AI 分析
            </Button>
            <Button variant="secondary" fullWidth onClick={onBack}>
              取消
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
