import React, { useEffect, useState } from 'react'
import {
  IconCalendarEvent,
  IconCheck,
  IconClock,
  IconRefresh,
  IconSparkles,
  IconX,
} from '@tabler/icons-react'
import { Button } from '../../components/Button'
import { PixelSurface } from '../../components/PixelSurface'
import { usePersistedState } from '../../lib/storage'
import { PixelWindowHeader } from '../../components/PixelWindowHeader'
import type { ScreenId } from '../../App'
import { ScheduleBlock } from './ScheduleBlock'
import type { ScheduleBlockData } from './ScheduleBlock'
import { NangFeeDisplay } from './NangFeeDisplay'
import styles from './ScheduleScreen.module.css'

interface ScheduleScreenProps {
  onClose: () => void
  onNavigate: (id: ScreenId) => void
}

const INITIAL_BLOCKS: ScheduleBlockData[] = [
  { id: '1', timeRange: '09:00–10:20', title: '查收邮件与消息', durationMinutes: 80, status: 'pending', isLocked: false, color: 'work' },
  { id: '2', timeRange: '10:20–11:10', title: '整理产品评审材料', durationMinutes: 50, status: 'pending', isLocked: false, color: 'work' },
  { id: '3', timeRange: '11:10–12:00', title: '撰写需求文档', durationMinutes: 50, status: 'pending', isLocked: false, color: 'work' },
  { id: '4', timeRange: '12:00–13:00', title: '午休', durationMinutes: 60, status: 'pending', isLocked: true, isBreak: true, color: 'lunch' },
  { id: '5', timeRange: '13:00–15:00', title: '开发与自测', durationMinutes: 120, status: 'pending', isLocked: false, color: 'work' },
  { id: '6', timeRange: '15:00–16:30', title: '问题修复与优化', durationMinutes: 90, status: 'pending', isLocked: false, color: 'work' },
  { id: '7', timeRange: '16:30–18:10', title: '整理今日工作', durationMinutes: 100, status: 'pending', isLocked: false, color: 'wrapup' },
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

const DAILY_SALARY = 500
const STANDARD_HOURS = 8
const HOURLY_RATE = DAILY_SALARY / STANDARD_HOURS

function recalcTimeRanges(blocks: ScheduleBlockData[]): ScheduleBlockData[] {
  let currentMinutes = 9 * 60
  return blocks.map((b) => {
    const startH = Math.floor(currentMinutes / 60)
    const startM = currentMinutes % 60
    const endMinutes = currentMinutes + b.durationMinutes
    const endH = Math.floor(endMinutes / 60)
    const endM = endMinutes % 60
    const fmt = (h: number, m: number) =>
      `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    currentMinutes = endMinutes
    return { ...b, timeRange: `${fmt(startH, startM)}–${fmt(endH, endM)}` }
  })
}

const today = new Date()
const dateLabel = `${today.getMonth() + 1}月${today.getDate()}日`
const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

export function ScheduleScreen({ onClose, onNavigate }: ScheduleScreenProps) {
  const [blocks, setBlocks] = usePersistedState<ScheduleBlockData[]>('schedule:blocks', INITIAL_BLOCKS)
  const [nangFee, setNangFee] = useState(0)

  /* ── 窝囊费实时计算 ── */
  useEffect(() => {
    const workMinutes = blocks
      .filter((b) => !b.isBreak)
      .reduce((sum, b) => sum + b.durationMinutes, 0)
    const overtimeMinutes = Math.max(0, workMinutes - STANDARD_HOURS * 60)
    const totalFee = (overtimeMinutes / 60) * HOURLY_RATE
    if (totalFee <= 0) { setNangFee(0); return undefined }
    let accumulated = 0
    const step = totalFee / overtimeMinutes
    const timer = window.setInterval(() => {
      accumulated += step
      if (accumulated >= totalFee) {
        setNangFee(Math.round(totalFee * 100) / 100)
        window.clearInterval(timer)
      } else {
        setNangFee(Math.round(accumulated * 100) / 100)
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [blocks])

  /* ── 拖拽排序 ── */
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.setData('blockId', id)
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault()
    const srcId = e.dataTransfer.getData('blockId')
    if (!srcId || srcId === targetId) return
    setBlocks((prev) => {
      const srcIdx = prev.findIndex((b) => b.id === srcId)
      const tgtIdx = prev.findIndex((b) => b.id === targetId)
      if (srcIdx < 0 || tgtIdx < 0) return prev
      if (prev[srcIdx].isLocked || prev[tgtIdx].isLocked) return prev
      const updated = [...prev]
      const [moved] = updated.splice(srcIdx, 1)
      updated.splice(tgtIdx, 0, moved)
      return recalcTimeRanges(updated)
    })
  }

  /* ── 时长调整 ── */
  const handleAdjustDuration = (id: string, newMinutes: number) => {
    setBlocks((prev) =>
      recalcTimeRanges(prev.map((b) => b.id === id ? { ...b, durationMinutes: Math.max(10, newMinutes) } : b))
    )
  }

  /* ── 重新生成 ── */
  const handleRegenerate = () => {
    setBlocks((prev) => {
      const unlocked = prev.filter((b) => !b.isLocked)
      for (let i = unlocked.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[unlocked[i], unlocked[j]] = [unlocked[j], unlocked[i]]
      }
      const result: ScheduleBlockData[] = []
      let ui = 0
      for (let i = 0; i < prev.length; i++) {
        if (prev[i].isLocked) result.push(prev[i])
        else result.push(unlocked[ui++])
      }
      return recalcTimeRanges(result)
    })
  }

  const handleToggleLock = (id: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isLocked: !b.isLocked } : b))
    )
  }

  const totalScheduleMin = blocks.reduce((sum, b) => sum + b.durationMinutes, 0)
  const finishTotalMin = 9 * 60 + totalScheduleMin
  const finishTime = `${String(Math.floor(finishTotalMin / 60)).padStart(2, '0')}:${String(finishTotalMin % 60).padStart(2, '0')}`
  const isOnTime = finishTotalMin <= 18 * 60

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
              {/* Hour markers column */}
              <div className={styles.hourColumn}>
                {HOURS.map((hour) => (
                  <div key={hour} className={styles.hourRow}>
                    <span className={styles.hourLabel}>{hour}</span>
                    <span className={styles.hourDot} />
                  </div>
                ))}
              </div>

              {/* Schedule blocks */}
              <div className={styles.blocks}>
                {blocks.map((block) => (
                  <ScheduleBlock
                    key={block.id}
                    block={block}
                    onToggleLock={handleToggleLock}
                    onAdjustDuration={handleAdjustDuration}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  />
                ))}
              </div>
            </div>

            {/* Estimated finish */}
            <div className={styles.estimateBanner}>
              <IconCheck size={20} stroke={2} />
              预计 {finishTime} 完成{isOnTime ? '，可准点下班' : ''}
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

            <NangFeeDisplay amount={nangFee} />

            <Button variant="primary" fullWidth onClick={onClose}>
              确认今日安排
            </Button>
            <Button variant="secondary" fullWidth onClick={() => onNavigate('task-flow')}>
              返回修改任务
            </Button>
            <button type="button" className={styles.regenerateBtn} onClick={handleRegenerate}>
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
