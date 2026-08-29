import { useMemo, useState } from 'react'
import { IconClock, IconCoinYen, IconShieldCheck } from '@tabler/icons-react'
import { Button } from '../../components/Button'
import { PixelSurface } from '../../components/PixelSurface'
import type { SettingsScreenId } from './SettingsShared'
import styles from './SettingsUiGroup.module.css'

interface WorkSettingsScreenProps {
  onNavigate: (screen: SettingsScreenId) => void
}

function minutesFromTime(value: string): number {
  const [hours = '0', minutes = '0'] = value.split(':')
  return Number(hours) * 60 + Number(minutes)
}

function formatPaidTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes === 0 ? `${hours}小时` : `${hours}小时${minutes}分`
}

export function WorkSettingsScreen({ onNavigate }: WorkSettingsScreenProps) {
  const [timeZone, setTimeZone] = useState('Asia/Taipei')
  const [dailySalary, setDailySalary] = useState('800')
  const [workStart, setWorkStart] = useState('09:00')
  const [lunchStart, setLunchStart] = useState('12:00')
  const [lunchEnd, setLunchEnd] = useState('13:00')
  const [workEnd, setWorkEnd] = useState('18:30')
  const [statusMessage, setStatusMessage] = useState('')

  const preview = useMemo(() => {
    const start = minutesFromTime(workStart)
    const lunchFrom = minutesFromTime(lunchStart)
    const lunchTo = minutesFromTime(lunchEnd)
    const end = minutesFromTime(workEnd)
    const salary = Number(dailySalary)
    const validOrder = start < lunchFrom && lunchFrom < lunchTo && lunchTo < end
    const paidMinutes = validOrder ? end - start - (lunchTo - lunchFrom) : 0
    const hourlyNangFee = validOrder && salary > 0 ? salary / (paidMinutes / 60) : 0

    return { validOrder, paidMinutes, hourlyNangFee }
  }, [dailySalary, lunchEnd, lunchStart, workEnd, workStart])

  function saveSettings(): void {
    if (!preview.validOrder || Number(dailySalary) <= 0) {
      setStatusMessage('请检查日薪和时间顺序')
      return
    }

    setStatusMessage('工作设置已保存为 Mock 状态，将从下一个工作日生效')
  }

  return (
    <main className={styles.stage} data-ui-screen="04-work-settings" data-ui-state="default">
      <PixelSurface
        className={styles.workWindow}
        innerClassName={styles.workWindowInner}
        ariaLabel="工作设置"
      >
        <header className={styles.workHeading}>
          <div>
            <h1>先把下班时间说清楚</h1>
            <p>这些时间由你填写，我们不会从合同或电脑使用情况推断。</p>
          </div>
          <div className={styles.setupProgress} aria-label="设置第 1 步，共 2 步">
            <span>设置 1/2</span>
            <i className={styles.progressActive} />
            <i />
          </div>
        </header>

        <div className={styles.workGrid}>
          <form className={styles.workForm} onSubmit={(event) => event.preventDefault()}>
            <label>
              <span>时区</span>
              <select aria-label="时区" value={timeZone} onChange={(event) => setTimeZone(event.target.value)}>
                <option value="Asia/Taipei">Asia/Taipei</option>
                <option value="Asia/Shanghai">Asia/Shanghai</option>
                <option value="Asia/Hong_Kong">Asia/Hong_Kong</option>
              </select>
            </label>
            <label>
              <span>日薪（人民币）</span>
              <span className={styles.moneyInput}>
                <b aria-hidden="true">¥</b>
                <input
                  aria-label="日薪（人民币）"
                  type="number"
                  min="1"
                  step="1"
                  value={dailySalary}
                  onChange={(event) => setDailySalary(event.target.value)}
                />
              </span>
            </label>
            <label>
              <span>上班时间</span>
              <input aria-label="上班时间" type="time" value={workStart} onChange={(event) => setWorkStart(event.target.value)} />
            </label>
            <label>
              <span>午休开始</span>
              <input aria-label="午休开始" type="time" value={lunchStart} onChange={(event) => setLunchStart(event.target.value)} />
            </label>
            <label>
              <span>午休结束</span>
              <input aria-label="午休结束" type="time" value={lunchEnd} onChange={(event) => setLunchEnd(event.target.value)} />
            </label>
            <label>
              <span>下班时间</span>
              <input aria-label="下班时间" type="time" value={workEnd} onChange={(event) => setWorkEnd(event.target.value)} />
            </label>
          </form>

          <aside className={styles.workPreview} aria-label="今日预览">
            <h2>今日预览</h2>
            <div className={styles.previewMetric}>
              <IconClock size={52} stroke={1.55} aria-hidden="true" />
              <p><span>标准带薪</span><strong>{preview.validOrder ? formatPaidTime(preview.paidMinutes) : '--'}</strong></p>
            </div>
            <div className={styles.previewMetric}>
              <IconCoinYen size={54} stroke={1.55} aria-hidden="true" />
              <p><span>每小时窝囊费约</span><strong>{preview.hourlyNangFee ? `¥${preview.hourlyNangFee.toFixed(2)}` : '--'}</strong></p>
            </div>
            <p className={styles.effectiveHint}>
              <IconShieldCheck size={24} stroke={1.7} aria-hidden="true" />
              变更默认从下一个工作日生效
            </p>
            <img className={`${styles.workPet} pixel-art`} src="/assets/capybara/idle.png" alt="坐在电脑前工作的像素水豚" />
          </aside>
        </div>

        <footer className={styles.workActions}>
          <Button variant="primary" onClick={saveSettings}>保存并继续</Button>
          <Button onClick={() => onNavigate('15')}>稍后设置</Button>
          <p role="status">{statusMessage}</p>
        </footer>
      </PixelSurface>
    </main>
  )
}
