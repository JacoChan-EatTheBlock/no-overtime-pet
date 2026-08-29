import { IconShoppingCart, IconAlertTriangle } from '@tabler/icons-react'
import type { ShopItem } from '../economy/types'
import { Button } from '../../components/Button'
import styles from './ShopScreen.module.css'

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}

interface PurchaseConfirmModalProps {
  item: ShopItem
  displayPrice: string
  priceAmount: number
  currentBalance: number
  onConfirm: () => void
  onCancel: () => void
}

export function PurchaseConfirmModal({
  item,
  displayPrice,
  priceAmount,
  currentBalance,
  onConfirm,
  onCancel
}: PurchaseConfirmModalProps) {
  const afterBalance = Math.round((currentBalance - priceAmount) * 100) / 100
  const canAfford = afterBalance >= 0

  return (
    <div className={styles.overlay} onClick={onCancel} role="presentation">
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="确认购买"
      >
        <div className={styles.modalHeader}>
          <IconShoppingCart size={24} stroke={1.8} aria-hidden="true" />
          确认购买
        </div>

        <div className={styles.modalBody}>
          {/* Item preview */}
          <div className={styles.modalItemPreview}>
            <span className={styles.modalItemEmoji} role="img" aria-label={item.name}>
              {item.emoji}
            </span>
            <div className={styles.modalItemInfo}>
              <span className={styles.modalItemName}>{item.name}</span>
              <span className={styles.modalItemDesc}>{item.description}</span>
            </div>
          </div>

          {/* Price breakdown */}
          <div className={styles.modalRow}>
            <span className={styles.modalRowLabel}>商品价格</span>
            <span className={joinClassNames(styles.modalRowValue, styles.modalRowDanger)}>
              {displayPrice}
            </span>
          </div>

          <div className={styles.modalRow}>
            <span className={styles.modalRowLabel}>当前余额</span>
            <span className={styles.modalRowValue}>¥{currentBalance.toFixed(2)}</span>
          </div>

          <hr className={styles.modalDivider} />

          <div className={styles.modalRow}>
            <span className={styles.modalRowLabel}>购买后余额</span>
            <span
              className={joinClassNames(
                styles.modalRowValue,
                canAfford ? styles.modalRowPositive : styles.modalRowDanger
              )}
            >
              ¥{afterBalance.toFixed(2)}
            </span>
          </div>

          {/* Insufficient balance warning */}
          {!canAfford && (
            <div className={styles.insufficientWarning}>
              <IconAlertTriangle size={18} stroke={2} aria-hidden="true" />
              余额不足，无法购买
            </div>
          )}
        </div>

        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={onCancel}>
            取消
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={!canAfford}>
            确认购买
          </Button>
        </div>
      </div>
    </div>
  )
}
