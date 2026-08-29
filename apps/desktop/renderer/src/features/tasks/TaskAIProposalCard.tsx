import { useState } from 'react'
import {
  IconBrain,
  IconCalendarDue,
  IconCategory,
  IconClock,
  IconFlag,
  IconInfoCircle,
  IconRefresh,
  IconSparkles,
  IconSubtask,
  IconX
} from '@tabler/icons-react'
import { Button } from '../../components/Button'
import { PixelSurface } from '../../components/PixelSurface'
import type { TaskItem } from './TaskListScreen'
import styles from './TaskAIProposalCard.module.css'

interface ProposalField {
  id: string
  label: string
  value: string
  range?: string
  icon: typeof IconCategory
  adopted: boolean
}

interface SubTask {
  id: number
  title: string
  duration: string
  adopted: boolean
}

interface TaskAIProposalScreenProps {
  task: TaskItem | null
  onClose: () => void
  onConfirm: () => void
}

export type { TaskAIProposalScreenProps as AIProposal }

export function TaskAIProposalScreen({ task, onClose, onConfirm }: TaskAIProposalScreenProps) {
  const [fields, setFields] = useState<ProposalField[]>([
    { id: 'category', label: '任务类型', value: '文档与评审', icon: IconCategory, adopted: true },
    { id: 'duration', label: '预计时长', value: '50分钟', range: '40–70分钟', icon: IconClock, adopted: true },
    { id: 'cognitive', label: '认知负荷', value: '中', icon: IconBrain, adopted: true },
    { id: 'splittable', label: '可拆分性', value: '可拆分', icon: IconSubtask, adopted: true },
  ])

  const [subtasks, setSubtasks] = useState<SubTask[]>([
    { id: 1, title: '整理反馈', duration: '15分钟', adopted: true },
    { id: 2, title: '合并修改', duration: '25分钟', adopted: true },
    { id: 3, title: '最终检查', duration: '10分钟', adopted: true },
  ])

  function toggleField(fieldId: string): void {
    setFields((prev) => prev.map((f) => f.id === fieldId ? { ...f, adopted: !f.adopted } : f))
  }

  function toggleSubtask(taskId: number): void {
    setSubtasks((prev) => prev.map((s) => s.id === taskId ? { ...s, adopted: !s.adopted } : s))
  }

  const taskTitle = task?.title ?? '整理产品评审材料'

  return (
    <PixelSurface className={styles.window} innerClassName={styles.windowInner} ariaLabel="AI 分析建议">
      <div className={styles.content} data-ui-screen="06-ai-proposal">
        {/* ─── Header ─── */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.aiIcon}>
              <IconSparkles size={20} stroke={2} />
            </div>
            <div>
              <h1>AI 分析建议</h1>
              <p>这是建议，确认后才会写入任务。</p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="关闭">
            <IconX size={22} stroke={2} />
          </button>
        </header>

        {/* ─── Task info ─── */}
        <section className={styles.taskInfo}>
          <div className={styles.taskTitleRow}>
            <IconCategory size={22} stroke={1.5} />
            <h2>{taskTitle}</h2>
            <span className={styles.proposalBadge}>建议</span>
          </div>

          <p className={styles.sectionLabel}>你填写的</p>
          <div className={styles.userFields}>
            <span><IconCalendarDue size={18} stroke={1.5} /> DDL  8月29日 17:00</span>
            <span><IconFlag size={18} stroke={1.5} /> 重要性  高</span>
          </div>
        </section>

        {/* ─── AI suggestion fields ─── */}
        <section className={styles.aiSection}>
          <h3 className={styles.aiSectionTitle}>AI 分析建议（不会修改你的设置）</h3>

          <div className={styles.fieldList}>
            {fields.map((field) => (
              <div key={field.id} className={styles.fieldRow}>
                <span className={styles.fieldIcon}><field.icon size={20} stroke={1.5} /></span>
                <span className={styles.fieldLabel}>{field.label}</span>
                <span className={styles.fieldValue}>
                  {field.value}
                  {field.range && <span className={styles.fieldRange}>{field.range}</span>}
                </span>
                <div className={styles.fieldActions}>
                  <Button
                    variant={field.adopted ? 'primary' : 'secondary'}
                    className={styles.adoptBtn}
                    onClick={() => toggleField(field.id)}
                  >
                    采用
                  </Button>
                  <Button variant="secondary" className={styles.modifyBtn}>
                    修改
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <p className={styles.referenceNote}>
            <IconInfoCircle size={16} stroke={1.5} />
            参考了 4 个相似任务；你的历史速度比目录基线快约 12%。
            <span className={styles.confidence}>置信度 中</span>
          </p>
        </section>

        {/* ─── Subtasks ─── */}
        <section className={styles.subtaskSection}>
          <h3>建议的子任务（可选）</h3>
          <div className={styles.subtaskList}>
            {subtasks.map((st) => (
              <div key={st.id} className={styles.subtaskRow}>
                <span className={styles.subtaskNum}>{st.id}</span>
                <span className={styles.subtaskTitle}>{st.title}</span>
                <span className={styles.subtaskDuration}>{st.duration}</span>
                <Button
                  variant={st.adopted ? 'primary' : 'secondary'}
                  className={styles.adoptBtn}
                  onClick={() => toggleSubtask(st.id)}
                >
                  采用
                </Button>
                <Button variant="secondary" className={styles.modifyBtn}>修改</Button>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Footer actions ─── */}
        <footer className={styles.footer}>
          <button type="button" className={styles.ghostAction}>
            <IconRefresh size={18} stroke={1.5} />
            重新分析
          </button>
          <Button variant="secondary" onClick={onClose}>全部拒绝</Button>
          <Button variant="primary" onClick={onConfirm}>确认建议</Button>
        </footer>

        {/* Capybara */}
        <img
          className={`${styles.petCharacter} pixel-art`}
          src="/assets/capybara/idle.png"
          alt=""
        />
      </div>
    </PixelSurface>
  )
}
