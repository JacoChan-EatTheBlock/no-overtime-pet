import React, { useState } from 'react'
import {
  IconArrowsMove,
  IconClock,
  IconLock,
  IconMinus,
  IconPlus,
} from '@tabler/icons-react'
import styles from './ScheduleScreen.module.css'

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}

export type BlockStatus = 'completed' | 'active' | 'pending'
export type BlockColor = 'work' | 'lunch' | 'wrapup' | 'buffer'

export interface ScheduleBlockData {
  id: string
  timeRange: string
  title: string
  durationMinutes: number
  status: BlockStatus
  isLocked: boolean
  isBreak?: boolean
  color: BlockColor
}

interface ScheduleBlockProps {
  block: ScheduleBlockData
  onToggleLock: (id: string) => void
  onAdjustDuration: (id: string, newMinutes: number) => void
  onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop: (e: React.DragEvent<HTMLDivElement>, targetId: string) => void
}

export function ScheduleBlock({ block, onToggleLock, onAdjustDuration, onDragStart, onDragOver, onDrop }: ScheduleBlockProps) {
  const [showDuration, setShowDuration] = useState(false)

  const statusClass =
    block.status === 'completed'
      ? styles.blockCompleted
      : block.status === 'active'
        ? styles.blockActive
        : undefined

  const canDrag = !block.isLocked && !block.isBreak

  return (
    <div
      className={joinClassNames(
        styles.block,
        styles[block.color],
        statusClass,
        block.isLocked ? styles.blockLocked : undefined,
      )}
      draggable={canDrag}
      onDragStart={canDrag ? (e) => onDragStart(e, block.id) : undefined}
      onDragOver={(e) => onDragOver(e)}
      onDrop={(e) => onDrop(e, block.id)}
    >
      {canDrag && (
        <span className={styles.dragHandle} title="拖拽排序">
          <IconArrowsMove size={16} stroke={1.8} />
        </span>
      )}

      <span className={styles.blockTime}>{block.timeRange}</span>
      <span className={styles.blockTitle}>{block.title}</span>

      <div className={styles.blockActions}>
        <button
          type="button"
          className={joinClassNames(
            styles.actionBtn,
            block.isLocked ? styles.actionBtnActive : undefined,
          )}
          title={block.isLocked ? '解锁' : '锁定'}
          onClick={() => onToggleLock(block.id)}
        >
          <IconLock size={14} stroke={1.8} />
          <span>锁定</span>
        </button>
        {!block.isBreak && (
          <button
            type="button"
            className={joinClassNames(styles.actionBtn, showDuration ? styles.actionBtnActive : undefined)}
            title="调整时长"
            onClick={() => setShowDuration((v) => !v)}
          >
            <IconClock size={14} stroke={1.8} />
            <span>调整时长</span>
          </button>
        )}
      </div>

      {showDuration && !block.isBreak && (
        <div className={styles.durationPicker}>
          <button
            type="button"
            className={styles.durationBtn}
            onClick={() => onAdjustDuration(block.id, block.durationMinutes - 10)}
            disabled={block.durationMinutes <= 10}
          >
            <IconMinus size={14} stroke={2} />
          </button>
          <span className={styles.durationValue}>{block.durationMinutes} 分钟</span>
          <button
            type="button"
            className={styles.durationBtn}
            onClick={() => onAdjustDuration(block.id, block.durationMinutes + 10)}
          >
            <IconPlus size={14} stroke={2} />
          </button>
        </div>
      )}
    </div>
  )
}
