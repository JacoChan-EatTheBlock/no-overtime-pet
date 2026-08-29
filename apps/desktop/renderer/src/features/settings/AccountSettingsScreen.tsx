import { useState } from 'react'
import {
  IconCopy,
  IconEdit,
  IconInfoCircle,
  IconKey,
  IconLock,
  IconLogout,
  IconTrash
} from '@tabler/icons-react'
import { Button } from '../../components/Button'
import type { SettingsScreenId } from './SettingsShared'
import {
  InfoStrip,
  MockDialog,
  SettingsCard,
  SettingsShell
} from './SettingsShared'
import styles from './SettingsUiGroup.module.css'

interface AccountSettingsScreenProps {
  onNavigate: (screen: SettingsScreenId) => void
}

type AccountDialog = 'profile' | 'password' | 'logout' | 'delete' | null

export function AccountSettingsScreen({ onNavigate }: AccountSettingsScreenProps) {
  const [displayName, setDisplayName] = useState('Magnus')
  const [draftName, setDraftName] = useState('Magnus')
  const [dialog, setDialog] = useState<AccountDialog>(null)
  const [statusMessage, setStatusMessage] = useState('')

  function closeDialog(): void {
    setDialog(null)
  }

  function confirmProfile(): void {
    const nextName = draftName.trim()
    if (nextName) setDisplayName(nextName)
    setStatusMessage('资料已保存为 Mock 状态')
    closeDialog()
  }

  function confirmAction(message: string): void {
    setStatusMessage(message)
    closeDialog()
  }

  return (
    <SettingsShell activeScreen="17" title="账号" onNavigate={onNavigate}>
      <SettingsCard className={styles.profileCard}>
        <img className={`${styles.profileAvatar} pixel-art`} src="/assets/capybara/idle.png" alt="当前像素水豚头像" />
        <div className={styles.profileIdentity}>
          <strong>{displayName}</strong>
          <span><IconKey size={19} stroke={1.8} aria-hidden="true" />好友码：OT-0829</span>
        </div>
        <div className={styles.profileActions}>
          <Button variant="primary" onClick={() => { setDraftName(displayName); setDialog('profile') }}>
            <IconEdit size={19} stroke={1.8} aria-hidden="true" />修改资料
          </Button>
          <Button onClick={() => setStatusMessage('好友码已复制（Mock）')}>
            <IconCopy size={19} stroke={1.8} aria-hidden="true" />复制好友码
          </Button>
        </div>
      </SettingsCard>

      <InfoStrip>账号与计划数据会自动保存在服务器。</InfoStrip>

      <SettingsCard title="账号安全" className={styles.accountSection}>
        <div className={styles.accountRow}>
          <span><IconLock size={27} stroke={1.7} aria-hidden="true" />保护你的账号安全</span>
          <Button onClick={() => setDialog('password')}>修改密码</Button>
        </div>
      </SettingsCard>

      <SettingsCard title="账号操作" className={styles.accountSection}>
        <div className={styles.accountOperationButtons}>
          <Button onClick={() => setDialog('logout')}><IconLogout size={22} stroke={1.8} aria-hidden="true" />退出登录</Button>
          <Button variant="danger" onClick={() => setDialog('delete')}><IconTrash size={22} stroke={1.8} aria-hidden="true" />删除账号</Button>
        </div>
        <p className={styles.deleteWarning}>
          <IconInfoCircle size={21} stroke={1.8} aria-hidden="true" />
          删除账号前需要再次输入密码，提交后按账号政策处理。
        </p>
      </SettingsCard>

      <p className={styles.settingsStatus} role="status">{statusMessage}</p>

      {dialog === 'profile' ? (
        <MockDialog title="修改资料" confirmLabel="保存资料" onCancel={closeDialog} onConfirm={confirmProfile}>
          <label className={styles.dialogField}>显示名称<input value={draftName} onChange={(event) => setDraftName(event.target.value)} /></label>
        </MockDialog>
      ) : null}

      {dialog === 'password' ? (
        <MockDialog
          title="修改密码"
          description="当前阶段只演示输入与确认，不会提交到服务器。"
          confirmLabel="确认修改"
          onCancel={closeDialog}
          onConfirm={() => confirmAction('密码修改已提交为 Mock 状态')}
        >
          <label className={styles.dialogField}>当前密码<input type="password" /></label>
          <label className={styles.dialogField}>新密码<input type="password" /></label>
        </MockDialog>
      ) : null}

      {dialog === 'logout' ? (
        <MockDialog
          title="确认退出登录？"
          description="本地 Mock 状态会保留，真实版本将清除当前登录会话。"
          confirmLabel="退出登录"
          onCancel={closeDialog}
          onConfirm={() => confirmAction('已退出登录（Mock）')}
        />
      ) : null}

      {dialog === 'delete' ? (
        <MockDialog
          title="确认删除账号？"
          description="这是危险操作。输入密码后才能提交删除请求。"
          confirmLabel="删除账号"
          confirmVariant="danger"
          onCancel={closeDialog}
          onConfirm={() => confirmAction('删除账号请求已提交为 Mock 状态')}
        >
          <label className={styles.dialogField}>密码<input type="password" /></label>
        </MockDialog>
      ) : null}
    </SettingsShell>
  )
}
