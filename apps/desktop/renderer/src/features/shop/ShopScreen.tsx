import { useState } from 'react'
import {
  IconCheck,
  IconPalette,
  IconShoppingBag,
  IconStar,
  IconThumbUp,
  IconX
} from '@tabler/icons-react'
import { Button } from '../../components/Button'
import { PixelSurface } from '../../components/PixelSurface'
import { PixelWindowHeader } from '../../components/PixelWindowHeader'
import type { ScreenId } from '../../App'
import styles from './ShopScreen.module.css'

type ShopCategory = 'recommended' | 'characters' | 'hats' | 'owned'
type Rarity = '普通' | '稀有' | '史诗'

interface ShopItem {
  id: string
  name: string
  price: string
  rarity: Rarity
  thumbnail: string
  description: string
  workTimeEquiv: string
  owned: boolean
}

const RARITY_CLASS: Record<Rarity, string> = {
  '普通': styles.rarityCommon,
  '稀有': styles.rarityRare,
  '史诗': styles.rarityEpic,
}

const MOCK_ITEMS: ShopItem[] = [
  { id: '1', name: '加班免死金牌帽', price: '¥188.00', rarity: '普通', thumbnail: '/assets/capybara/idle.png', description: '没有免死效果，但戴着比较安心。', workTimeEquiv: '约 2 小时的窝囊费', owned: false },
  { id: '2', name: '周一灵魂帽', price: '¥94.00', rarity: '稀有', thumbnail: '/assets/capybara/idle.png', description: '每个周一都想请假的灵魂。', workTimeEquiv: '约 1 小时的窝囊费', owned: false },
  { id: '3', name: '摸鱼纸袋', price: '¥141.00', rarity: '普通', thumbnail: '/assets/capybara/idle.png', description: '戴上就看不到别人，别人也看不到你。', workTimeEquiv: '约 1.5 小时的窝囊费', owned: false },
  { id: '4', name: '咖啡续命杯', price: '¥75.00', rarity: '普通', thumbnail: '/assets/capybara/idle.png', description: '今日份的续命良药。', workTimeEquiv: '约 0.8 小时的窝囊费', owned: false },
  { id: '5', name: '准点跑路头带', price: '¥220.00', rarity: '稀有', thumbnail: '/assets/capybara/idle.png', description: '绑上它，你就是最快的那个。', workTimeEquiv: '约 2.3 小时的窝囊费', owned: false },
  { id: '6', name: '社畜小熊角色', price: '', rarity: '史诗', thumbnail: '/assets/capybara/idle.png', description: '一只更苦逼的小熊。', workTimeEquiv: '', owned: true },
]

interface ShopScreenProps {
  onClose: () => void
  onNavigate: (id: ScreenId) => void
}

export function ShopScreen({ onClose, onNavigate }: ShopScreenProps) {
  const [category, setCategory] = useState<ShopCategory>('recommended')
  const [selectedItem, setSelectedItem] = useState<ShopItem>(MOCK_ITEMS[0])

  const categories: { id: ShopCategory; label: string; icon: typeof IconThumbUp }[] = [
    { id: 'recommended', label: '推荐', icon: IconThumbUp },
    { id: 'characters', label: '角色', icon: IconPalette },
    { id: 'hats', label: '帽子', icon: IconStar },
    { id: 'owned', label: '已拥有', icon: IconCheck },
  ]

  return (
    <PixelSurface className={styles.window} innerClassName={styles.windowInner} ariaLabel="商店">
      <PixelWindowHeader />
      <div className={styles.content} data-ui-screen="10-shop">
        {/* ─── Header ─── */}
        <header className={styles.header}>
          <IconShoppingBag size={28} stroke={1.4} />
          <h1>商店</h1>
          <span className={styles.balanceTag}>窝囊费 ¥486.40</span>
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
            {MOCK_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.itemCard} ${selectedItem.id === item.id ? styles.itemSelected : ''}`}
                onClick={() => setSelectedItem(item)}
              >
                <span className={`${styles.rarityBadge} ${RARITY_CLASS[item.rarity]}`}>
                  {item.rarity}
                </span>
                <img className="pixel-art" src={item.thumbnail} alt={item.name} />
                <span className={styles.itemName}>{item.name}</span>
                <span className={styles.itemPrice}>
                  {item.owned ? <span className={styles.ownedLabel}>已拥有</span> : item.price}
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
            <img
              className={`${styles.detailPreview} pixel-art`}
              src={selectedItem.thumbnail}
              alt={selectedItem.name}
            />
            {selectedItem.owned ? (
              <Button variant="secondary" fullWidth>
                已拥有
              </Button>
            ) : (
              <Button variant="primary" fullWidth>
                购买 {selectedItem.price}
              </Button>
            )}
            <Button variant="secondary" fullWidth>预览动作</Button>
          </aside>
        </div>

        {/* Capybara */}
        <img
          className={`${styles.petCharacter} pixel-art`}
          src="/assets/capybara/idle.png"
          alt=""
        />
      </div>
    </PixelSurface>
  )
}
