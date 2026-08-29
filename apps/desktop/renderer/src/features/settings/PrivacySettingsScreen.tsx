import { useState, type ReactNode } from 'react'
import {
  IconActivityHeartbeat,
  IconAppWindow,
  IconBrowser,
  IconCamera,
  IconDeviceDesktop,
  IconKeyboard,
  IconSpeakerphone
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

interface PrivacySettingsScreenProps {
  onNavigate: (screen: SettingsScreenId) => void
}

interface PrivacyRowProps {
  icon: ReactNode
  title: string
  collects: string
  excludes: string
  audience: string
  retention: string
  checked: boolean
  systemStatus?: string
  onChange: (checked: boolean) => void
}

function PrivacyRow({
  icon,
  title,
  collects,
  excludes,
  audience,
  retention,
  checked,
  systemStatus,
  onChange
}: PrivacyRowProps) {
  return (
    <div className={styles.privacyRow}>
      <div className={styles.rowIcon}>{icon}</div>
      <div className={styles.privacySummary}>
        <strong>{title}</strong>
        {systemStatus ? <small>{systemStatus}</small> : null}
      </div>
      <dl>
        <div><dt>收集什么</dt><dd>{collects}</dd></div>
        <div><dt>不收集什么</dt><dd>{excludes}</dd></div>
        <div><dt>谁能看到</dt><dd>{audience}</dd></div>
        <div><dt>保留多久</dt><dd>{retention}</dd></div>
      </dl>
      <Toggle checked={checked} label={title} onChange={onChange} />
    </div>
  )
}

export function PrivacySettingsScreen({ onNavigate }: PrivacySettingsScreenProps) {
  const [inputSummary, setInputSummary] = useState(true)
  const [foregroundApps, setForegroundApps] = useState(true)
  const [windowContext, setWindowContext] = useState(false)
  const [browserCategory, setBrowserCategory] = useState(false)
  const [screenVision, setScreenVision] = useState(false)
  const [friendBroadcast, setFriendBroadcast] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')

  return (
    <SettingsShell activeScreen="15" title="识别与隐私" onNavigate={onNavigate}>
      <SettingsCard className={styles.privacyCard}>
        <PrivacyRow
          icon={<IconKeyboard size={27} stroke={1.7} aria-hidden="true" />}
          title="输入活跃度汇总"
          collects="按键次数、活跃时长"
          excludes="按键内容、鼠标坐标"
          audience="仅你自己"
          retention="30 天"
          checked={inputSummary}
          systemStatus="Input Monitoring：Mock 已允许"
          onChange={setInputSummary}
        />
        <PrivacyRow
          icon={<IconAppWindow size={27} stroke={1.7} aria-hidden="true" />}
          title="前台应用类别"
          collects="应用类别、使用时长"
          excludes="文件内容、操作内容"
          audience="仅你自己"
          retention="30 天"
          checked={foregroundApps}
          onChange={setForegroundApps}
        />
        <PrivacyRow
          icon={<IconDeviceDesktop size={27} stroke={1.7} aria-hidden="true" />}
          title="本地窗口上下文"
          collects="窗口类别"
          excludes="窗口内容、文本内容"
          audience="仅你自己"
          retention="7 天"
          checked={windowContext}
          systemStatus="Accessibility：Mock 未允许"
          onChange={setWindowContext}
        />
        <PrivacyRow
          icon={<IconBrowser size={27} stroke={1.7} aria-hidden="true" />}
          title="浏览器网站类别"
          collects="网站类别、停留时长"
          excludes="网址、页面内容"
          audience="仅你自己"
          retention="30 天"
          checked={browserCategory}
          onChange={setBrowserCategory}
        />
        <PrivacyRow
          icon={<IconCamera size={27} stroke={1.7} aria-hidden="true" />}
          title="高准确截图识别"
          collects="打码后的当前屏幕"
          excludes="本地文件、剪贴板"
          audience="在线模型"
          retention="不留存"
          checked={screenVision}
          systemStatus="Screen Recording：Mock 未允许"
          onChange={setScreenVision}
        />
        <PrivacyRow
          icon={<IconSpeakerphone size={27} stroke={1.7} aria-hidden="true" />}
          title="允许好友查看我的活动状态"
          collects="泛化状态、桌宠动作"
          excludes="应用详情、内容数据"
          audience="已接受好友"
          retention="短时状态"
          checked={friendBroadcast}
          onChange={setFriendBroadcast}
        />
      </SettingsCard>

      <InfoStrip>
        默认只在本机处理；具体按键、窗口正文、完整网址和原始截图不会写入页面 Mock 状态。
      </InfoStrip>

      <div className={styles.settingsFooterRow}>
        <MockSystemLink onActivate={() => setStatusMessage('这是 UI Mock：真实版本将打开 macOS 隐私与安全设置')} />
        <button className={styles.activityEntry} type="button" onClick={() => onNavigate('14')}>
          <IconActivityHeartbeat size={19} stroke={1.8} aria-hidden="true" />
          查看当前识别
        </button>
      </div>
      <p className={styles.settingsStatus} role="status">{statusMessage}</p>
    </SettingsShell>
  )
}
