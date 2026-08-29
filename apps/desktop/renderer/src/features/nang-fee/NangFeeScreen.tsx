import { useState } from 'react'
import {
  IconCoins,
  IconTrophy,
  IconReceipt
} from '@tabler/icons-react'
import { LedgerEntry } from './LedgerEntry'
import { PixelWindowHeader } from '../../components/PixelWindowHeader'
import {
  MOCK_USER_ECONOMY,
  MOCK_LEDGER,
  MOCK_OVERTIME_POOL,
  MOCK_TODAY_SUMMARY
} from '../economy/fixtures'
import styles from './NangFeeScreen.module.css'

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}

export function NangFeeScreen() {
  const [economy] = useState(MOCK_USER_ECONOMY)
  const [ledger] = useState(MOCK_LEDGER)
  const [pool] = useState(MOCK_OVERTIME_POOL)
  const [todaySummary] = useState(MOCK_TODAY_SUMMARY)

  return (
    <div className={styles.stage} data-ui-screen="nang-fee">
      <PixelWindowHeader />
      {/* Hero — current balance */}
      <div className={styles.hero}>
        <span className={styles.heroLabel}>窝囊费余额</span>
        <span className={styles.heroBalance}>
          <span className={styles.heroCurrency}>¥</span>
          {economy.balance.toFixed(2)}
        </span>
        <span className={styles.heroRate}>
          日薪{' '}
          <span className={styles.heroRateValue}>¥{economy.dailySalary.toFixed(2)}</span>
          {' → '}
          每小时{' '}
          <span className={styles.heroRateValue}>¥{economy.hourlyRate.toFixed(2)}</span>
        </span>
      </div>

      {/* Today's summary cards */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryCardLabel}>今日收入</span>
          <span
            className={joinClassNames(styles.summaryCardValue, styles.summaryCardPositive)}
          >
            +¥{todaySummary.income.toFixed(2)}
          </span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryCardLabel}>今日支出</span>
          <span
            className={joinClassNames(styles.summaryCardValue, styles.summaryCardNegative)}
          >
            -¥{todaySummary.expense.toFixed(2)}
          </span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryCardLabel}>准点奖励</span>
          <span
            className={joinClassNames(styles.summaryCardValue, styles.summaryCardBonus)}
          >
            +¥{todaySummary.bonusReceived.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Overtime reward pool */}
      <div className={styles.poolSection}>
        <div className={styles.poolIcon}>
          <IconTrophy size={22} stroke={1.8} aria-hidden="true" />
        </div>
        <div className={styles.poolInfo}>
          <span className={styles.poolTitle}>
            加班奖励池 · ¥{pool.totalBalance.toFixed(2)}
          </span>
          <span className={styles.poolDetail}>
            今日 {pool.participantCount} 人准点下班 · 准点下班才能领 🎉
          </span>
        </div>
        <div className={styles.poolReward}>
          <span className={styles.poolRewardLabel}>预估可领</span>
          <span className={styles.poolRewardValue}>
            ¥{pool.estimatedReward.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Ledger list */}
      <div className={styles.ledgerHeader}>
        <IconReceipt size={18} stroke={1.8} aria-hidden="true" />
        <span>账本明细</span>
      </div>

      <div className={styles.ledgerList}>
        {ledger.map((record) => (
          <LedgerEntry key={record.id} record={record} />
        ))}
      </div>
    </div>
  )
}
