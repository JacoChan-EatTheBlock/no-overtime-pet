import { useEffect, useState } from 'react'
import { IconMoodDollar } from '@tabler/icons-react'
import styles from './ScheduleScreen.module.css'

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}

interface NangFeeDisplayProps {
  /** 窝囊费金额（元），0 表示未加班 */
  amount: number
}

function Digit({ value }: { value: string }) {
  const num = value === '.' ? 10 : parseInt(value, 10)

  return (
    <span className={styles.digitSlot} aria-hidden="true">
      <span
        className={styles.digitInner}
        style={{ transform: `translateY(-${(Number.isNaN(num) ? 0 : num) * 1.15}em)` }}
      >
        {Array.from({ length: 11 }, (_, i) => (
          <span key={i} style={{ display: 'block', height: '1.15em', lineHeight: '1.15em' }}>
            {i < 10 ? i : '.'}
          </span>
        ))}
      </span>
    </span>
  )
}

export function NangFeeDisplay({ amount }: NangFeeDisplayProps) {
  const [displayAmount, setDisplayAmount] = useState(0)

  useEffect(() => {
    if (amount === displayAmount) return undefined

    const step = amount > displayAmount ? 0.5 : -0.5
    const timer = window.setInterval(() => {
      setDisplayAmount((current) => {
        const next = current + step
        if ((step > 0 && next >= amount) || (step < 0 && next <= amount)) {
          window.clearInterval(timer)
          return amount
        }
        return Math.round(next * 100) / 100
      })
    }, 50)

    return () => window.clearInterval(timer)
  }, [amount, displayAmount])

  const isZero = displayAmount === 0
  const formatted = displayAmount.toFixed(2)
  const digits = formatted.split('')

  return (
    <div className={styles.nangFee}>
      <span className={styles.nangFeeLabel}>窝囊费</span>
      <span className={styles.nangFeeIcon}>
        <IconMoodDollar size={24} stroke={1.8} aria-hidden="true" />
      </span>
      <span
        className={joinClassNames(styles.nangFeeAmount, isZero ? styles.nangFeeZero : undefined)}
        role="status"
        aria-label={`窝囊费 ${formatted} 元`}
      >
        <span className={styles.nangFeeCurrency}>¥</span>
        {digits.map((d, i) => (
          <Digit key={`${i}-${d}`} value={d} />
        ))}
      </span>
    </div>
  )
}
