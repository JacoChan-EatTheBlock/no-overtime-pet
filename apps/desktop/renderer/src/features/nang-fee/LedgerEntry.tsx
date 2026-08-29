import {
  IconBriefcase,
  IconClock,
  IconTrophy,
  IconShoppingCart
} from '@tabler/icons-react'
import type { LedgerRecord, LedgerType } from '../economy/types'
import styles from './NangFeeScreen.module.css'

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}

const TYPE_CONFIG: Record<
  LedgerType,
  { icon: typeof IconBriefcase; label: string; iconClass: string }
> = {
  'work-income': {
    icon: IconBriefcase,
    label: '工作收入',
    iconClass: styles.entryIconIncome
  },
  'overtime-deduction': {
    icon: IconClock,
    label: '加班扣除',
    iconClass: styles.entryIconDeduction
  },
  'on-time-bonus': {
    icon: IconTrophy,
    label: '准点奖励',
    iconClass: styles.entryIconBonus
  },
  purchase: {
    icon: IconShoppingCart,
    label: '购买支出',
    iconClass: styles.entryIconPurchase
  }
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

interface LedgerEntryProps {
  record: LedgerRecord
}

export function LedgerEntry({ record }: LedgerEntryProps) {
  const config = TYPE_CONFIG[record.type]
  const TypeIcon = config.icon
  const isPositive = record.amount >= 0
  const amountStr = isPositive
    ? `+¥${record.amount.toFixed(2)}`
    : `-¥${Math.abs(record.amount).toFixed(2)}`

  return (
    <div className={styles.entry}>
      {/* Type icon */}
      <div className={joinClassNames(styles.entryIcon, config.iconClass)}>
        <TypeIcon size={18} stroke={2} aria-hidden="true" />
      </div>

      {/* Description + timestamp */}
      <div className={styles.entryBody}>
        <span className={styles.entryDesc}>{record.description}</span>
        <span className={styles.entryTime}>{formatTimestamp(record.timestamp)}</span>
      </div>

      {/* Amount */}
      <span
        className={joinClassNames(
          styles.entryAmount,
          isPositive ? styles.entryAmountPositive : styles.entryAmountNegative
        )}
      >
        {amountStr}
      </span>
    </div>
  )
}
