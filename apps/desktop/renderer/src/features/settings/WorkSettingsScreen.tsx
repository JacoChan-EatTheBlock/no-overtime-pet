import { useCallback, useEffect, useMemo, useState } from 'react'
import { IconClock, IconCoinYen, IconShieldCheck } from '@tabler/icons-react'
import { Button } from '../../components/Button'
import { getWorkSettings, updateWorkSettings } from '../../api/work-settings'
import { ApiRequestError } from '../../api/client'
import type { SettingsScreenId } from './SettingsShared'
import { SettingsShell } from './SettingsShared'
import styles from './SettingsUiGroup.module.css'

interface WorkSettingsScreenProps {
  onNavigate: (screen: SettingsScreenId) => void
}

// ── helpers ──────────────────────────────────────────────────────────────

function minutesFromTime(value: string): number {
  const [hours = '0', minutes = '0'] = value.split(':')
  return Number(hours) * 60 + Number(minutes)
}

function formatPaidTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes === 0 ? `${hours}小时` : `${hours}小时${minutes}分`
}

/** "50000" (分) → "500.00" (元) */
function minorToYuan(minor: string): string {
  const num = Number(minor)
  if (!Number.isFinite(num)) return ''
  return (num / 100).toFixed(2)
}

/** "500" or "500.00" (元) → "50000" (分) */
function yuanToMinor(yuan: string): string {
  const num = Number(yuan)
  if (!Number.isFinite(num) || num < 0) return '0'
  return String(Math.round(num * 100))
}

// ── component ────────────────────────────────────────────────────────────

export function WorkSettingsScreen({ onNavigate }: WorkSettingsScreenProps) {
  // Form fields
  const [workStart, setWorkStart] = useState('09:00')
  const [lunchStart, setLunchStart] = useState('12:00')
  const [lunchEnd, setLunchEnd] = useState('13:00')
  const [workEnd, setWorkEnd] = useState('18:30')
  const [dailySalaryYuan, setDailySalaryYuan] = useState('')  // 元 for display

  // API state
  const [revision, setRevision] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  // ── load settings from API ──────────────────────────────────────────

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setStatusMessage('')
    try {
      const data = await getWorkSettings()
      setWorkStart(data.workStart)
      setWorkEnd(data.workEnd)
      setLunchStart(data.lunchStart)
      setLunchEnd(data.lunchEnd)
      setDailySalaryYuan(minorToYuan(data.dailySalaryMinor))
      setRevision(data.revision)
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : '网络错误，请稍后重试'
      setStatusMessage(`加载失败：${msg}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  // ── preview calculation ─────────────────────────────────────────────

  const preview = useMemo(() => {
    const start = minutesFromTime(workStart)
    const lunchFrom = minutesFromTime(lunchStart)
    const lunchTo = minutesFromTime(lunchEnd)
    const end = minutesFromTime(workEnd)
    const salary = Number(dailySalaryYuan)
    const validOrder = start < lunchFrom && lunchFrom < lunchTo && lunchTo < end
    const paidMinutes = validOrder ? end - start - (lunchTo - lunchFrom) : 0
    const hourlyNangFee = validOrder && salary > 0 ? salary / (paidMinutes / 60) : 0

    return { validOrder, paidMinutes, hourlyNangFee }
  }, [dailySalaryYuan, lunchEnd, lunchStart, workEnd, workStart])

  // ── save settings to API ────────────────────────────────────────────

  async function saveSettings(): Promise<void> {
    if (!preview.validOrder || Number(dailySalaryYuan) <= 0) {
      setStatusMessage('请检查日薪和时间顺序')
      return
    }

    setSaving(true)
    setStatusMessage('')

    try {
      const data = await updateWorkSettings(
        {
          workStart,
          workEnd,
          lunchStart,
          lunchEnd,
          dailySalaryMinor: yuanToMinor(dailySalaryYuan),
        },
        revision,
      )
      setRevision(data.revision)
      setStatusMessage('工作设置已保存，将从下一个工作日生效')
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'REVISION_CONFLICT') {
        setStatusMessage('设置已被其他端修改，正在重新加载…')
        void loadSettings()
      } else {
        const msg = err instanceof ApiRequestError ? err.message : '网络错误，请稍后重试'
        setStatusMessage(`保存失败：${msg}`)
      }
    } finally {
      setSaving(false)
    }
  }

  // ── render ──────────────────────────────────────────────────────────

  return (
    <SettingsShell activeScreen="04" title="工作设置" onNavigate={onNavigate}>
      <p className={styles.workSubtitle}>这些时间由你填写，我们不会从合同或电脑使用情况推断。</p>

      {loading ? (
        <p className={styles.workSubtitle}>加载中…</p>
      ) : (
        <>
          <div className={styles.workGrid}>
            <form className={styles.workForm} onSubmit={(event) => event.preventDefault()}>
              <label>
                <span>日薪（人民币）</span>
                <span className={styles.moneyInput}>
                  <b aria-hidden="true">¥</b>
                  <input
                    aria-label="日薪（人民币）"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={dailySalaryYuan}
                    onChange={(event) => setDailySalaryYuan(event.target.value)}
                    disabled={saving}
                  />
                </span>
              </label>
              <label>
                <span>上班时间</span>
                <input aria-label="上班时间" type="time" value={workStart} onChange={(event) => setWorkStart(event.target.value)} disabled={saving} />
              </label>
              <label>
                <span>午休开始</span>
                <input aria-label="午休开始" type="time" value={lunchStart} onChange={(event) => setLunchStart(event.target.value)} disabled={saving} />
              </label>
              <label>
                <span>午休结束</span>
                <input aria-label="午休结束" type="time" value={lunchEnd} onChange={(event) => setLunchEnd(event.target.value)} disabled={saving} />
              </label>
              <label>
                <span>下班时间</span>
                <input aria-label="下班时间" type="time" value={workEnd} onChange={(event) => setWorkEnd(event.target.value)} disabled={saving} />
              </label>
            </form>

            <aside className={styles.workPreview} aria-label="今日预览">
              <h2>今日预览</h2>
              <div className={styles.previewMetric}>
                <IconClock size={48} stroke={1.55} aria-hidden="true" />
                <p><span>标准带薪</span><strong>{preview.validOrder ? formatPaidTime(preview.paidMinutes) : '--'}</strong></p>
              </div>
              <div className={styles.previewMetric}>
                <IconCoinYen size={50} stroke={1.55} aria-hidden="true" />
                <p><span>每小时窝囊费约</span><strong>{preview.hourlyNangFee ? `¥${preview.hourlyNangFee.toFixed(2)}` : '--'}</strong></p>
              </div>
              <p className={styles.effectiveHint}>
                <IconShieldCheck size={22} stroke={1.7} aria-hidden="true" />
                变更默认从下一个工作日生效
              </p>
            </aside>
          </div>

          <footer className={styles.workActionsInline}>
            <Button variant="primary" onClick={saveSettings} disabled={saving}>
              {saving ? '保存中…' : '保存设置'}
            </Button>
            <p role="status">{statusMessage}</p>
          </footer>
        </>
      )}
    </SettingsShell>
  )
}
