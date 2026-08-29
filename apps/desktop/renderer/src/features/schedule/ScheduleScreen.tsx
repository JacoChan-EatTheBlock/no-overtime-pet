import { useState } from 'react'
import {
  IconArrowsMove,
  IconCalendarEvent,
  IconCheck,
  IconClock,
  IconLock,
  IconRefresh,
  IconSparkles,
  IconX
} from '@tabler/icons-react'
import { Button } from '../../components/Button'
import { PixelSurface } from '../../components/PixelSurface'
import { PixelWindowHeader } from '../../components/PixelWindowHeader'
import type { ScreenId } from '../../App'
import styles from './ScheduleScreen.module.css'

interface ScheduleBlock {
  id: string
  timeRange: string
  title: string
  isLunch?: boolean
  color: 'work' | 'lunch' | 'buffer'
}

interface ScheduleScreenProps {
  onClose: () => void
  onNavigate: (id: ScreenId) => void
}

const BLOCKS: ScheduleBlock[] = [
  { id: '1', timeRange: '09:00–10:20', title: '查收邮件与消息', color: 'work' },
  { id: '2', timeRange: '10:20–11:10', title: '整理产品评审材料', color: 'work' },
  { id: '3', timeRange: '11:10–12:00', title: '撰写需求文档', color: 'work' },
  { id: '4', timeRange: '12:00–13:00', title: '午休', isLunch: true, color: 'lunch' },
  { id: '5', timeRange: '13:00–15:00', title: '开发与自测', color: 'work' },
  { id: '6', timeRange: '15:00–16:30', title: '问题修复与优化', color: 'work' },
  { id: '7', timeRange: '16:30–18:10', title: '整理今日工作', color: 'work' },
]

const COMMITMENTS = [
  '查收邮件与消息',
  '整理产品评审材料',
  '撰写需求文档',
  '开发与自测',
  '问题修复与优化',
]

const OVERFLOW_TASKS = [
  { title: '准备周一例会', remaining: '还需 45分钟' },
]

const HOURS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '18:30']

const today = new Date()
const dateLabel = `${today.getMonth() + 1}月${today.getDate()}日`
const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

export function ScheduleScreen({ onClose, onNavigate }: ScheduleScreenProps) {
  return (
    <PixelSurface className={styles.window} innerClassName={styles.windowInner} ariaLabel="今日安排草案">
      <PixelWindowHeader />
      <div className={styles.content} data-ui-screen="07-schedule">
        {/* ─── Header ─── */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <IconCalendarEvent size={36} stroke={1.4} className={styles.headerIcon} />
            <div>
              <h1>今日安排草案</h1>
              <span className={styles.dateLabel}>{dateLabel} · {dayNames[today.getDay()]}</span>
            </div>
          </div>
          <span className={styles.aiNote}>
            <IconSparkles size={16} stroke={1.5} />
            AI 负责建议，最终安排由你确认。
          </span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="关闭">
            <IconX size={22} stroke={2} />
          </button>
        </header>

        <div className={styles.body}>
          {/* ─── Left: Timeline ─── */}
          <section className={styles.timeline}>
            <div className={styles.timelineGrid}>
              {/* Hour labels */}
              {HOURS.map((hour) => (
                <div key={hour} className={styles.hourLabel}>{hour}</div>
              ))}

              {/* Time blocks */}
              <div className={styles.blocks}>
                {BLOCKS.map((block) => (
                  <div
                    key={block.id}
                    className={`${styles.block} ${styles[block.color]}`}
                  >
                    <span className={styles.blockTime}>{block.timeRange}</span>
                    <span className={styles.blockTitle}>{block.title}</span>
                    {!block.isLunch && (
                      <div className={styles.blockActions}>
                        <button type="button" title="拖动"><IconArrowsMove size={14} stroke={1.8} /> 拖动</button>
                        <button type="button" title="锁定"><IconLock size={14} stroke={1.8} /> 锁定</button>
                        <button type="button" title="调整时长"><IconClock size={14} stroke={1.8} /> 调整时长</button>
                      </div>
                    )}
                    {block.isLunch && (
                      <div className={styles.blockActions}>
                        <button type="button" title="锁定"><IconLock size={14} stroke={1.8} /> 锁定</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Estimated finish */}
            <div className={styles.estimateBanner}>
              <IconCheck size={20} stroke={2} />
              预计 18:10 完成，可准点下班
            </div>
          </section>

          {/* ─── Right: Commitments ─── */}
          <aside className={styles.commitments}>
            <h3>
              今日承诺任务
              <span className={styles.commitBadge}>{COMMITMENTS.length}</span>
            </h3>
            <ul className={styles.commitList}>
              {COMMITMENTS.map((title) => (
                <li key={title}>
                  <IconCheck size={18} stroke={2.5} className={styles.checkIcon} />
                  {title}
                </li>
              ))}
            </ul>

            <h3>
              排不下的任务
              <span className={styles.overflowBadge}>{OVERFLOW_TASKS.length}</span>
            </h3>
            {OVERFLOW_TASKS.map((t) => (
              <div key={t.title} className={styles.overflowItem}>
                <IconClock size={18} stroke={1.5} />
                {t.title} · {t.remaining}
              </div>
            ))}
            <p className={styles.overflowWarning}>
              ⚠ 今日容量不足，不会偷偷压缩时长。
            </p>

            <Button variant="primary" fullWidth onClick={onClose}>
              确认今日安排
            </Button>
            <Button variant="secondary" fullWidth onClick={() => onNavigate('task-flow')}>
              返回修改任务
            </Button>
            <button type="button" className={styles.regenerateBtn}>
              <IconRefresh size={18} stroke={1.5} />
              重新生成
            </button>
          </aside>
        </div>

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
