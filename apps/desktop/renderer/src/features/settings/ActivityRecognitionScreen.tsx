import { useState } from 'react'
import {
  IconBriefcase,
  IconClock,
  IconInfoCircle,
  IconPlayerPause,
  IconPower,
  IconSettings,
  IconStopwatch
} from '@tabler/icons-react'
import { Button } from '../../components/Button'
import type { SettingsScreenId } from './SettingsShared'
import { SettingsShell } from './SettingsShared'
import styles from './SettingsUiGroup.module.css'

interface ActivityRecognitionScreenProps {
  onNavigate: (screen: SettingsScreenId) => void
}

type RecognitionMode = 'running' | 'paused' | 'off'

const HISTORY = [
  { time: '10:16', label: '写方案', active: true },
  { time: '10:07', label: '短暂休息', active: false },
  { time: '09:42', label: '查资料', active: false },
  { time: '09:18', label: '写方案', active: false }
]

export function ActivityRecognitionScreen({ onNavigate }: ActivityRecognitionScreenProps) {
  const [mode, setMode] = useState<RecognitionMode>('running')

  const modeLabel = mode === 'running'
    ? '专注工作 · 36分钟'
    : mode === 'paused'
      ? '识别已暂停'
      : '识别已关闭'

  return (
    <SettingsShell activeScreen="14" title="活动识别" onNavigate={onNavigate}>
      <div className={styles.activityHeader}>
        <h2>现在在做什么？</h2>
        <span className={styles.activityStatus}>
          <IconSettings size={22} stroke={1.9} aria-hidden="true" />
          {modeLabel}
        </span>
      </div>

      <div className={styles.activityGrid}>
        <section className={styles.activityHistory} aria-label="识别记录">
          <h3>识别记录（最新在上）</h3>
          <ol>
            {HISTORY.map((item) => (
              <li key={`${item.time}-${item.label}`} className={item.active ? styles.historyActive : undefined}>
                <span aria-hidden="true" />
                <time>{item.time}</time>
                <strong>{item.label}</strong>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.currentActivity}>
          <span>当前识别</span>
          <h3>{mode === 'running' ? '写方案' : mode === 'paused' ? '已暂停' : '未开启'}</h3>
          <dl>
            <div><dt><IconBriefcase size={21} stroke={1.8} aria-hidden="true" />类别</dt><dd>{mode === 'running' ? '工作' : '状态不可用'}</dd></div>
            <div><dt><IconClock size={21} stroke={1.8} aria-hidden="true" />开始时间</dt><dd>{mode === 'running' ? '10:16' : '--'}</dd></div>
            <div><dt><IconStopwatch size={21} stroke={1.8} aria-hidden="true" />持续</dt><dd>{mode === 'running' ? '36分钟' : '--'}</dd></div>
          </dl>
          <p className={styles.readonlyHint}>
            <IconInfoCircle size={18} stroke={1.7} aria-hidden="true" />
            识别结果仅用于专注统计。
          </p>
        </section>
      </div>

      <div className={styles.activityActions}>
        <Button
          onClick={() => setMode((current) => current === 'paused' ? 'running' : 'paused')}
          disabled={mode === 'off'}
        >
          <IconPlayerPause size={20} stroke={1.8} aria-hidden="true" />
          {mode === 'paused' ? '继续识别' : '暂停识别'}
        </Button>
        <Button variant="danger" onClick={() => setMode('off')}>
          <IconPower size={20} stroke={1.8} aria-hidden="true" />
          关闭识别
        </Button>
      </div>
    </SettingsShell>
  )
}
