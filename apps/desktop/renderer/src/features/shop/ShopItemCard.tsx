import type { ShopItem } from '../economy/types'
import { Button } from '../../components/Button'
import styles from './ShopScreen.module.css'

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}

interface ShopItemCardProps {
  item: ShopItem
  owned: boolean
  displayPrice: string
  isFree: boolean
  selected?: boolean
  onSelect: () => void
  onBuy: () => void
}

export function ShopItemCard({ item, owned, displayPrice, isFree, selected, onSelect, onBuy }: ShopItemCardProps) {
  return (
    <button
      type="button"
      className={joinClassNames(styles.itemCard, selected ? styles.itemSelected : undefined)}
      onClick={onSelect}
    >
      <img className="pixel-art" src={item.thumbnail} alt={item.name} />
      <span className={styles.itemName}>{item.name}</span>
      <span className={styles.itemPrice}>
        {owned ? (
          <span className={styles.ownedLabel}>已拥有</span>
        ) : isFree ? (
          '免费'
        ) : (
          displayPrice
        )}
      </span>
    </button>
  )
}
