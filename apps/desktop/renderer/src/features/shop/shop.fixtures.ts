// ---------------------------------------------------------------------------
// shop.fixtures.ts — 商店 / 钱包模拟数据
// ---------------------------------------------------------------------------

/** 商品类型 */
export type ShopItemType = 'character' | 'hat' | 'action_pack'

/** 商品数据 */
export interface ShopItem {
  id: string
  sku: string
  name: string
  description: string
  itemType: ShopItemType
  /** 兑换该商品需要的工时（毫秒） */
  requiredWorkMs: number
  thumbnailPath: string
  /** Emoji fallback when thumbnail fails to load */
  emoji: string
}

/** 钱包账本记录类型 */
export type LedgerEntryKind =
  | 'work_income'
  | 'overtime_penalty'
  | 'overtime_pool_reward'
  | 'purchase'
  | 'refund'
  | 'lunch_break'

/** 钱包账本记录 */
export interface LedgerEntry {
  id: string
  kind: LedgerEntryKind
  description: string
  /** 正数 = 收入，负数 = 支出 */
  amountYuan: number
  /** 可选的显示用时间标签，覆盖 timestamp 的默认格式化 */
  timeLabel?: string
  timestamp: string
}

/** 钱包概览 */
export interface WalletSnapshot {
  balanceYuan: number
  todayIncomeYuan: number
  todayOvertimePenaltyYuan: number
}

/** 加班奖励池 */
export interface OvertimePool {
  totalYuan: number
  todayContributors: number
  yesterdayWinners: number
}

// ── 用户每毫秒窝囊费率（假设日薪 500, 8h 工作日） ─────────────
export const WRETCHED_FEE_PER_MS = 500 / (8 * 3600 * 1000) // ≈ 0.00001736

/** 把工时毫秒换算成"窝囊费"人民币金额 */
export function workMsToYuan(ms: number): number {
  return Math.round(ms * WRETCHED_FEE_PER_MS * 100) / 100
}

/** 格式化金额显示 */
export function formatYuan(amount: number): string {
  return `¥${Math.abs(amount).toFixed(2)}`
}

// ── 模拟商品列表 ───────────────────────────────────────────────

export const SHOP_ITEMS: ShopItem[] = [
  // 角色 ×3
  {
    id: 'char-capybara',
    sku: 'CHAR-001',
    name: '水豚打工人',
    description:
      '经典水豚角色。佛系表情，敲代码有条不紊，从不加班。它的座右铭是：「该走走，该摸摸。」',
    itemType: 'character',
    requiredWorkMs: 0,
    thumbnailPath: '/assets/capybara/idle.png',
    emoji: '🦫'
  },
  {
    id: 'char-shiba',
    sku: 'CHAR-002',
    name: '柴犬摸鱼王',
    description:
      '以秒为单位计算摸鱼时间的柴犬。偶尔抖一下腿，假装在思考人生。解锁后可切换为主角色。',
    itemType: 'character',
    requiredWorkMs: 2 * 3600 * 1000 // 2 小时工时
    ,
    thumbnailPath: '/assets/capybara/idle.png',
    emoji: '🐕'
  },
  {
    id: 'char-penguin',
    sku: 'CHAR-003',
    name: '企鹅社畜',
    description:
      '穿西装的企鹅，走路摇摇晃晃但从不迟到。口头禅：「今天又是元气满满地想下班的一天。」',
    itemType: 'character',
    requiredWorkMs: 4 * 3600 * 1000 // 4 小时工时
    ,
    thumbnailPath: '/assets/capybara/idle.png',
    emoji: '🐧'
  },

  // 帽子 ×5
  {
    id: 'hat-hardhat',
    sku: 'HAT-001',
    name: '安全帽',
    description: '工地风安全帽。虽然你敲的是键盘，但安全意识不能少。防秃（心理上）。',
    itemType: 'hat',
    requiredWorkMs: 30 * 60 * 1000, // 30 分钟
    thumbnailPath: '/assets/capybara/idle.png',
    emoji: '⛑️'
  },
  {
    id: 'hat-crown',
    sku: 'HAT-002',
    name: '摸鱼皇冠',
    description: '头戴皇冠，摸鱼合法。全公司最会划水的那个人，非你莫属。',
    itemType: 'hat',
    requiredWorkMs: 1 * 3600 * 1000, // 1 小时
    thumbnailPath: '/assets/capybara/idle.png',
    emoji: '👑'
  },
  {
    id: 'hat-leaf',
    sku: 'HAT-003',
    name: '树叶伪装',
    description: '头顶一片叶子，假装自己是植物。老板路过时自动启用。',
    itemType: 'hat',
    requiredWorkMs: 20 * 60 * 1000, // 20 分钟
    thumbnailPath: '/assets/capybara/idle.png',
    emoji: '🍃'
  },
  {
    id: 'hat-halo',
    sku: 'HAT-004',
    name: '天使光环',
    description: '头顶光环，彰显你从不加班的圣洁灵魂。',
    itemType: 'hat',
    requiredWorkMs: 2 * 3600 * 1000, // 2 小时
    thumbnailPath: '/assets/capybara/idle.png',
    emoji: '😇'
  },
  {
    id: 'hat-catears',
    sku: 'HAT-005',
    name: '猫耳头箍',
    description: '可爱即正义。戴上猫耳，同事都不好意思给你派活了。',
    itemType: 'hat',
    requiredWorkMs: 45 * 60 * 1000, // 45 分钟
    thumbnailPath: '/assets/capybara/idle.png',
    emoji: '😺'
  },

  // 动作包 ×2
  {
    id: 'act-dance',
    sku: 'ACT-001',
    name: '下班街舞',
    description:
      '解锁"到点下班"专属街舞动画。每到下班时间，你的桌宠会跳一段 breaking。',
    itemType: 'action_pack',
    requiredWorkMs: 3 * 3600 * 1000, // 3 小时
    thumbnailPath: '/assets/capybara/idle.png',
    emoji: '💃'
  },
  {
    id: 'act-nap',
    sku: 'ACT-002',
    name: '午睡套装',
    description:
      '解锁午休时段专属打盹动画。桌宠会铺好小毯子，戴上眼罩，zZZ…',
    itemType: 'action_pack',
    requiredWorkMs: 1.5 * 3600 * 1000, // 1.5 小时
    thumbnailPath: '/assets/capybara/idle.png',
    emoji: '😴'
  }
]

// ── 按类型分组的快捷访问 ─────────────────────────────────────
export const CHARACTERS = SHOP_ITEMS.filter((i) => i.itemType === 'character')
export const HATS = SHOP_ITEMS.filter((i) => i.itemType === 'hat')
export const ACTION_PACKS = SHOP_ITEMS.filter((i) => i.itemType === 'action_pack')

// ── 分类 Tab 定义 ────────────────────────────────────────────
export type ShopCategory = 'character' | 'hat' | 'action_pack'

export interface ShopCategoryTab {
  id: ShopCategory
  label: string
}

export const SHOP_CATEGORY_TABS: ShopCategoryTab[] = [
  { id: 'character', label: '角色' },
  { id: 'hat', label: '帽子' },
  { id: 'action_pack', label: '动作包' }
]

// ── 模拟拥有状态 ─────────────────────────────────────────────
export const OWNED_ITEM_IDS = new Set<string>([
  'char-capybara', // 默认角色
  'hat-hardhat',
  'hat-leaf'
])

// ── 模拟装备状态 ─────────────────────────────────────────────
export const DEFAULT_EQUIPPED_CHARACTER = 'char-capybara'
export const DEFAULT_EQUIPPED_HATS: string[] = ['hat-leaf', 'hat-hardhat']

// ── 模拟钱包数据 ─────────────────────────────────────────────
export const MOCK_WALLET: WalletSnapshot = {
  balanceYuan: 486.40,
  todayIncomeYuan: 86.40,
  todayOvertimePenaltyYuan: 0
}

export const MOCK_OVERTIME_POOL: OvertimePool = {
  totalYuan: 1248.00,
  todayContributors: 32,
  yesterdayWinners: 28
}

export const MOCK_LEDGER: LedgerEntry[] = [
  {
    id: 'led-1',
    kind: 'work_income',
    description: '上午专注工作 3h12m',
    amountYuan: 33.33,
    timestamp: '2025-07-15T12:00:00'
  },
  {
    id: 'led-2',
    kind: 'work_income',
    description: '下午专注工作 2h48m',
    amountYuan: 29.17,
    timestamp: '2025-07-15T18:00:00'
  },
  {
    id: 'led-3',
    kind: 'purchase',
    description: '购买「安全帽」',
    amountYuan: -5.21,
    timestamp: '2025-07-15T12:30:00'
  },
  {
    id: 'led-4',
    kind: 'overtime_penalty',
    description: '加班扣减 45min',
    amountYuan: -7.81,
    timestamp: '2025-07-14T21:30:00'
  },
  {
    id: 'led-5',
    kind: 'overtime_pool_reward',
    description: '加班奖励池瓜分',
    amountYuan: 15.6,
    timestamp: '2025-07-14T09:00:00'
  },
  {
    id: 'led-6',
    kind: 'work_income',
    description: '上午专注工作 4h00m',
    amountYuan: 41.67,
    timestamp: '2025-07-14T12:00:00'
  },
  {
    id: 'led-7',
    kind: 'purchase',
    description: '购买「树叶伪装」',
    amountYuan: -3.47,
    timestamp: '2025-07-13T15:20:00'
  },
  {
    id: 'led-8',
    kind: 'refund',
    description: '退还「猫耳头箍」',
    amountYuan: 7.81,
    timestamp: '2025-07-13T10:00:00'
  }
]

/** 账本条目种类 → 中文标签 */
export const LEDGER_KIND_LABELS: Record<LedgerEntryKind, string> = {
  work_income: '工作收入',
  overtime_penalty: '加班扣减',
  overtime_pool_reward: '奖励池瓜分',
  purchase: '商店购买',
  refund: '商品退还',
  lunch_break: '午休暂停'
}

/** 账本条目种类 → emoji 图标 */
export const LEDGER_KIND_ICONS: Record<LedgerEntryKind, string> = {
  work_income: '💰',
  overtime_penalty: '🔥',
  overtime_pool_reward: '🎁',
  purchase: '🛍️',
  refund: '↩️',
  lunch_break: '☕'
}

// —— 钱包界面「最近记录」（匹配设计稿 09-wallet） ——————————————————
export const WALLET_RECENT_LEDGER: LedgerEntry[] = [
  {
    id: 'wl-1',
    kind: 'work_income',
    description: '工作时段获得',
    amountYuan: 12.00,
    timeLabel: '今天 09:00–11:00',
    timestamp: new Date().toISOString()
  },
  {
    id: 'wl-2',
    kind: 'lunch_break',
    description: '午休暂停',
    amountYuan: 0,
    timeLabel: '今天 12:00–13:00',
    timestamp: new Date().toISOString()
  },
  {
    id: 'wl-3',
    kind: 'purchase',
    description: '购买：加班免死金牌帽',
    amountYuan: -188.00,
    timeLabel: '昨天 21:15',
    timestamp: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'wl-4',
    kind: 'overtime_pool_reward',
    description: '昨日准点奖励',
    amountYuan: 24.50,
    timeLabel: '昨天 18:35',
    timestamp: new Date(Date.now() - 86400000).toISOString()
  }
]
