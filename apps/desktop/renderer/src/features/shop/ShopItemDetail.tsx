// ---------------------------------------------------------------------------
// ShopItemDetail.tsx — 商品详情弹窗
// ---------------------------------------------------------------------------
import { IconCheck, IconShoppingCart, IconX } from '@tabler/icons-react'
import { Button } from '../../components/Button'
import { PixelSurface } from '../../components/PixelSurface'
import type { ShopItem } from './shop.fixtures'
import { formatYuan, workMsToYuan } from './shop.fixtures'
import styles from './ShopItemDetail.module.css'

interface ShopItemDetailProps {
  item: ShopItem
  owned: boolean
  balanceYuan: number
  onClose: () => void
  onBuy: (item: ShopItem) => void
  onEquip: (item: ShopItem) => void
}

const TYPE_LABELS: Record<string, string> = {
  character: '角色',
  hat: '帽子',
  action_pack: '动作包'
}

function formatWorkTime(ms: number): string {
  if (ms === 0) return '免费'
  const totalMin = Math.round(ms / 60000)
  if (totalMin < 60) return `${totalMin} 分钟工时`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m > 0 ? `${h} 小时 ${m} 分钟工时` : `${h} 小时工时`
}

export function ShopItemDetail({
  item,
  owned,
  balanceYuan,
  onClose,
  onBuy,
  onEquip
}: ShopItemDetailProps) {
  const priceYuan = workMsToYuan(item.requiredWorkMs)
  const canAfford = balanceYuan >= priceYuan || item.requiredWorkMs === 0

  return (
    <div className={styles.overlay} role="dialog" aria-label={`商品详情：${item.name}`}>
      <PixelSurface className={styles.dialog} innerClassName={styles.dialogInner}>
        {/* 关闭按钮 */}
        <button
          type="button"
          className={styles.closeBtn}
          aria-label="关闭详情"
          onClick={onClose}
        >
          <IconX size={26} stroke={2} />
        </button>

        {/* 大图预览 */}
        <div className={styles.preview}>
          <img
            className="pixel-art"
            src={item.thumbnailPath}
            alt={item.name}
            draggable={false}
          />
        </div>

        {/* 信息区 */}
        <div className={styles.info}>
          <span className={styles.typeTag}>{TYPE_LABELS[item.itemType] ?? item.itemType}</span>
          <h2 className={styles.itemName}>{item.name}</h2>
          <p className={styles.description}>{item.description}</p>

          <div className={styles.priceLine}>
            <span className={styles.priceLabel}>价格</span>
            {item.requiredWorkMs === 0 ? (
              <span className={styles.freeTag}>免费</span>
            ) : (
              <>
                <span className={styles.priceAmount}>{formatYuan(priceYuan)}</span>
                <span className={styles.workTime}>≈ {formatWorkTime(item.requiredWorkMs)}</span>
              </>
            )}
          </div>

          {/* 操作按钮 */}
          <div className={styles.actions}>
            {owned ? (
              <Button variant="primary" fullWidth onClick={() => onEquip(item)}>
                <IconCheck size={20} stroke={2.2} aria-hidden="true" />
                已拥有 · 点击装备
              </Button>
            ) : !canAfford ? (
              <Button variant="secondary" fullWidth disabled>
                余额不足（需 {formatYuan(priceYuan)}）
              </Button>
            ) : (
              <Button variant="primary" fullWidth onClick={() => onBuy(item)}>
                <IconShoppingCart size={20} stroke={2} aria-hidden="true" />
                购买 {formatYuan(priceYuan)}
              </Button>
            )}
          </div>

          <p className={styles.fairnessHint}>
            💡 相同工时 = 相同购买力，不受工资影响
          </p>
        </div>
      </PixelSurface>
    </div>
  )
}
