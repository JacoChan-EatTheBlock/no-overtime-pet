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
  onBuy: () => void
}

export function ShopItemCard({ item, owned, displayPrice, isFree, onBuy }: ShopItemCardProps) {
  return (
    <div className={joinClassNames(styles.card, owned ? styles.cardOwned : undefined)}>
      <div className={styles.cardThumbnail}>
        <span className={styles.cardEmoji} role="img" aria-label={item.name}>
          {item.emoji}
        </span>
      </div>

      <div className={styles.cardBody}>
        <span className={styles.cardName}>{item.name}</span>
        <span className={styles.cardDesc}>{item.description}</span>

        {owned ? (
          <span className={styles.ownedBadge}>已拥有</span>
        ) : (
          <div className={styles.cardFooter}>
            <span
              className={joinClassNames(
                styles.cardPrice,
                isFree ? styles.cardPriceFree : undefined
              )}
            >
              {isFree ? '免费' : displayPrice}
            </span>
            <Button
              variant="primary"
              className={styles.cardBuyBtn}
              onClick={onBuy}
              disabled={isFree}
            >
              {isFree ? '默认' : '购买'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
