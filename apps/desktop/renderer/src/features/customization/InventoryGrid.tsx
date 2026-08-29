import { IconPlus } from '@tabler/icons-react'
import type { ShopItem } from '../economy/types'
import styles from './CustomizationScreen.module.css'

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}

interface InventoryGridItem extends ShopItem {
  equipped: boolean
}

interface InventoryGridProps {
  items: InventoryGridItem[]
  /** IDs of currently equipped items */
  equippedIds: string[]
  /** Toggle equip/unequip on an item */
  onToggle: (itemId: string) => void
  /** Navigate to shop to buy more */
  onGoToShop: () => void
  /** Number of empty slots to show */
  emptySlots?: number
}

export function InventoryGrid({
  items,
  equippedIds,
  onToggle,
  onGoToShop,
  emptySlots = 2
}: InventoryGridProps) {
  return (
    <div className={styles.invGrid}>
      {items.map((item) => {
        const isEquipped = equippedIds.includes(item.id)

        return (
          <button
            key={item.id}
            type="button"
            className={joinClassNames(
              styles.invItem,
              isEquipped ? styles.invItemEquipped : undefined
            )}
            onClick={() => onToggle(item.id)}
            aria-pressed={isEquipped}
            aria-label={`${item.name}${isEquipped ? '（已装备）' : ''}`}
          >
            <span className={styles.invItemEmoji} role="img" aria-hidden="true">
              {item.emoji}
            </span>
            <span className={styles.invItemName}>{item.name}</span>
            {isEquipped && <span className={styles.invItemBadge}>已装备</span>}
          </button>
        )
      })}

      {/* Empty slots → "去商店" */}
      {Array.from({ length: emptySlots }, (_, i) => (
        <button
          key={`empty-${i}`}
          type="button"
          className={styles.invEmpty}
          onClick={onGoToShop}
          aria-label="去商店购买更多"
        >
          <IconPlus size={24} stroke={1.8} aria-hidden="true" />
          去商店
        </button>
      ))}
    </div>
  )
}
