import { useState } from 'react' 
import {
  IconAlertTriangle,
  IconCheck,
  IconPalette,
  IconPlayerPlay,
  IconShoppingBag,
  IconShoppingCart,
  IconStar,
  IconThumbUp,
  IconX
} from '@tabler/icons-react'
import { Button } from '../../components/Button'
import { PixelSurface } from '../../components/PixelSurface'
import { PixelWindowHeader } from '../../components/PixelWindowHeader'
import { usePersistedState } from '../../lib/storage'
import type { ScreenId } from '../../App'
import styles from './ShopScreen.module.css'

type ShopCategory = 'recommended' | 'characters' | 'hats' | 'actions' | 'owned'
type Rarity = '普通' | '稀有' | '史诗'
type ItemType = 'character' | 'hat' | 'action_pack'

interface ShopItem {
  id: string
  name: string
  price: number
  rarity: Rarity
  thumbnail: string
  emoji: string
  itemType: ItemType
  description: string
  workTimeEquiv: string
  owned: boolean
  previewAction?: string
}

const RARITY_CLASS: Record<Rarity, string> = {
  '普通': styles.rarityCommon,
  '稀有': styles.rarityRare,
  '史诗': styles.rarityEpic,
}

const PREVIEW_ACTION_LABELS: Record<string, string> = {
  WORK_NORMAL: '工作中',
  DANCE: '下班街舞',
  NAP: '午睡打盹',
}

const INITIAL_ITEMS: ShopItem[] = [
  // ── 角色 ×3 ──
  { id: '1', name: '水豚打工人', price: 0, rarity: '普通', thumbnail: '/assets/capybara/idle.png', emoji: '🦫', itemType: 'character', description: '经典水豚角色。佛系表情，敲代码有条不紊，从不加班。', workTimeEquiv: '', owned: true, previewAction: 'WORK_NORMAL' },
  { id: '2', name: '鹈鹕摸鱼王', price: 188.00, rarity: '稀有', thumbnail: '/assets/pelican/idle.png', emoji: '🐦', itemType: 'character', description: '嘴巴大，能装很多摸鱼时间。专业划水三十年。', workTimeEquiv: '相当于你当前约 2 小时的窝囊费', owned: false, previewAction: 'WORK_NORMAL' },
  { id: '3', name: '暹罗猫社畜', price: 320.00, rarity: '史诗', thumbnail: '/assets/siamese/idle.png', emoji: '🐱', itemType: 'character', description: '优雅地摸鱼，优雅地准点下班。座右铭：「不卷。」', workTimeEquiv: '相当于你当前约 3.4 小时的窝囊费', owned: false, previewAction: 'WORK_NORMAL' },
  // ── 帽子 ×5 ──
  { id: '4', name: '加班免死金牌帽', price: 188.00, rarity: '普通', thumbnail: '/assets/hats/shield.png', emoji: '🛡️', itemType: 'hat', description: '没有免死效果，但戴着比较安心。', workTimeEquiv: '相当于你当前约 2 小时的窝囊费', owned: false },
  { id: '5', name: '周一灵魂帽', price: 94.00, rarity: '稀有', thumbnail: '/assets/hats/ghost.png', emoji: '👻', itemType: 'hat', description: '每个周一都想请假的灵魂。', workTimeEquiv: '相当于你当前约 1 小时的窝囊费', owned: false },
  { id: '6', name: '摸鱼纸袋', price: 141.00, rarity: '普通', thumbnail: '/assets/hats/bag.png', emoji: '🛍️', itemType: 'hat', description: '戴上就看不到别人，别人也看不到你。', workTimeEquiv: '相当于你当前约 1.5 小时的窝囊费', owned: false },
  { id: '7', name: '咖啡续命杯', price: 75.00, rarity: '普通', thumbnail: '/assets/hats/coffee.png', emoji: '☕', itemType: 'hat', description: '今日份的续命良药。', workTimeEquiv: '相当于你当前约 0.8 小时的窝囊费', owned: false },
  { id: '8', name: '准点跑路头带', price: 220.00, rarity: '稀有', thumbnail: '/assets/hats/runner.png', emoji: '🏃', itemType: 'hat', description: '绑上它，你就是最快的那个。', workTimeEquiv: '相当于你当前约 2.3 小时的窝囊费', owned: false },
  // ── 动作包 ×2 ──
  { id: '9', name: '下班街舞', price: 280.00, rarity: '史诗', thumbnail: '/assets/actions/dance.png', emoji: '💃', itemType: 'action_pack', description: '解锁"到点下班"专属街舞动画。桌宠会跳一段 breaking。', workTimeEquiv: '相当于你当前约 3 小时的窝囊费', owned: false, previewAction: 'DANCE' },
  { id: '10', name: '午睡套装', price: 150.00, rarity: '稀有', thumbnail: '/assets/actions/nap.png', emoji: '😴', itemType: 'action_pack', description: '解锁午休时段专属打盹动画。桌宠铺好小毯子，戴上眼罩 zZZ…', workTimeEquiv: '相当于你当前约 1.5 小时的窝囊费', owned: false, previewAction: 'NAP' },
]

interface ShopScreenProps {
  onClose: () => void
  onNavigate: (id: ScreenId) => void
}

export function ShopScreen({ onClose, onNavigate }: ShopScreenProps) {
  const [category, setCategory] = useState<ShopCategory>('recommended')
  const [items, setItems] = usePersistedState<ShopItem[]>('shop:items', INITIAL_ITEMS)
  const [selectedItem, setSelectedItem] = useState<ShopItem>(INITIAL_ITEMS[0])
  const [balance, setBalance] = usePersistedState<number>('economy:balance', 486.40)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  const categories: { id: ShopCategory; label: string; icon: typeof IconThumbUp }[] = [
    { id: 'recommended', label: '推荐', icon: IconThumbUp },
    { id: 'characters', label: '角色', icon: IconPalette },
    { id: 'hats', label: '帽子', icon: IconStar },
    { id: 'actions', label: '动作包', icon: IconPlayerPlay },
    { id: 'owned', label: '已拥有', icon: IconCheck },
  ]

  const filteredItems = category === 'owned'
    ? items.filter(i => i.owned)
    : category === 'recommended'
    ? items
    : category === 'characters'
    ? items.filter(i => i.itemType === 'character')
    : category === 'hats'
    ? items.filter(i => i.itemType === 'hat')
    : items.filter(i => i.itemType === 'action_pack')

  function handleBuyClick(): void {
    if (selectedItem.owned || selectedItem.price === 0) return
    setShowPurchaseModal(true)
  }

  function handleConfirmPurchase(): void {
    const price = selectedItem.price
    setBalance(prev => Math.round((prev - price) * 100) / 100)
    setItems(prev => prev.map(item =>
      item.id === selectedItem.id ? { ...item, owned: true } : item
    ))
    setSelectedItem(prev => ({ ...prev, owned: true }))
    setShowPurchaseModal(false)
  }

  function handlePreviewClick(): void {
    setShowPreviewModal(true)
  }

  function handleImgError(itemId: string): void {
    setFailedImages(prev => new Set(prev).add(itemId))
  }

  const displayPrice = (p: number) => p === 0 ? '免费' : `¥${p.toFixed(2)}`
  const afterBalance = Math.round((balance - selectedItem.price) * 100) / 100
  const canAfford = afterBalance >= 0

  const previewActionLabel = selectedItem.previewAction
    ? (PREVIEW_ACTION_LABELS[selectedItem.previewAction] ?? selectedItem.previewAction)
    : selectedItem.itemType === 'character'
    ? '工作中'
    : selectedItem.name

  return (
    <PixelSurface className={styles.window} innerClassName={styles.windowInner} ariaLabel="商店">
      <PixelWindowHeader />
      <div className={styles.content} data-ui-screen="10-shop">
        {/* ─── Header ─── */}
        <header className={styles.header}>
          <IconShoppingBag size={28} stroke={1.4} />
          <h1>商店</h1>
          <span className={styles.balanceTag}>窝囊费 ¥{balance.toFixed(2)}</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="关闭">
            <IconX size={22} stroke={2} />
          </button>
        </header>

        <div className={styles.body}>
          {/* ─── Left: Categories ─── */}
          <nav className={styles.categoryNav}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={category === cat.id ? styles.activeCat : styles.catBtn}
                onClick={() => setCategory(cat.id)}
              >
                <cat.icon size={20} stroke={1.6} />
                {cat.label}
              </button>
            ))}
          </nav>

          {/* ─── Center: Item grid ─── */}
          <section className={styles.itemGrid}>
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.itemCard} ${selectedItem.id === item.id ? styles.itemSelected : ''}`}
                onClick={() => setSelectedItem(item)}
              >
                <span className={`${styles.rarityBadge} ${RARITY_CLASS[item.rarity]}`}>
                  {item.rarity}
                </span>
                {failedImages.has(item.id) ? (
                  <span className={styles.emojiFallback}>{item.emoji}</span>
                ) : (
                  <img
                    className="pixel-art"
                    src={item.thumbnail}
                    alt={item.name}
                    onError={() => handleImgError(item.id)}
                  />
                )}
                <span className={styles.itemName}>{item.name}</span>
                <span className={styles.itemPrice}>
                  {item.owned ? <span className={styles.ownedLabel}>已拥有</span> : displayPrice(item.price)}
                </span>
              </button>
            ))}
          </section>

          {/* ─── Right: Item detail ─── */}
          <aside className={styles.detail}>
            <h2>{selectedItem.name}</h2>
            <p className={styles.detailDesc}>{selectedItem.description}</p>
            {selectedItem.workTimeEquiv && (
              <p className={styles.detailEquiv}>{selectedItem.workTimeEquiv}</p>
            )}
            {failedImages.has(selectedItem.id) ? (
              <span className={`${styles.emojiFallback} ${styles.detailEmoji}`}>{selectedItem.emoji}</span>
            ) : (
              <img
                className={`${styles.detailPreview} pixel-art`}
                src={selectedItem.thumbnail}
                alt={selectedItem.name}
                onError={() => handleImgError(selectedItem.id)}
              />
            )}
            {selectedItem.owned ? (
              <Button variant="secondary" fullWidth>
                已拥有
              </Button>
            ) : (
              <Button variant="primary" fullWidth onClick={handleBuyClick}>
                购买 {displayPrice(selectedItem.price)}
              </Button>
            )}
            <Button variant="secondary" fullWidth onClick={handlePreviewClick}>预览动作</Button>
          </aside>
        </div>

        {/* Capybara */}
        <img
          className={`${styles.petCharacter} pixel-art`}
          src="/assets/capybara/idle.png"
          alt=""
        />

        {/* ─── Purchase Confirm Modal ─── */}
        {showPurchaseModal && (
          <div className={styles.overlay} onClick={() => setShowPurchaseModal(false)} role="presentation">
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
                  {failedImages.has(selectedItem.id) ? (
                    <span className={styles.modalItemEmoji}>{selectedItem.emoji}</span>
                  ) : (
                    <img
                      className={`${styles.modalItemThumbnail} pixel-art`}
                      src={selectedItem.thumbnail}
                      alt={selectedItem.name}
                      onError={() => handleImgError(selectedItem.id)}
                    />
                  )}
                  <div className={styles.modalItemInfo}>
                    <span className={styles.modalItemName}>{selectedItem.name}</span>
                    <span className={styles.modalItemDesc}>{selectedItem.description}</span>
                  </div>
                </div>

                {/* Price breakdown */}
                <div className={styles.modalRow}>
                  <span className={styles.modalRowLabel}>商品价格</span>
                  <span className={`${styles.modalRowValue} ${styles.modalRowDanger}`}>
                    {displayPrice(selectedItem.price)}
                  </span>
                </div>

                <div className={styles.modalRow}>
                  <span className={styles.modalRowLabel}>当前余额</span>
                  <span className={styles.modalRowValue}>¥{balance.toFixed(2)}</span>
                </div>

                <hr className={styles.modalDivider} />

                <div className={styles.modalRow}>
                  <span className={styles.modalRowLabel}>购买后余额</span>
                  <span className={`${styles.modalRowValue} ${canAfford ? styles.modalRowPositive : styles.modalRowDanger}`}>
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
                <Button variant="secondary" onClick={() => setShowPurchaseModal(false)}>
                  取消
                </Button>
                <Button variant="primary" onClick={handleConfirmPurchase} disabled={!canAfford}>
                  确认购买
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Action Preview Modal ─── */}
        {showPreviewModal && (
          <div className={styles.overlay} onClick={() => setShowPreviewModal(false)} role="presentation">
            <div
              className={styles.previewModal}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="预览动作"
            >
              <div className={styles.previewModalHeader}>
                <IconPlayerPlay size={22} stroke={1.8} aria-hidden="true" />
                <span>动作预览</span>
                <button
                  type="button"
                  className={styles.previewCloseBtn}
                  onClick={() => setShowPreviewModal(false)}
                  aria-label="关闭预览"
                >
                  <IconX size={20} stroke={2} />
                </button>
              </div>

              <div className={styles.previewStage}>
                <div className={styles.previewCharacter}>
                  {failedImages.has(selectedItem.id) ? (
                    <span className={styles.previewEmoji}>{selectedItem.emoji}</span>
                  ) : (
                    <img
                      className={`${styles.previewSprite} pixel-art`}
                      src={selectedItem.thumbnail}
                      alt={`${selectedItem.name} 动作预览`}
                      onError={() => handleImgError(selectedItem.id)}
                    />
                  )}
                </div>
              </div>

              <div className={styles.previewInfo}>
                <span className={styles.previewItemName}>{selectedItem.name}</span>
                <span className={styles.previewActionName}>
                  {previewActionLabel}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </PixelSurface>
  )
}
