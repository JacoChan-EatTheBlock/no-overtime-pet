import { useState, type ReactNode } from 'react'
import {
  IconBell,
  IconBriefcase,
  IconClock,
  IconCoffee,
  IconGift,
  IconListCheck,
  IconMoon,
  IconUsers,
  IconVolume
} from '@tabler/icons-react'
import type { SettingsScreenId } from './SettingsShared'
import {
  InfoStrip,
  MockSystemLink,
  SettingsCard,
  SettingsShell,
  Toggle
} from './SettingsShared'
import styles from './SettingsUiGroup.module.css'

interface NotificationSettingsScreenProps {
  onNavigate: (screen: SettingsScreenId) => void
}

interface NotificationRowProps {
  icon: ReactNode
  title: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function NotificationRow({ icon, title, description, checked, onChange }: NotificationRowProps) {
  return (
    <div className={styles.notificationRow}>
      <span className={styles.rowIcon}>{icon}</span>
      <p><strong>{title}</strong><small>{description}</small></p>
      <Toggle checked={checked} label={title} onChange={onChange} />
    </div>
  )
}

type BannerMode = 'sound' | 'banner' | 'silent'

export function NotificationSettingsScreen({ onNavigate }: NotificationSettingsScreenProps) {
  const [taskStart, setTaskStart] = useState(true)
  const [deadlineRisk, setDeadlineRisk] = useState(true)
  const [lunch, setLunch] = useState(true)
  const [clockOut, setClockOut] = useState(true)
  const [overtime, setOvertime] = useState(true)
  const [friendClockOut, setFriendClockOut] = useState(false)
  const [shopNews, setShopNews] = useState(false)
  const [quietHours, setQuietHours] = useState(true)
  const [mode, setMode] = useState<BannerMode>('banner')
  const [statusMessage, setStatusMessage] = useState('')

  return (
    <SettingsShell activeScreen="16" title="通知" onNavigate={onNavigate}>
      <div className={styles.notificationLayout}>
        <div className={styles.notificationGroups}>
          <SettingsCard title="工作提醒" icon={<IconBell size={21} stroke={1.8} aria-hidden="true" />}>
            <NotificationRow icon={<IconListCheck size={24} stroke={1.7} aria-hidden="true" />} title="下一个任务开始" description="任务完成后，提醒你下一项任务。" checked={taskStart} onChange={setTaskStart} />
            <NotificationRow icon={<IconClock size={24} stroke={1.7} aria-hidden="true" />} title="截止时间风险" description="截止时间临近或超时风险时提醒你。" checked={deadlineRisk} onChange={setDeadlineRisk} />
            <NotificationRow icon={<IconCoffee size={24} stroke={1.7} aria-hidden="true" />} title="午休提醒" description="午休时间到了，记得休息一下。" checked={lunch} onChange={setLunch} />
            <NotificationRow icon={<IconBriefcase size={24} stroke={1.7} aria-hidden="true" />} title="下班提醒" description="下班时间到了，提醒你跑路。" checked={clockOut} onChange={setClockOut} />
            <NotificationRow icon={<IconClock size={24} stroke={1.7} aria-hidden="true" />} title="低频加班提醒" description="连续加班时间过长时，低频提醒你休息。" checked={overtime} onChange={setOvertime} />
          </SettingsCard>

          <SettingsCard title="社交与奖励" icon={<IconGift size={21} stroke={1.8} aria-hidden="true" />}>
            <NotificationRow icon={<IconUsers size={24} stroke={1.7} aria-hidden="true" />} title="好友成功跑路" description="好友下班时，通知你一起休息。" checked={friendClockOut} onChange={setFriendClockOut} />
            <NotificationRow icon={<IconGift size={24} stroke={1.7} aria-hidden="true" />} title="商店上新" description="商店有新物品上架时通知你。" checked={shopNews} onChange={setShopNews} />
          </SettingsCard>

          <SettingsCard title="安静模式" icon={<IconMoon size={21} stroke={1.8} aria-hidden="true" />}>
            <div className={styles.quietRow}>
              <span><IconClock size={24} stroke={1.7} aria-hidden="true" /></span>
              <p><strong>安静时段</strong><small>在设定的时段内，提示将静默，仅做应用内记录。</small></p>
              <time>22:00 — 08:30</time>
              <Toggle checked={quietHours} label="安静时段" onChange={setQuietHours} />
            </div>
          </SettingsCard>
        </div>

        <aside className={styles.notificationPreview} aria-label="通知预览">
          <h2>通知预览</h2>
          <div className={styles.previewBubble}>
            <img className="pixel-art" src="/assets/capybara/idle.png" alt="" />
            <p><small>不要加班 · 现在</small><strong>距离下班还有 38 分钟，建议先收尾当前任务。</strong></p>
          </div>
          <h2>桌面通知表现</h2>
          <p>选择通知在桌面上的显示与提醒方式。</p>
          <div className={styles.bannerModes} role="radiogroup" aria-label="桌面通知表现">
            <button type="button" role="radio" aria-checked={mode === 'sound'} onClick={() => setMode('sound')}><IconVolume size={19} />横幅 + 声音</button>
            <button type="button" role="radio" aria-checked={mode === 'banner'} onClick={() => setMode('banner')}>仅横幅</button>
            <button type="button" role="radio" aria-checked={mode === 'silent'} onClick={() => setMode('silent')}>静默记录</button>
          </div>
          <InfoStrip>Windows 系统通知能力与上述产品开关相互独立。</InfoStrip>
          <MockSystemLink onActivate={() => setStatusMessage('这是 UI Mock：真实版本将打开 Windows 通知设置')}>打开 Windows 通知设置</MockSystemLink>
          <p className={styles.settingsStatus} role="status">{statusMessage}</p>
        </aside>
      </div>
    </SettingsShell>
  )
}
