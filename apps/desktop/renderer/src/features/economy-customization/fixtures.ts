import hatCardboardBag from './assets/hat-cardboard-bag.png'
import hatClockoutHeadband from './assets/hat-clockout-headband.png'
import hatCoffeeMug from './assets/hat-coffee-mug.png'
import hatGoldOvertime from './assets/hat-gold-overtime.png'
import hatWeeklyGhost from './assets/hat-weekly-ghost.png'
import hatWorkBadge from './assets/hat-work-badge.png'
import rewardPoolChest from './assets/reward-pool-chest.png'
import shopTitleIcon from './assets/ui-shop-title-icon.png'
import walletTitleIcon from './assets/ui-wallet-title-icon.png'
import wardrobeTitleIcon from './assets/ui-wardrobe-title-icon.png'

export type EconomyScreen = 'wallet' | 'shop' | 'wardrobe'
export type ShopCategory = 'recommended' | 'character' | 'hat' | 'owned'
export type ShopItemType = 'CHARACTER' | 'HAT'
export type ItemRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC'

export interface ShopItemMock {
  id: string
  type: ShopItemType
  name: string
  description: string
  displayPriceMinor: number
  workTimeLabel: string
  rarity: ItemRarity
  imageSrc: string
}

export interface WalletLedgerMock {
  id: string
  kind: 'work' | 'pause' | 'purchase' | 'reward'
  label: string
  occurredAt: string
  displayDelta: string
}

export const CHARACTER_IMAGE_SRC = '/assets/capybara/idle.png'
export const REWARD_POOL_CHEST_SRC = rewardPoolChest
export const SHOP_TITLE_ICON_SRC = shopTitleIcon
export const WALLET_TITLE_ICON_SRC = walletTitleIcon
export const WARDROBE_TITLE_ICON_SRC = wardrobeTitleIcon

export const SHOP_ITEMS: ShopItemMock[] = [
  {
    id: 'hat-gold-overtime',
    type: 'HAT',
    name: '加班免死金牌帽',
    description: '没有免死效果，但戴着比较安心。',
    displayPriceMinor: 18800,
    workTimeLabel: '相当于当前约 2 小时的窝囊费',
    rarity: 'COMMON',
    imageSrc: hatGoldOvertime
  },
  {
    id: 'hat-weekly-ghost',
    type: 'HAT',
    name: '周一灵魂帽',
    description: '周一到了，灵魂还没完全上线。',
    displayPriceMinor: 9400,
    workTimeLabel: '相当于当前约 1 小时的窝囊费',
    rarity: 'RARE',
    imageSrc: hatWeeklyGhost
  },
  {
    id: 'hat-cardboard-bag',
    type: 'HAT',
    name: '摸鱼纸袋',
    description: '纸袋挡不住进度，但能挡一挡心虚。',
    displayPriceMinor: 14100,
    workTimeLabel: '相当于当前约 1.5 小时的窝囊费',
    rarity: 'COMMON',
    imageSrc: hatCardboardBag
  },
  {
    id: 'hat-coffee-mug',
    type: 'HAT',
    name: '咖啡续命杯',
    description: '杯子不负责续命，只负责表达愿望。',
    displayPriceMinor: 7500,
    workTimeLabel: '相当于当前约 48 分钟的窝囊费',
    rarity: 'UNCOMMON',
    imageSrc: hatCoffeeMug
  },
  {
    id: 'hat-clockout-headband',
    type: 'HAT',
    name: '准点跑路头带',
    description: '提醒自己，跑得快也要先保存。',
    displayPriceMinor: 22000,
    workTimeLabel: '相当于当前约 2 小时 20 分的窝囊费',
    rarity: 'RARE',
    imageSrc: hatClockoutHeadband
  },
  {
    id: 'character-capybara-worker',
    type: 'CHARACTER',
    name: '社畜水豚角色',
    description: '默认打工搭子，情绪稳定，敲键盘很认真。',
    displayPriceMinor: 0,
    workTimeLabel: '默认角色，无需购买',
    rarity: 'EPIC',
    imageSrc: CHARACTER_IMAGE_SRC
  }
]

export const WORK_BADGE_ITEM: ShopItemMock = {
  id: 'hat-work-badge',
  type: 'HAT',
  name: '工牌',
  description: '工牌挂得越高，离下班就越近一点。',
  displayPriceMinor: 4800,
  workTimeLabel: '相当于当前约 30 分钟的窝囊费',
  rarity: 'UNCOMMON',
  imageSrc: hatWorkBadge
}

export const WARDROBE_HATS = [...SHOP_ITEMS.filter((item) => item.type === 'HAT'), WORK_BADGE_ITEM]

export const DEFAULT_EQUIPPED_HAT_IDS = [
  'hat-gold-overtime',
  'hat-weekly-ghost',
  'hat-cardboard-bag',
  'hat-clockout-headband',
  'hat-coffee-mug',
  'hat-work-badge'
]

export const WALLET_LEDGER: WalletLedgerMock[] = [
  {
    id: 'ledger-work',
    kind: 'work',
    label: '工作时段获得',
    occurredAt: '今天 09:00–11:00',
    displayDelta: '+¥12.00'
  },
  {
    id: 'ledger-lunch',
    kind: 'pause',
    label: '午休暂停',
    occurredAt: '今天 12:00–13:00',
    displayDelta: '¥0.00'
  },
  {
    id: 'ledger-purchase',
    kind: 'purchase',
    label: '购买：加班免死金牌帽',
    occurredAt: '昨天 21:15',
    displayDelta: '−¥188.00'
  },
  {
    id: 'ledger-reward',
    kind: 'reward',
    label: '昨日准点奖励',
    occurredAt: '昨天 18:35',
    displayDelta: '+¥24.50'
  }
]

export const INITIAL_OWNED_ITEM_IDS = [
  'character-capybara-worker',
  'hat-work-badge'
]
