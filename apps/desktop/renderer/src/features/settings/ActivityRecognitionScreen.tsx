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
import { PixelSurface } from '../../components/PixelSurface'
import { PixelWindowHeader } from '../../components/PixelWindowHeader'
import styles from './SettingsUiGroup.module.css'

interface ActivityRecognitionScreenProps {
  onOpenPrivacy: () => void
}

type RecognitionMode = 'running' | 'paused' | 'off'

const HISTORY = [
  { time: '10:16', label: '写方案', active: true },
  { time: '10:07', label: '短暂休息', active: false },
  { time: '09:42', label: '查资料', active: false },
  { time: '09:18', label: '写方案', active: false }
]

export function ActivityRecognitionScreen({ onOpenPrivacy }: ActivityRecognitionScreenProps) {
  const [mode, setMode] = useState<RecognitionMode>('running')

  const modeLabel = mode === 'running'
    ? '专注工作 · 36分钟'
    : mode === 'paused'
      ? '识别已暂停'
      : '识别已关闭'

  return (
    <main className={styles.stage} data-ui-screen="14-activity-readonly" data-ui-state={mode}>
      <PixelSurface
        className={styles.activityWindow}
        innerClassName={styles.activityWindowInner}
        ariaLabel="活动识别"
      >
        <PixelWindowHeader />

        <div className={styles.activityContent}>
          <header className={styles.activityHeading}>
            <div>
              <span className={styles.activityEyebrow}>活动识别</span>
              <h1>现在在做什么？</h1>
            </div>
            <span className={styles.activityStatus}>
              <IconSettings size={24} stroke={1.9} aria-hidden="true" />
              {modeLabel}
            </span>
          </header>

          <div className={styles.activityGrid}>
            <section className={styles.activityHistory} aria-label="识别记录">
              <h2>识别记录（最新在上）</h2>
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
              <h2>{mode === 'running' ? '写方案' : mode === 'paused' ? '已暂停' : '未开启'}</h2>
              <dl>
                <div><dt><IconBriefcase size={23} stroke={1.8} aria-hidden="true" />类别</dt><dd>{mode === 'running' ? '工作' : '状态不可用'}</dd></div>
                <div><dt><IconClock size={23} stroke={1.8} aria-hidden="true" />开始时间</dt><dd>{mode === 'running' ? '10:16' : '--'}</dd></div>
                <div><dt><IconStopwatch size={23} stroke={1.8} aria-hidden="true" />持续</dt><dd>{mode === 'running' ? '36分钟' : '--'}</dd></div>
              </dl>
              <p className={styles.readonlyHint}>
                <IconInfoCircle size={20} stroke={1.7} aria-hidden="true" />
                识别结果只用于桌宠动作与专注统计。
              </p>
            </section>
          </div>

          <footer className={styles.activityActions}>
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
            <button className={styles.privacyShortcut} type="button" onClick={onOpenPrivacy}>识别与隐私设置</button>
          </footer>
        </div>
      </PixelSurface>
    </main>
  )
}
