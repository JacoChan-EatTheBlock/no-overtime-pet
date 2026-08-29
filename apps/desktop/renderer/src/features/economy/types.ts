export type ShopCategory = 'character' | 'hat' | 'action-pack'

export type LedgerType = 'work-income' | 'overtime-deduction' | 'on-time-bonus' | 'purchase'

export interface ShopItem {
  id: string
  name: string
  category: ShopCategory
  thumbnail: string
  /** Emoji fallback when thumbnail image is missing */
  emoji: string
  /** Price in nang-hours — multiply by user's hourly nang-fee to get ¥ amount */
  priceInNangHours: number
  description: string
}

export interface EquipmentState {
  characterId: string
  /** Hat IDs ordered bottom → top for stacking display */
  hatIds: string[]
}

export interface LedgerRecord {
  id: string
  type: LedgerType
  description: string
  /** Positive = income, negative = expense */
  amount: number
  /** ISO timestamp */
  timestamp: string
}

export interface UserEconomy {
  /** Current balance in ¥ */
  balance: number
  /** Daily salary in ¥ */
  dailySalary: number
  /** Hourly nang-fee rate in ¥ (dailySalary ÷ workHoursPerDay) */
  hourlyRate: number
}

export interface OvertimePool {
  /** Total pool balance from all overtime deductions in ¥ */
  totalBalance: number
  /** Estimated reward if user clocks out on time today */
  estimatedReward: number
  /** Number of participants who left on time today */
  participantCount: number
}
