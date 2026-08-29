import { usePersistedState } from '../../lib/storage'
import {
  IconChevronRight,
  IconClock,
  IconMoneybag,
  IconReceipt,
  IconSettings,
  IconShoppingBag
} from '@tabler/icons-react'
import { Button } from '../../components/Button' 
import { PixelSurface } from '../../components/PixelSurface'
import { PixelWindowHeader } from '../../components/PixelWindowHeader'
import type { ScreenId } from '../../App'
import { MOCK_WALLET, MOCK_OVERTIME_POOL, WALLET_RECENT_LEDGER } from '../shop/shop.fixtures'
import { OvertimePoolCard } from './OvertimePoolCard'
import { WalletLedgerItem } from './WalletLedgerItem'
import styles from './WalletScreen.module.css'

interface WalletScreenProps {
  onClose: () => void
  onNavigate: (id: ScreenId) => void
}

const today = new Date()
const fullDate = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`
const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

export function WalletScreen({ onClose, onNavigate }: WalletScreenProps) {
  const [wallet] = usePersistedState<typeof MOCK_WALLET>('economy:wallet', MOCK_WALLET)
  const [pool] = usePersistedState<typeof MOCK_OVERTIME_POOL>('economy:overtime-pool', MOCK_OVERTIME_POOL)

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
          <button type="button" className={styles.gearBtn} aria-label="设置" onClick={() => onNavigate('settings')}>
            <IconSettings size={22} stroke={1.6} />
          </button>
        </header>

        {/* ─── Balance row ─── */}
        <div className={styles.balanceRow}>
          <div className={styles.balanceCard}>
            <span className={styles.balanceLabel}>你唯一能花的余额</span>
            <span className={styles.balanceAmount}>¥{wallet.balanceYuan.toFixed(2)}</span>
          </div>
          <div className={styles.todayEarned}>
            <IconClock size={28} stroke={1.4} className={styles.earnedIcon} />
            <div>
              <span className={styles.earnedLabel}>今天已获得</span>
              <span className={styles.earnedAmount}>+¥{wallet.todayIncomeYuan.toFixed(2)}</span>
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

          {/* Right: reward pool — 使用独立组件 */}
          <OvertimePoolCard pool={pool} />
        </div>

        {/* ─── Recent ledger — 使用 WalletLedgerItem 组件 ─── */}
        <section className={styles.ledgerSection}>
          <div className={styles.ledgerHeader}>
            <IconReceipt size={20} stroke={1.5} />
            <h3>最近记录</h3>
            <button type="button" className={styles.viewAllBtn} onClick={() => onNavigate('nangfee')}>
              查看全部记录 <IconChevronRight size={16} stroke={2} />
            </button>
          </div>
          <div className={styles.ledgerList}>
            {WALLET_RECENT_LEDGER.map((entry) => (
              <WalletLedgerItem key={entry.id} entry={entry} />
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
