// ---------------------------------------------------------------------------
// OvertimePoolCard.tsx — 加班奖励池卡片
// ---------------------------------------------------------------------------
import { IconFlame, IconTrophy, IconUsers } from '@tabler/icons-react'
import { formatYuan, type OvertimePool } from '../shop/shop.fixtures'
import styles from './WalletScreen.module.css'

interface OvertimePoolCardProps {
  pool: OvertimePool
}

export function OvertimePoolCard({ pool }: OvertimePoolCardProps) {
  return (
    <section className={styles.poolCard} aria-label="加班奖励池">
      <header className={styles.poolHeader}>
        <IconFlame size={22} stroke={1.8} aria-hidden="true" />
        <h3>加班奖励池</h3>
      </header>

      <div className={styles.poolStats}>
        <div className={styles.poolStat}>
          <IconTrophy size={20} stroke={1.8} aria-hidden="true" />
          <span className={styles.poolStatValue}>{formatYuan(pool.totalYuan)}</span>
          <span className={styles.poolStatLabel}>池内总额</span>
        </div>
        <div className={styles.poolStat}>
          <IconFlame size={20} stroke={1.8} aria-hidden="true" />
          <span className={styles.poolStatValue}>{pool.todayContributors}</span>
          <span className={styles.poolStatLabel}>今日贡献者</span>
        </div>
        <div className={styles.poolStat}>
          <IconUsers size={20} stroke={1.8} aria-hidden="true" />
          <span className={styles.poolStatValue}>{pool.yesterdayWinners}</span>
          <span className={styles.poolStatLabel}>昨日获奖者</span>
        </div>
      </div>

      <p className={styles.poolRule}>
        📋 规则：加班者扣除的窝囊费进入奖励池，次日由所有<strong>准时下班</strong>的用户平分。不加班就是赚！
      </p>
    </section>
  )
}
