// ---------------------------------------------------------------------------
// HatInventoryList.tsx — 帽子库存列表（可拖拽排序，显示叠加顺序编号）
// ---------------------------------------------------------------------------
import { useCallback, useRef, useState } from 'react'
import { IconArrowDown, IconArrowUp, IconGripVertical } from '@tabler/icons-react'
import { Button } from '../../components/Button'
import type { ShopItem } from '../shop/shop.fixtures'
import styles from './CustomizationScreen.module.css'

interface HatInventoryListProps {
  ownedHats: ShopItem[]
  equippedHatIds: string[]
  onToggleEquip: (hatId: string) => void
  onReorder: (hatIds: string[]) => void
}

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}

export function HatInventoryList({
  ownedHats,
  equippedHatIds,
  onToggleEquip,
  onReorder
}: HatInventoryListProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const dragRef = useRef<number | null>(null)

  // 仅已装备的帽子参与排序显示
  const equippedHats = equippedHatIds
    .map((id) => ownedHats.find((h) => h.id === id))
    .filter(Boolean) as ShopItem[]

  const unequippedHats = ownedHats.filter((h) => !equippedHatIds.includes(h.id))

  // 手动上移/下移（键盘可达的替代排序方式）
  function moveHat(hatId: string, direction: -1 | 1): void {
    const idx = equippedHatIds.indexOf(hatId)
    if (idx < 0) return
    const target = idx + direction
    if (target < 0 || target >= equippedHatIds.length) return
    const next = [...equippedHatIds]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    onReorder(next)
  }

  // ── 拖拽回调 ──────────────────────────
  const handleDragStart = useCallback(
    (idx: number) => {
      dragRef.current = idx
      setDragIdx(idx)
    },
    []
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent, idx: number) => {
      e.preventDefault()
      setOverIdx(idx)
    },
    []
  )

  const handleDrop = useCallback(
    (targetIdx: number) => {
      const from = dragRef.current
      if (from === null || from === targetIdx) {
        setDragIdx(null)
        setOverIdx(null)
        return
      }
      const next = [...equippedHatIds]
      const [moved] = next.splice(from, 1)
      next.splice(targetIdx, 0, moved)
      onReorder(next)
      setDragIdx(null)
      setOverIdx(null)
      dragRef.current = null
    },
    [equippedHatIds, onReorder]
  )

  const handleDragEnd = useCallback(() => {
    setDragIdx(null)
    setOverIdx(null)
    dragRef.current = null
  }, [])

  return (
    <div className={styles.hatInventory}>
      {/* 已装备帽子（可排序） */}
      {equippedHats.length > 0 && (
        <div className={styles.hatSection}>
          <h3 className={styles.hatSectionTitle}>已装备 · 拖拽调整叠加顺序</h3>
          <p className={styles.hatOrderHint}>编号 1 = 最底层，数字越大越靠上</p>
          <div className={styles.hatList}>
            {equippedHats.map((hat, idx) => (
              <div
                key={hat.id}
                className={joinClassNames(
                  styles.hatRow,
                  styles.hatRowEquipped,
                  dragIdx === idx ? styles.hatRowDragging : undefined,
                  overIdx === idx ? styles.hatRowOver : undefined
                )}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={() => handleDrop(idx)}
                onDragEnd={handleDragEnd}
              >
                <span className={styles.hatGrip} aria-hidden="true">
                  <IconGripVertical size={18} stroke={2} />
                </span>
                <span className={styles.hatOrder}>#{idx + 1}</span>
                <img
                  className="pixel-art"
                  src={hat.thumbnailPath}
                  alt=""
                  draggable={false}
                />
                <span className={styles.hatName}>{hat.name}</span>
                <div className={styles.hatActions}>
                  <button
                    type="button"
                    className={styles.hatMoveBtn}
                    aria-label={`上移 ${hat.name}`}
                    disabled={idx === 0}
                    onClick={() => moveHat(hat.id, -1)}
                  >
                    <IconArrowUp size={16} stroke={2} />
                  </button>
                  <button
                    type="button"
                    className={styles.hatMoveBtn}
                    aria-label={`下移 ${hat.name}`}
                    disabled={idx === equippedHats.length - 1}
                    onClick={() => moveHat(hat.id, 1)}
                  >
                    <IconArrowDown size={16} stroke={2} />
                  </button>
                  <Button variant="ghost" onClick={() => onToggleEquip(hat.id)}>
                    卸下
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 未装备帽子 */}
      {unequippedHats.length > 0 && (
        <div className={styles.hatSection}>
          <h3 className={styles.hatSectionTitle}>未装备</h3>
          <div className={styles.hatList}>
            {unequippedHats.map((hat) => (
              <div key={hat.id} className={styles.hatRow}>
                <span className={styles.hatGrip} aria-hidden="true" />
                <span className={styles.hatOrder}>—</span>
                <img
                  className="pixel-art"
                  src={hat.thumbnailPath}
                  alt=""
                  draggable={false}
                />
                <span className={styles.hatName}>{hat.name}</span>
                <div className={styles.hatActions}>
                  <Button variant="primary" onClick={() => onToggleEquip(hat.id)}>
                    装备
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {ownedHats.length === 0 && (
        <p className={styles.emptyHint}>还没有帽子，去商店逛逛吧 🎩</p>
      )}
    </div>
  )
}
