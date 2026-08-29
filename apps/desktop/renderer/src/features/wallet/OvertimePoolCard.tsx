// ---------------------------------------------------------------------------
// OvertimePoolCard.tsx — 今日准点奖池卡片
// ---------------------------------------------------------------------------
import { IconCheck, IconCoins, IconTrophy, IconUsers } from '@tabler/icons-react'
import { formatYuan, type OvertimePool } from '../shop/shop.fixtures'
import styles from './WalletScreen.module.css'

interface OvertimePoolCardProps {
  pool: OvertimePool
}

export function OvertimePoolCard({ pool }: OvertimePoolCardProps) {
  const perPerson = pool.todayContributors > 0
    ? pool.totalYuan / pool.todayContributors
    : 0

  return (
    <div className={styles.poolCard}>
      <h3>今日准点奖池</h3>
      <div className={styles.poolAmount}>
        <IconTrophy size={28} stroke={1.4} />
        <span>{formatYuan(pool.totalYuan)}</span>
      </div>
      <ul className={styles.poolStats}>
        <li>
          <IconUsers size={16} stroke={1.5} />
          当前符合资格 {pool.todayContributors}人
        </li>
        <li>
          <IconCoins size={16} stroke={1.5} />
          如果现在保持资格，预计可得约 <strong>{formatYuan(perPerson)}</strong>
        </li>
        <li>🟡 承诺任务 3/5</li>
        <li>⚪ 尚未跑路</li>
        <li>
          <IconCheck size={16} stroke={2} className={styles.checkGreen} />
          会话可结算
        </li>
      </ul>
      <p className={styles.poolHint}>完成剩余 2 项并准点跑路后取得资格</p>
    </div>
  )
}
