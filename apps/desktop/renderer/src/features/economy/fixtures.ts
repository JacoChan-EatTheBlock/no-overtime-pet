import type {
  ShopItem,
  EquipmentState,
  LedgerRecord,
  UserEconomy,
  OvertimePool
} from './types'

/* ------------------------------------------------------------------ */
/*  User economy state                                                 */
/* ------------------------------------------------------------------ */

export const MOCK_USER_ECONOMY: UserEconomy = {
  balance: 1234.56,
  dailySalary: 800,
  hourlyRate: 100 // 800 ÷ 8h
}

/* ------------------------------------------------------------------ */
/*  Shop catalogue                                                     */
/* ------------------------------------------------------------------ */

export const MOCK_SHOP_ITEMS: ShopItem[] = [
  // ── Characters ───────────────────────────────────────────────────
  {
    id: 'char-capybara',
    name: '水豚',
    category: 'character',
    thumbnail: '/assets/capybara/idle.png',
    emoji: '🦫',
    priceInNangHours: 0,
    description: '默认角色，天生佛系'
  },
  {
    id: 'char-shiba',
    name: '柴犬',
    category: 'character',
    thumbnail: '/assets/capybara/idle.png',
    emoji: '🐕',
    priceInNangHours: 2,
    description: '忠诚可靠，准点下班守护者'
  },
  {
    id: 'char-cat',
    name: '橘猫',
    category: 'character',
    thumbnail: '/assets/capybara/idle.png',
    emoji: '🐱',
    priceInNangHours: 3,
    description: '到点就走，绝不多待一秒'
  },
  {
    id: 'char-penguin',
    name: '企鹅',
    category: 'character',
    thumbnail: '/assets/capybara/idle.png',
    emoji: '🐧',
    priceInNangHours: 5,
    description: '冷静自持，拒绝内卷'
  },
  {
    id: 'char-panda',
    name: '熊猫',
    category: 'character',
    thumbnail: '/assets/capybara/idle.png',
    emoji: '🐼',
    priceInNangHours: 8,
    description: '国宝级摸鱼选手'
  },

  // ── Hats ─────────────────────────────────────────────────────────
  {
    id: 'hat-hardhat',
    name: '安全帽',
    category: 'hat',
    thumbnail: '/assets/capybara/idle.png',
    emoji: '⛑️',
    priceInNangHours: 1,
    description: '打工人的基本装备'
  },
  {
    id: 'hat-crown',
    name: '皇冠',
    category: 'hat',
    thumbnail: '/assets/capybara/idle.png',
    emoji: '👑',
    priceInNangHours: 4,
    description: '准点下班之王'
  },
  {
    id: 'hat-flower',
    name: '小花',
    category: 'hat',
    thumbnail: '/assets/capybara/idle.png',
    emoji: '🌸',
    priceInNangHours: 2,
    description: '办公室里的一朵花'
  },
  {
    id: 'hat-chef',
    name: '厨师帽',
    category: 'hat',
    thumbnail: '/assets/capybara/idle.png',
    emoji: '👨‍🍳',
    priceInNangHours: 3,
    description: '今天中午吃什么？'
  },
  {
    id: 'hat-party',
    name: '派对帽',
    category: 'hat',
    thumbnail: '/assets/capybara/idle.png',
    emoji: '🎉',
    priceInNangHours: 2,
    description: '每天都是下班庆祝日'
  },
  {
    id: 'hat-halo',
    name: '天使光环',
    category: 'hat',
    thumbnail: '/assets/capybara/idle.png',
    emoji: '😇',
    priceInNangHours: 6,
    description: '不加班的天使'
  },

  // ── Action packs ─────────────────────────────────────────────────
  {
    id: 'action-dance',
    name: '蹦迪动作包',
    category: 'action-pack',
    thumbnail: '/assets/capybara/idle.png',
    emoji: '💃',
    priceInNangHours: 3,
    description: '下班铃一响立刻蹦迪'
  },
  {
    id: 'action-sleep',
    name: '摸鱼动作包',
    category: 'action-pack',
    thumbnail: '/assets/capybara/idle.png',
    emoji: '😴',
    priceInNangHours: 2,
    description: '假装在工作其实在摸鱼'
  },
  {
    id: 'action-celebrate',
    name: '庆祝动作包',
    category: 'action-pack',
    thumbnail: '/assets/capybara/idle.png',
    emoji: '🎊',
    priceInNangHours: 4,
    description: '准点下班的仪式感'
  },
  {
    id: 'action-yoga',
    name: '瑜伽动作包',
    category: 'action-pack',
    thumbnail: '/assets/capybara/idle.png',
    emoji: '🧘',
    priceInNangHours: 3,
    description: 'Work-life balance 从拉伸开始'
  }
]

/* ------------------------------------------------------------------ */
/*  Owned items & equipment                                            */
/* ------------------------------------------------------------------ */

export const MOCK_OWNED_ITEM_IDS: string[] = [
  'char-capybara',
  'char-shiba',
  'hat-hardhat',
  'hat-flower',
  'action-sleep'
]

export const MOCK_EQUIPMENT: EquipmentState = {
  characterId: 'char-capybara',
  hatIds: ['hat-hardhat', 'hat-flower']
}

/* ------------------------------------------------------------------ */
/*  Ledger records                                                     */
/* ------------------------------------------------------------------ */

export const MOCK_LEDGER: LedgerRecord[] = [
  {
    id: 'l1',
    type: 'work-income',
    description: '今日工作收入（8 小时）',
    amount: 800,
    timestamp: '2025-01-15T18:00:00'
  },
  {
    id: 'l2',
    type: 'on-time-bonus',
    description: '准点下班奖励',
    amount: 66.5,
    timestamp: '2025-01-15T18:00:00'
  },
  {
    id: 'l3',
    type: 'purchase',
    description: '购买「柴犬」角色',
    amount: -200,
    timestamp: '2025-01-15T12:30:00'
  },
  {
    id: 'l4',
    type: 'work-income',
    description: '昨日工作收入（8 小时）',
    amount: 800,
    timestamp: '2025-01-14T18:00:00'
  },
  {
    id: 'l5',
    type: 'overtime-deduction',
    description: '加班扣除（1.5 小时）',
    amount: -150,
    timestamp: '2025-01-14T19:30:00'
  },
  {
    id: 'l6',
    type: 'purchase',
    description: '购买「安全帽」帽子',
    amount: -100,
    timestamp: '2025-01-14T13:00:00'
  },
  {
    id: 'l7',
    type: 'on-time-bonus',
    description: '准点下班奖励',
    amount: 52.3,
    timestamp: '2025-01-13T18:00:00'
  },
  {
    id: 'l8',
    type: 'work-income',
    description: '工作收入（8 小时）',
    amount: 800,
    timestamp: '2025-01-13T18:00:00'
  },
  {
    id: 'l9',
    type: 'purchase',
    description: '购买「小花」帽子',
    amount: -200,
    timestamp: '2025-01-13T12:00:00'
  },
  {
    id: 'l10',
    type: 'purchase',
    description: '购买「摸鱼动作包」',
    amount: -200,
    timestamp: '2025-01-12T15:00:00'
  }
]

/* ------------------------------------------------------------------ */
/*  Overtime reward pool                                               */
/* ------------------------------------------------------------------ */

export const MOCK_OVERTIME_POOL: OvertimePool = {
  totalBalance: 4280.5,
  estimatedReward: 66.5,
  participantCount: 23
}

/* ------------------------------------------------------------------ */
/*  Today's summary (derived)                                          */
/* ------------------------------------------------------------------ */

export const MOCK_TODAY_SUMMARY = {
  income: 800,
  expense: 200,
  bonusReceived: 66.5
}
