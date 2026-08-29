import {
  IconArrowDown,
  IconArrowUp,
  IconBriefcase,
  IconCheck,
  IconCircle,
  IconClock,
  IconCoffee,
  IconFileText,
  IconGift,
  IconGripVertical,
  IconHanger,
  IconInfoCircle,
  IconPackage,
  IconPlayerPauseFilled,
  IconSettings,
  IconShoppingBag,
  IconShoppingCart,
  IconSparkles,
  IconUsers,
  IconX
} from '@tabler/icons-react'
import { useMemo, useState, type DragEvent } from 'react'
import { Button } from '../../components/Button'
import { PixelSurface } from '../../components/PixelSurface'
import {
  CHARACTER_IMAGE_SRC,
  DEFAULT_EQUIPPED_HAT_IDS,
  INITIAL_OWNED_ITEM_IDS,
  REWARD_POOL_CHEST_SRC,
  SHOP_TITLE_ICON_SRC,
  SHOP_ITEMS,
  WALLET_TITLE_ICON_SRC,
  WALLET_LEDGER,
  WARDROBE_TITLE_ICON_SRC,
  WARDROBE_HATS,
  type EconomyScreen,
  type ItemRarity,
  type ShopCategory,
  type ShopItemMock
} from './fixtures'
import styles from './EconomyCustomizationDemo.module.css'

interface EconomyCustomizationDemoProps {
  initialScreen?: EconomyScreen
}

type WardrobeTab = 'character' | 'hat'

const RARITY_LABELS: Record<ItemRarity, string> = {
  COMMON: '普通',
  UNCOMMON: '少见',
  RARE: '稀有',
  EPIC: '史诗'
}

function formatMoney(amountMinor: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2
  }).format(amountMinor / 100)
}

function joinClassNames(...classNames: Array<string | false | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}

function MockBadge() {
  return (
    <span className={styles.mockBadge} title="金额、库存与购买结果均为本地演示状态">
      UI MOCK · 非真实交易
    </span>
  )
}

function WindowCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button className={styles.closeButton} type="button" aria-label="返回窝囊费钱包" onClick={onClick}>
      <IconX size={27} stroke={2.2} aria-hidden="true" />
    </button>
  )
}

function WalletScreen({ onOpenShop }: { onOpenShop: () => void }) {
  const [notice, setNotice] = useState('')

  return (
    <main className={styles.stage} data-ui-screen="09-wallet" data-ui-state="default">
      <PixelSurface className={styles.walletWindow} innerClassName={styles.walletInner} ariaLabel="窝囊费钱包">
        <header className={styles.walletHeader}>
          <div className={styles.titleWithIcon}>
            <img className="pixel-art" src={WALLET_TITLE_ICON_SRC} alt="" />
            <h1>窝囊费</h1>
          </div>
          <div className={styles.headerMeta}>
            <MockBadge />
            <span>2026年8月29日 星期六</span>
            <button
              className={styles.squareIconButton}
              type="button"
              aria-label="打开工作设置演示说明"
              onClick={() => setNotice('工作设置由设置模块接入；本页没有修改真实工资或工时。')}
            >
              <IconSettings size={27} stroke={2} aria-hidden="true" />
            </button>
          </div>
        </header>

        <section className={styles.balanceHero} aria-label="窝囊费 Mock 余额">
          <div>
            <span>你唯一能花的余额</span>
            <strong>¥486.40</strong>
          </div>
          <div className={styles.todayEarned}>
            <IconClock size={54} stroke={1.8} aria-hidden="true" />
            <div>
              <span>今天已获得</span>
              <strong>+¥86.40</strong>
            </div>
          </div>
        </section>

        <div className={styles.walletColumns}>
          <section className={styles.walletCard} aria-labelledby="workday-title">
            <h2 id="workday-title">今天的工作日流程</h2>
            <div className={styles.timelineLabels}>
              <span>上班<strong>09:00</strong></span>
              <span>午休暂停</span>
              <span>下班<strong>18:30</strong></span>
            </div>
            <div className={styles.workdayTimeline} aria-label="当前处于午休暂停">
              <span className={styles.timelineStart} />
              <span className={styles.timelineProgress} />
              <span className={styles.timelinePause}><IconPlayerPauseFilled size={22} aria-hidden="true" /></span>
              <span className={styles.timelineEnd} />
            </div>
            <div className={styles.clockoutCountdown}>
              <IconClock size={50} stroke={1.8} aria-hidden="true" />
              <span>距离下班 <strong>4小时12分</strong></span>
            </div>
          </section>

          <section className={styles.walletCard} aria-labelledby="pool-title">
            <h2 id="pool-title">今日准点奖池</h2>
            <div className={styles.poolTotal}>
              <img className="pixel-art" src={REWARD_POOL_CHEST_SRC} alt="装满像素金币的奖励箱" />
              <strong>¥1,248.00</strong>
            </div>
            <div className={styles.poolMeta}><IconUsers size={22} aria-hidden="true" />当前符合资格　32人</div>
            <div className={styles.poolEstimate}><IconGift size={20} aria-hidden="true" />如果保持资格，预计可得约 <strong>¥39.00</strong></div>
            <ul className={styles.eligibilityList}>
              <li><IconGift size={18} aria-hidden="true" />承诺任务　3/5</li>
              <li><IconCircle size={18} aria-hidden="true" />尚未跑路</li>
              <li><IconCheck className={styles.successIcon} size={20} aria-hidden="true" />会话可结算</li>
            </ul>
            <p>完成剩余 2 项并准点跑路后取得资格</p>
          </section>
        </div>

        <section className={styles.ledgerCard} aria-labelledby="ledger-title">
          <div className={styles.ledgerHeading}>
            <h2 id="ledger-title"><IconFileText size={24} aria-hidden="true" />最近记录</h2>
            <button type="button" onClick={() => setNotice('全部记录由后续账本接口接入；当前仅展示固定 Mock。')}>查看全部记录</button>
          </div>
          <div className={styles.ledgerRows}>
            {WALLET_LEDGER.map((entry) => (
              <div className={styles.ledgerRow} key={entry.id}>
                {entry.kind === 'work' ? <IconBriefcase size={21} aria-hidden="true" /> : null}
                {entry.kind === 'pause' ? <IconCoffee size={21} aria-hidden="true" /> : null}
                {entry.kind === 'purchase' ? <IconShoppingCart size={21} aria-hidden="true" /> : null}
                {entry.kind === 'reward' ? <IconGift size={21} aria-hidden="true" /> : null}
                <span>{entry.label}</span>
                <time>{entry.occurredAt}</time>
                <strong className={entry.kind === 'purchase' ? styles.negativeAmount : styles.positiveAmount}>
                  {entry.displayDelta}
                </strong>
              </div>
            ))}
          </div>
        </section>

        <footer className={styles.walletFooter}>
          <Button variant="primary" onClick={onOpenShop}>
            <IconShoppingBag size={21} aria-hidden="true" />去商店
          </Button>
          <p role="status">{notice || '奖池不会显示单个贡献者的工资或加班金额。'}</p>
        </footer>
      </PixelSurface>
      <img className={`${styles.stageCompanion} ${styles.walletCompanion} pixel-art`} src={CHARACTER_IMAGE_SRC} alt="在钱包窗口旁敲键盘的像素水豚" />
    </main>
  )
}

interface ShopScreenProps {
  mockBalanceMinor: number
  ownedItemIds: Set<string>
  onOwnedItemIdsChange: (next: Set<string>) => void
  onMockBalanceChange: (next: number) => void
  onClose: () => void
  onOpenWardrobe: () => void
}

function ShopScreen({
  mockBalanceMinor,
  ownedItemIds,
  onOwnedItemIdsChange,
  onMockBalanceChange,
  onClose,
  onOpenWardrobe
}: ShopScreenProps) {
  const [category, setCategory] = useState<ShopCategory>('recommended')
  const [selectedItemId, setSelectedItemId] = useState('hat-gold-overtime')
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false)
  const [status, setStatus] = useState('')

  const filteredItems = useMemo(() => {
    if (category === 'character') return SHOP_ITEMS.filter((item) => item.type === 'CHARACTER')
    if (category === 'hat') return SHOP_ITEMS.filter((item) => item.type === 'HAT')
    if (category === 'owned') return SHOP_ITEMS.filter((item) => ownedItemIds.has(item.id))
    return SHOP_ITEMS
  }, [category, ownedItemIds])

  const selectedItem = SHOP_ITEMS.find((item) => item.id === selectedItemId) ?? filteredItems[0] ?? SHOP_ITEMS[0]
  const isOwned = ownedItemIds.has(selectedItem.id)
  const canAfford = selectedItem.displayPriceMinor <= mockBalanceMinor

  function changeCategory(nextCategory: ShopCategory): void {
    setCategory(nextCategory)
    const nextItems = nextCategory === 'character'
      ? SHOP_ITEMS.filter((item) => item.type === 'CHARACTER')
      : nextCategory === 'hat'
        ? SHOP_ITEMS.filter((item) => item.type === 'HAT')
        : nextCategory === 'owned'
          ? SHOP_ITEMS.filter((item) => ownedItemIds.has(item.id))
          : SHOP_ITEMS

    if (nextItems[0]) setSelectedItemId(nextItems[0].id)
  }

  function confirmMockPurchase(): void {
    const nextOwned = new Set(ownedItemIds)
    nextOwned.add(selectedItem.id)
    onOwnedItemIdsChange(nextOwned)
    onMockBalanceChange(mockBalanceMinor - selectedItem.displayPriceMinor)
    setPurchaseDialogOpen(false)
    setStatus(`购买演示完成：${selectedItem.name} 已加入本页 Mock 库存，未写入真实账户。`)
  }

  return (
    <main className={styles.stage} data-ui-screen="10-shop" data-ui-state={category}>
      <PixelSurface className={styles.shopWindow} innerClassName={styles.shopInner} ariaLabel="窝囊费商店">
        <header className={styles.shopHeader}>
          <div className={styles.titleWithIcon}>
            <img className="pixel-art" src={SHOP_TITLE_ICON_SRC} alt="" />
            <h1>商店</h1>
          </div>
          <div className={styles.headerMeta}>
            <MockBadge />
            <strong>窝囊费 {formatMoney(mockBalanceMinor)}</strong>
            <WindowCloseButton onClick={onClose} />
          </div>
        </header>

        <div className={styles.shopBody}>
          <nav className={styles.shopCategories} aria-label="商品分类">
            <button className={category === 'recommended' ? styles.activeCategory : undefined} type="button" onClick={() => changeCategory('recommended')}>
              <IconSparkles size={27} aria-hidden="true" />推荐
            </button>
            <button className={category === 'character' ? styles.activeCategory : undefined} type="button" onClick={() => changeCategory('character')}>
              <img className="pixel-art" src={CHARACTER_IMAGE_SRC} alt="" />角色
            </button>
            <button className={category === 'hat' ? styles.activeCategory : undefined} type="button" onClick={() => changeCategory('hat')}>
              <IconHanger size={27} aria-hidden="true" />帽子
            </button>
            <button className={category === 'owned' ? styles.activeCategory : undefined} type="button" onClick={() => changeCategory('owned')}>
              <IconPackage size={27} aria-hidden="true" />已拥有
            </button>
            <div className={styles.categoryHint}>
              <IconInfoCircle size={18} aria-hidden="true" />
              <span>目录与报价均为固定 UI Mock</span>
            </div>
          </nav>

          <section className={styles.shopGrid} aria-label="商品列表">
            {filteredItems.map((item) => (
              <button
                className={joinClassNames(styles.shopItemCard, selectedItem.id === item.id && styles.selectedItemCard)}
                type="button"
                key={item.id}
                aria-pressed={selectedItem.id === item.id}
                onClick={() => setSelectedItemId(item.id)}
              >
                <span className={joinClassNames(styles.rarityBadge, styles[`rarity${item.rarity}`])}>{RARITY_LABELS[item.rarity]}</span>
                <img className="pixel-art" src={item.imageSrc} alt={item.name} />
                <strong>{item.name}</strong>
                <span className={ownedItemIds.has(item.id) ? styles.ownedLabel : styles.itemPrice}>
                  {ownedItemIds.has(item.id) ? '已拥有' : formatMoney(item.displayPriceMinor)}
                </span>
              </button>
            ))}
          </section>

          <aside className={styles.shopDetail} aria-label="所选商品详情">
            <h2>{selectedItem.name}</h2>
            <p>{selectedItem.description}</p>
            <span className={styles.workTimeExplanation}>{selectedItem.workTimeLabel}</span>
            <div className={styles.productPreview}>
              {selectedItem.type === 'HAT' ? (
                <img className={`${styles.previewHat} pixel-art`} src={selectedItem.imageSrc} alt="" />
              ) : null}
              <img className={`${styles.previewCharacter} pixel-art`} src={CHARACTER_IMAGE_SRC} alt="穿戴预览中的像素水豚" />
            </div>
            {isOwned ? (
              <Button variant="primary" fullWidth onClick={onOpenWardrobe}>去装扮</Button>
            ) : (
              <Button variant="primary" fullWidth disabled={!canAfford} onClick={() => setPurchaseDialogOpen(true)}>
                购买演示 {formatMoney(selectedItem.displayPriceMinor)}
              </Button>
            )}
            <Button fullWidth onClick={() => setStatus('动作预览使用静态角色素材；真实动作 Manifest 不在本次 UI 范围。')}>预览动作说明</Button>
            <p className={styles.shopStatus} role="status">{status || '确认购买只更新当前页面状态，不调用交易接口。'}</p>
          </aside>
        </div>
      </PixelSurface>
      <img className={`${styles.stageCompanion} ${styles.compactCompanion} pixel-art`} src={CHARACTER_IMAGE_SRC} alt="在商店窗口旁敲键盘的像素水豚" />

      {purchaseDialogOpen ? (
        <div className={styles.dialogBackdrop}>
          <section className={styles.purchaseDialog} role="dialog" aria-modal="true" aria-labelledby="purchase-title">
            <div className={styles.dialogIcon}><IconShoppingCart size={34} aria-hidden="true" /></div>
            <h2 id="purchase-title">确认购买演示</h2>
            <p>将使用本页 Mock 窝囊费购买“{selectedItem.name}”。不会扣除真实余额，也不会创建账本或购买记录。</p>
            <strong>{formatMoney(selectedItem.displayPriceMinor)}</strong>
            <div className={styles.dialogActions}>
              <Button onClick={() => setPurchaseDialogOpen(false)}>取消</Button>
              <Button variant="primary" onClick={confirmMockPurchase}>确认演示</Button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  )
}

function findHat(itemId: string): ShopItemMock | undefined {
  return WARDROBE_HATS.find((item) => item.id === itemId)
}

interface WardrobeScreenProps {
  ownedItemIds: Set<string>
  onClose: () => void
}

function WardrobeScreen({ ownedItemIds, onClose }: WardrobeScreenProps) {
  const initialHats = useMemo(
    () => DEFAULT_EQUIPPED_HAT_IDS.filter((id) => ownedItemIds.has(id)),
    [ownedItemIds]
  )
  const [tab, setTab] = useState<WardrobeTab>('hat')
  const [equippedHatIds, setEquippedHatIds] = useState(initialHats)
  const [selectedHatId, setSelectedHatId] = useState(initialHats[0] ?? WARDROBE_HATS[0].id)
  const [draggedHatId, setDraggedHatId] = useState<string | null>(null)
  const [previewAction, setPreviewAction] = useState<'idle' | 'typing' | 'celebrate'>('idle')
  const [status, setStatus] = useState('')

  const ownedHats = WARDROBE_HATS.filter((hat) => ownedItemIds.has(hat.id))

  function toggleHat(hatId: string): void {
    setSelectedHatId(hatId)
    setEquippedHatIds((current) => current.includes(hatId)
      ? current.filter((id) => id !== hatId)
      : [...current, hatId])
    setStatus('装扮已在本页预览中更新，尚未保存到真实账户。')
  }

  function moveHat(hatId: string, direction: 'up' | 'down'): void {
    setEquippedHatIds((current) => {
      const currentIndex = current.indexOf(hatId)
      const nextIndex = direction === 'up' ? currentIndex + 1 : currentIndex - 1
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= current.length) return current
      const next = [...current]
      ;[next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]]
      return next
    })
    setStatus('帽子顺序已在本页 Mock 中调整。')
  }

  function dropHat(targetHatId: string, event: DragEvent<HTMLDivElement>): void {
    event.preventDefault()
    if (!draggedHatId || draggedHatId === targetHatId) return
    setEquippedHatIds((current) => {
      const withoutDragged = current.filter((id) => id !== draggedHatId)
      const targetIndex = withoutDragged.indexOf(targetHatId)
      const next = [...withoutDragged]
      next.splice(targetIndex, 0, draggedHatId)
      return next
    })
    setDraggedHatId(null)
    setStatus('帽子顺序已通过拖动调整；列表仍按从下到上保存。')
  }

  return (
    <main className={styles.stage} data-ui-screen="11-wardrobe" data-ui-state={tab}>
      <PixelSurface className={styles.wardrobeWindow} innerClassName={styles.wardrobeInner} ariaLabel="角色与帽子装扮">
        <header className={styles.wardrobeHeader}>
          <div className={styles.titleWithIcon}>
            <img className="pixel-art" src={WARDROBE_TITLE_ICON_SRC} alt="" />
            <h1>装扮</h1>
          </div>
          <div className={styles.headerMeta}>
            <MockBadge />
            <span>拖动调整顺序；帽子可以继续往上叠。</span>
            <WindowCloseButton onClick={onClose} />
          </div>
        </header>

        <div className={styles.wardrobeBody}>
          <section className={styles.previewPanel} aria-label="装扮预览">
            <div className={styles.wardrobeTabs} role="tablist" aria-label="装扮类型">
              <button type="button" role="tab" aria-selected={tab === 'character'} onClick={() => setTab('character')}>角色</button>
              <button type="button" role="tab" aria-selected={tab === 'hat'} className={tab === 'hat' ? styles.activeWardrobeTab : undefined} onClick={() => setTab('hat')}>帽子</button>
            </div>
            <div className={styles.characterStage}>
              {tab === 'hat' ? (
                <div className={styles.hatTower} aria-label={`已装备 ${equippedHatIds.length} 顶帽子`}>
                  {[...equippedHatIds].reverse().map((hatId) => {
                    const hat = findHat(hatId)
                    return hat ? <img className="pixel-art" src={hat.imageSrc} alt={hat.name} key={hat.id} /> : null
                  })}
                </div>
              ) : null}
              <img className={`${styles.wardrobeCharacter} pixel-art`} src={CHARACTER_IMAGE_SRC} alt="当前装备角色：像素水豚" />
            </div>
            <div className={styles.actionTabs} role="group" aria-label="预览动作">
              <button type="button" aria-pressed={previewAction === 'idle'} onClick={() => setPreviewAction('idle')}>待机</button>
              <button type="button" aria-pressed={previewAction === 'typing'} onClick={() => setPreviewAction('typing')}>敲键盘</button>
              <button type="button" aria-pressed={previewAction === 'celebrate'} onClick={() => setPreviewAction('celebrate')}>庆祝</button>
            </div>
          </section>

          <section className={styles.inventoryPanel} aria-labelledby="inventory-title">
            <h2 id="inventory-title">{tab === 'hat' ? `我的帽子　${ownedHats.length}` : '我的角色　1'}</h2>
            {tab === 'hat' ? (
              <div className={styles.inventoryGrid}>
                {ownedHats.map((hat) => {
                  const equipped = equippedHatIds.includes(hat.id)
                  return (
                    <button
                      className={joinClassNames(styles.appearanceCard, selectedHatId === hat.id && styles.selectedAppearanceCard)}
                      type="button"
                      key={hat.id}
                      aria-pressed={equipped}
                      onClick={() => toggleHat(hat.id)}
                    >
                      <img className="pixel-art" src={hat.imageSrc} alt="" />
                      <strong>{hat.name}</strong>
                      <span>{equipped ? '点击移除' : '点击装备'}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className={styles.characterInventory}>
                <button className={`${styles.appearanceCard} ${styles.selectedAppearanceCard}`} type="button" aria-pressed="true">
                  <img className="pixel-art" src={CHARACTER_IMAGE_SRC} alt="" />
                  <strong>社畜水豚</strong>
                  <span>当前角色</span>
                </button>
              </div>
            )}
          </section>

          <section className={styles.equippedPanel} aria-labelledby="equipped-title">
            <h2 id="equipped-title">{tab === 'hat' ? '已装备 · 从下到上' : '当前角色'}</h2>
            {tab === 'hat' ? (
              <div className={styles.equippedList}>
                {[...equippedHatIds].reverse().map((hatId) => {
                  const hat = findHat(hatId)
                  if (!hat) return null
                  const bottomToTopIndex = equippedHatIds.indexOf(hatId)
                  return (
                    <div
                      className={styles.equippedRow}
                      draggable
                      key={hat.id}
                      onDragStart={() => setDraggedHatId(hat.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => dropHat(hat.id, event)}
                    >
                      <strong>{bottomToTopIndex + 1}</strong>
                      <img className="pixel-art" src={hat.imageSrc} alt="" />
                      <span>{hat.name}</span>
                      <button type="button" aria-label={`将${hat.name}上移`} disabled={bottomToTopIndex === equippedHatIds.length - 1} onClick={() => moveHat(hat.id, 'up')}>
                        <IconArrowUp size={18} aria-hidden="true" />
                      </button>
                      <button type="button" aria-label={`将${hat.name}下移`} disabled={bottomToTopIndex === 0} onClick={() => moveHat(hat.id, 'down')}>
                        <IconArrowDown size={18} aria-hidden="true" />
                      </button>
                      <IconGripVertical className={styles.dragHandle} size={22} aria-hidden="true" />
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className={styles.currentCharacterRow}>
                <img className="pixel-art" src={CHARACTER_IMAGE_SRC} alt="" />
                <div><strong>社畜水豚</strong><span>默认角色 · 已拥有</span></div>
              </div>
            )}
            <p className={styles.stackHint}><IconInfoCircle size={18} aria-hidden="true" />高度过高时缩放至可读下限，再使用纵向滚动</p>
            <Button variant="primary" fullWidth onClick={() => setStatus('装扮保存演示完成；未调用 appearance API，也未写入真实装备记录。')}>保存装扮演示</Button>
            <div className={styles.wardrobeActions}>
              <Button onClick={() => { setEquippedHatIds(initialHats); setStatus('已恢复进入页面时的 Mock 装扮。') }}>恢复上次</Button>
              <Button variant="ghost" onClick={() => { setEquippedHatIds([]); setStatus('已清空本页预览；真实装备未变化。') }}>清空帽子</Button>
            </div>
            <p className={styles.wardrobeStatus} role="status">{status || '所有操作只影响当前页面的演示状态。'}</p>
          </section>
        </div>
      </PixelSurface>
      <img className={`${styles.stageCompanion} ${styles.compactCompanion} pixel-art`} src={CHARACTER_IMAGE_SRC} alt="在装扮窗口旁敲键盘的像素水豚" />
    </main>
  )
}

export function EconomyCustomizationDemo({ initialScreen = 'wallet' }: EconomyCustomizationDemoProps) {
  const [screen, setScreen] = useState<EconomyScreen>(initialScreen)
  const [mockBalanceMinor, setMockBalanceMinor] = useState(48640)
  const [ownedItemIds, setOwnedItemIds] = useState<Set<string>>(() => {
    const initialOwned = new Set(INITIAL_OWNED_ITEM_IDS)
    if (initialScreen === 'wardrobe') {
      DEFAULT_EQUIPPED_HAT_IDS.forEach((id) => initialOwned.add(id))
    }
    return initialOwned
  })

  if (screen === 'shop') {
    return (
      <ShopScreen
        mockBalanceMinor={mockBalanceMinor}
        ownedItemIds={ownedItemIds}
        onOwnedItemIdsChange={setOwnedItemIds}
        onMockBalanceChange={setMockBalanceMinor}
        onClose={() => setScreen('wallet')}
        onOpenWardrobe={() => setScreen('wardrobe')}
      />
    )
  }

  if (screen === 'wardrobe') {
    return <WardrobeScreen ownedItemIds={ownedItemIds} onClose={() => setScreen('wallet')} />
  }

  return <WalletScreen onOpenShop={() => setScreen('shop')} />
}
