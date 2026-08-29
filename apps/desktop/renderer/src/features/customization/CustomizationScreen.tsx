import { useState, useCallback, useRef } from 'react'
import {
  IconArrowDown,
  IconArrowUp,
  IconGripVertical,
  IconInfoCircle,
  IconPalette,
  IconX
} from '@tabler/icons-react'
import { Button } from '../../components/Button'
import { PixelSurface } from '../../components/PixelSurface'
import { PixelWindowHeader } from '../../components/PixelWindowHeader'
import { usePersistedState } from '../../lib/storage'
import styles from './CustomizationScreen.module.css'

type WardrobeTab = 'characters' | 'hats'

interface HatItem {
  id: string
  name: string
  thumbnail: string
}

interface CustomizationScreenProps {
  onClose: () => void
}

const ALL_HATS: HatItem[] = [
  { id: '1', name: '加班免死金牌帽', thumbnail: '/assets/capybara/idle.png' },
  { id: '2', name: '周一灵魂帽', thumbnail: '/assets/capybara/idle.png' },
  { id: '3', name: '摸鱼纸袋', thumbnail: '/assets/capybara/idle.png' },
  { id: '4', name: '准点跑路头带', thumbnail: '/assets/capybara/idle.png' },
  { id: '5', name: '咖啡续命杯', thumbnail: '/assets/capybara/idle.png' },
  { id: '6', name: '工牌', thumbnail: '/assets/capybara/idle.png' },
]

const INITIAL_EQUIPPED_IDS = ['1', '2', '3', '4', '5', '6']
const ACTION_TABS = ['待机', '敲键盘', '庆祝']

export function CustomizationScreen({ onClose }: CustomizationScreenProps) {
  const [tab, setTab] = useState<WardrobeTab>('hats')
  const [equippedIds, setEquippedIds] = usePersistedState<string[]>('equipment:hat-ids', INITIAL_EQUIPPED_IDS)
  const [savedIds, setSavedIds] = usePersistedState<string[]>('equipment:hat-ids-saved', INITIAL_EQUIPPED_IDS)
  const [previewAction, setPreviewAction] = useState('待机')
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const dragRef = useRef<number | null>(null)

  const equippedHats = equippedIds
    .map(id => ALL_HATS.find(h => h.id === id))
    .filter(Boolean) as HatItem[]

  function toggleEquip(hatId: string): void {
    setEquippedIds(prev =>
      prev.includes(hatId)
        ? prev.filter(id => id !== hatId)
        : [...prev, hatId]
    )
  }

  function moveHat(index: number, direction: 'up' | 'down'): void {
    const next = [...equippedIds]
    const target = direction === 'up' ? index + 1 : index - 1
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setEquippedIds(next)
  }

  function handleSave(): void {
    setSavedIds([...equippedIds])
  }

  function handleRestore(): void {
    setEquippedIds([...savedIds])
  }

  function handleClear(): void {
    setEquippedIds([])
  }

  // Drag handlers for equipped list
  const handleDragStart = useCallback((idx: number) => {
    dragRef.current = idx
    setDragIdx(idx)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault()
    setOverIdx(idx)
  }, [])

  const handleDrop = useCallback((targetIdx: number) => {
    const from = dragRef.current
    if (from === null || from === targetIdx) {
      setDragIdx(null)
      setOverIdx(null)
      return
    }
    setEquippedIds(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(targetIdx, 0, moved)
      return next
    })
    setDragIdx(null)
    setOverIdx(null)
    dragRef.current = null
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragIdx(null)
    setOverIdx(null)
    dragRef.current = null
  }, [])

  return (
    <PixelSurface className={styles.window} innerClassName={styles.windowInner} ariaLabel="装扮">
      <PixelWindowHeader />
      <div className={styles.content} data-ui-screen="11-customization">
        {/* ─── Header ─── */}
        <header className={styles.header}>
          <IconPalette size={28} stroke={1.4} />
          <h1>装扮</h1>
          <span className={styles.headerHint}>拖动调整顺序；帽子可以继续往上叠。</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="关闭">
            <IconX size={22} stroke={2} />
          </button>
        </header>

        {/* ─── Tab: 角色 / 帽子 ─── */}
        <div className={styles.wardrobeTabs}>
          <button
            type="button"
            className={tab === 'characters' ? styles.activeWTab : undefined}
            onClick={() => setTab('characters')}
          >
            角色
          </button>
          <button
            type="button"
            className={tab === 'hats' ? styles.activeWTab : undefined}
            onClick={() => setTab('hats')}
          >
            帽子
          </button>
        </div>

        <div className={styles.body}>
          {/* ─── Left: Character preview ─── */}
          <section className={styles.previewColumn}>
            <div className={styles.previewArea}>
              {/* Stack visualization */}
              <div className={styles.hatStack}>
                {equippedHats.map((hat, i) => (
                  <img
                    key={hat.id}
                    className="pixel-art"
                    src={hat.thumbnail}
                    alt={hat.name}
                    style={{
                      width: 48,
                      height: 48,
                      position: 'absolute',
                      bottom: 160 + i * 28,
                      left: '50%',
                      transform: 'translateX(-50%)',
                    }}
                  />
                ))}
              </div>
              <img
                className={`${styles.previewCharacter} pixel-art`}
                src="/assets/capybara/idle.png"
                alt="角色预览"
              />
            </div>

            {/* Action preview tabs */}
            <div className={styles.actionTabs}>
              {ACTION_TABS.map((action) => (
                <button
                  key={action}
                  type="button"
                  className={previewAction === action ? styles.activeAction : undefined}
                  onClick={() => setPreviewAction(action)}
                >
                  {action}
                </button>
              ))}
            </div>
          </section>

          {/* ─── Center: Hat inventory grid ─── */}
          <section className={styles.inventoryColumn}>
            <h3>
              我的帽子
              <span className={styles.hatCount}>{ALL_HATS.length}</span>
            </h3>
            <div className={styles.hatGrid}>
              {ALL_HATS.map((hat) => {
                const isEquipped = equippedIds.includes(hat.id)
                return (
                  <button
                    key={hat.id}
                    type="button"
                    className={`${styles.hatCard} ${isEquipped ? styles.hatCardEquipped : ''}`}
                    onClick={() => toggleEquip(hat.id)}
                  >
                    <img className="pixel-art" src={hat.thumbnail} alt={hat.name} />
                    <span>{hat.name}</span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* ─── Right: Equipped order list ─── */}
          <aside className={styles.equippedColumn}>
            <h3>已装备 · 从下到上</h3>
            <div className={styles.equippedList}>
              {equippedHats.map((hat, index) => {
                const displayNum = equippedHats.length - index
                return (
                  <div
                    key={hat.id}
                    className={`${styles.equippedRow} ${dragIdx === index ? styles.equippedRowDragging : ''} ${overIdx === index ? styles.equippedRowOver : ''}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={handleDragEnd}
                  >
                    <span className={styles.hatNum}>{displayNum}</span>
                    <img className="pixel-art" src={hat.thumbnail} alt="" />
                    <span className={styles.hatName}>{hat.name}</span>
                    <button
                      type="button"
                      className={styles.moveBtn}
                      disabled={index === 0}
                      onClick={() => moveHat(index, 'up')}
                      aria-label="上移"
                    >
                      <IconArrowUp size={14} stroke={2} />
                    </button>
                    <button
                      type="button"
                      className={styles.moveBtn}
                      disabled={index === equippedHats.length - 1}
                      onClick={() => moveHat(index, 'down')}
                      aria-label="下移"
                    >
                      <IconArrowDown size={14} stroke={2} />
                    </button>
                    <IconGripVertical size={16} stroke={1.5} className={styles.gripIcon} />
                  </div>
                )
              })}
            </div>

            <p className={styles.stackNote}>
              <IconInfoCircle size={14} stroke={1.5} />
              高度过高时：缩放至可读下限，再使用纵向滚动
            </p>

            <Button variant="primary" fullWidth onClick={handleSave}>保存装扮</Button>
            <Button variant="secondary" fullWidth onClick={handleRestore}>恢复上次</Button>
            <button type="button" className={styles.clearBtn} onClick={handleClear}>清空帽子</button>
          </aside>
        </div>

        {/* Capybara */}
        <img
          className={`${styles.petFloat} pixel-art`}
          src="/assets/capybara/idle.png"
          alt=""
        />
      </div>
    </PixelSurface>
  )
}
