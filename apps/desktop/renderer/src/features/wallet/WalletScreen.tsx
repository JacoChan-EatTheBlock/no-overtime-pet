import { useState } from 'react'
import {
  IconCheck,
  IconChevronRight,
  IconClock,
  IconCoffee,
  IconCoins,
  IconMoneybag,
  IconReceipt,
  IconSettings,
  IconShoppingBag,
  IconTrophy,
  IconUsers,
  IconX
} from '@tabler/icons-react'
import { Button } from '../../components/Button'
import { PixelSurface } from '../../components/PixelSurface'
import { PixelWindowHeader } from '../../components/PixelWindowHeader'
import type { ScreenId } from '../../App'
import styles from './WalletScreen.module.css'

interface WalletScreenProps {
  onClose: () => void
  onNavigate: (id: ScreenId) => void
}

interface LedgerEntry {
  icon: typeof IconCoins
  label: string
  time: string
  amount: string
  isPositive: boolean
}

const LEDGER: LedgerEntry[] = [
  { icon: IconClock, label: '工作时段获得', time: '今天 09:00–11:00', amount: '+¥12.00', isPositive: true },
  { icon: IconCoffee, label: '午休暂停', time: '今天 12:00–13:00', amount: '¥0.00', isPositive: false },
  { icon: IconShoppingBag, label: '购买：加班免死金牌帽', time: '昨天 21:15', amount: '-¥188.00', isPositive: false },
  { icon: IconTrophy, label: '昨日准点奖励', time: '昨天 18:35', amount: '+¥24.50', isPositive: true },
]

const today = new Date()
const fullDate = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`
const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

export function WalletScreen({ onClose, onNavigate }: WalletScreenProps) {
  return (
    <PixelSurface className={styles.window} innerClassName={styles.windowInner} ariaLabel="窝囊费">
      <PixelWindowHeader />
      <div className={styles.content} data-ui-screen="09-wallet">
        {/* ─── Header ─── */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <IconMoneybag size={28} stroke={1.4} className={styles.headerIcon} />
            <h1>窝囊费</h1>
          </div>
          <span className={styles.dateLabel}>{fullDate} {dayNames[today.getDay()]}</span>
          <button type="button" className={styles.gearBtn} aria-label="设置">
            <IconSettings size={22} stroke={1.6} />
          </button>
        </header>

        {/* ─── Balance row ─── */}
        <div className={styles.balanceRow}>
          <div className={styles.balanceCard}>
            <span className={styles.balanceLabel}>你唯一能花的余额</span>
            <span className={styles.balanceAmount}>¥486.40</span>
          </div>
          <div className={styles.todayEarned}>
            <IconClock size={28} stroke={1.4} className={styles.earnedIcon} />
            <div>
              <span className={styles.earnedLabel}>今天已获得</span>
              <span className={styles.earnedAmount}>+¥86.40</span>
            </div>
          </div>
        </div>

        {/* ─── Work progress + reward pool ─── */}
        <div className={styles.middleRow}>
          {/* Left: work progress */}
          <div className={styles.progressCard}>
            <h3>今天的工作日流程</h3>
            <div className={styles.progressBar}>
              <span className={styles.progressLabel}>上班<br />09:00</span>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: '45%' }} />
                <div className={styles.progressPause}>⏸</div>
              </div>
              <span className={styles.progressLabel}>下班<br />18:30</span>
            </div>
            <div className={styles.countdownRow}>
              <IconClock size={22} stroke={1.5} />
              <span>距离下班</span>
              <strong className={styles.countdownValue}>4小时12分</strong>
            </div>
          </div>

          {/* Right: reward pool */}
          <div className={styles.poolCard}>
            <h3>今日准点奖池</h3>
            <div className={styles.poolAmount}>
              <IconTrophy size={28} stroke={1.4} />
              <span>¥1,248.00</span>
            </div>
            <ul className={styles.poolStats}>
              <li><IconUsers size={16} stroke={1.5} /> 当前符合资格 32人</li>
              <li><IconCoins size={16} stroke={1.5} /> 如果现在保持资格，预计可得约 <strong>¥39.00</strong></li>
              <li>🟡 承诺任务 3/5</li>
              <li>⚪ 尚未跑路</li>
              <li><IconCheck size={16} stroke={2} className={styles.checkGreen} /> 会话可结算</li>
            </ul>
            <p className={styles.poolHint}>完成剩余 2 项并准点跑路后取得资格</p>
          </div>
        </div>

        {/* ─── Recent ledger ─── */}
        <section className={styles.ledgerSection}>
          <div className={styles.ledgerHeader}>
            <IconReceipt size={20} stroke={1.5} />
            <h3>最近记录</h3>
            <button type="button" className={styles.viewAllBtn}>
              查看全部记录 <IconChevronRight size={16} stroke={2} />
            </button>
          </div>
          <div className={styles.ledgerList}>
            {LEDGER.map((entry, i) => (
              <div key={i} className={styles.ledgerRow}>
                <entry.icon size={20} stroke={1.5} className={styles.ledgerIcon} />
                <span className={styles.ledgerLabel}>{entry.label}</span>
                <span className={styles.ledgerTime}>{entry.time}</span>
                <span className={entry.isPositive ? styles.amountPositive : styles.amountNegative}>
                  {entry.amount}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Footer ─── */}
        <footer className={styles.footer}>
          <Button variant="primary" onClick={() => onNavigate('shop')}>
            <IconShoppingBag size={18} stroke={1.5} /> 去商店
          </Button>
          <span className={styles.footerNote}>奖池不会显示单个贡献者的工资或加班金额。</span>
        </footer>

        {/* Capybara */}
        <img
          className={`${styles.petCharacter} pixel-art`}
          src="/assets/capybara/idle.png"
          alt=""
        />
      </div>
    </PixelSurface>
  )
}
