// ---------------------------------------------------------------------------
// WalletLedgerItem.tsx — 账本单条记录（横排布局，匹配设计稿 09-wallet）
// ---------------------------------------------------------------------------
import {
  IconClock,
  IconCoffee,
  IconGift,
  IconShoppingBag,
  IconTrophy,
  IconFlame,
  IconRefresh
} from '@tabler/icons-react'
import type { LedgerEntry, LedgerEntryKind } from '../shop/shop.fixtures'
import { formatYuan } from '../shop/shop.fixtures'
import styles from './WalletScreen.module.css'

/** kind → tabler icon 组件（匹配设计稿中的图标风格） */
const KIND_ICON: Record<LedgerEntryKind, typeof IconClock> = {
  work_income: IconClock,
  lunch_break: IconCoffee,
  purchase: IconShoppingBag,
  overtime_pool_reward: IconTrophy,
  overtime_penalty: IconFlame,
  refund: IconRefresh
}

interface WalletLedgerItemProps {
  entry: LedgerEntry
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()

  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const prefix = isToday ? '今天' : isYesterday ? '昨天' : `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`
  return `${prefix} ${hours}:${minutes}`
}

export function WalletLedgerItem({ entry }: WalletLedgerItemProps) {
  const Icon = KIND_ICON[entry.kind] ?? IconGift
  const timeText = entry.timeLabel ?? formatTimestamp(entry.timestamp)

  const amountClass =
    entry.amountYuan > 0
      ? styles.amountPositive
      : entry.amountYuan < 0
        ? styles.amountNegative
        : styles.ledgerAmountNeutral

  const amountText =
    entry.amountYuan > 0
      ? `+${formatYuan(entry.amountYuan)}`
      : entry.amountYuan < 0
        ? `-${formatYuan(entry.amountYuan)}`
        : formatYuan(0)

  return (
    <div className={styles.ledgerRow}>
      <Icon size={20} stroke={1.5} className={styles.ledgerIcon} />
      <span className={styles.ledgerLabel}>{entry.description}</span>
      <span className={styles.ledgerTime}>{timeText}</span>
      <span className={amountClass}>{amountText}</span>
    </div>
  )
}
