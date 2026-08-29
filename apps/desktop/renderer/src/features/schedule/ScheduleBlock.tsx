import { IconLock, IconLockOpen } from '@tabler/icons-react'
import styles from './ScheduleScreen.module.css'

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}

export interface ScheduleBlockData {
  id: string
  startTime: string
  taskName: string
  durationMinutes: number
  isActive?: boolean
  isLocked?: boolean
  isBreak?: boolean
}

interface ScheduleBlockProps {
  block: ScheduleBlockData
  onToggleLock: (id: string) => void
}

export function ScheduleBlock({ block, onToggleLock }: ScheduleBlockProps) {
  return (
    <div
      className={joinClassNames(
        styles.block,
        block.isActive ? styles.blockActive : undefined,
        block.isLocked ? styles.blockLocked : undefined,
        block.isBreak ? styles.blockBreak : undefined
      )}
    >
      <span className={styles.timeLabel}>{block.startTime}</span>
      <span className={styles.timelineDot} />

      <div className={styles.blockContent}>
        <div className={styles.blockInfo}>
          <span className={styles.blockTaskName}>{block.taskName}</span>
          <span className={styles.blockDuration}>{block.durationMinutes} 分钟</span>
        </div>
        {!block.isBreak ? (
          <button
            type="button"
            className={joinClassNames(
              styles.lockButton,
              block.isLocked ? styles.locked : undefined
            )}
            aria-label={block.isLocked ? `解锁时间块：${block.taskName}` : `锁定时间块：${block.taskName}`}
            onClick={() => onToggleLock(block.id)}
          >
            {block.isLocked ? (
              <IconLock size={18} stroke={2} />
            ) : (
              <IconLockOpen size={18} stroke={2} />
            )}
          </button>
        ) : null}
      </div>
    </div>
  )
}
