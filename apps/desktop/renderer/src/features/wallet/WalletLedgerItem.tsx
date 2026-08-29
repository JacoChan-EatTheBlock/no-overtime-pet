// ---------------------------------------------------------------------------
// WalletLedgerItem.tsx — 账本单条记录
// ---------------------------------------------------------------------------
import type { LedgerEntry } from '../shop/shop.fixtures'
import { formatYuan, LEDGER_KIND_ICONS } from '../shop/shop.fixtures'
import styles from './WalletScreen.module.css'

interface WalletLedgerItemProps {
  entry: LedgerEntry
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

export function WalletLedgerItem({ entry }: WalletLedgerItemProps) {
  const isIncome = entry.amountYuan > 0

  return (
    <div className={styles.ledgerItem}>
      <span className={styles.ledgerIcon} aria-hidden="true">
        {LEDGER_KIND_ICONS[entry.kind]}
      </span>

      <div className={styles.ledgerBody}>
        <span className={styles.ledgerDesc}>{entry.description}</span>
        <span className={styles.ledgerTime}>{formatTimestamp(entry.timestamp)}</span>
      </div>

      <span
        className={isIncome ? styles.ledgerAmountPositive : styles.ledgerAmountNegative}
      >
        {isIncome ? '+' : '-'}{formatYuan(entry.amountYuan)}
      </span>
    </div>
  )
}
