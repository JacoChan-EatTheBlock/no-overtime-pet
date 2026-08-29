import type { PropsWithChildren, ReactNode } from 'react'
import {
  IconBell,
  IconCalendarTime,
  IconChevronRight,
  IconExternalLink,
  IconInfoCircle,
  IconShieldCheck,
  IconUser
} from '@tabler/icons-react'
import { Button } from '../../components/Button'
import { PixelSurface } from '../../components/PixelSurface'
import { PixelWindowHeader } from '../../components/PixelWindowHeader'
import styles from './SettingsUiGroup.module.css'

export type SettingsScreenId = '04' | '14' | '15' | '16' | '17'

interface SettingsShellProps extends PropsWithChildren {
  activeScreen: Exclude<SettingsScreenId, '14'>
  onNavigate: (screen: SettingsScreenId) => void
  title: string
}

const SETTINGS_ITEMS: Array<{
  id: Exclude<SettingsScreenId, '14'>
  label: string
  icon: typeof IconCalendarTime
}> = [
  { id: '04', label: '工作设置', icon: IconCalendarTime },
  { id: '15', label: '识别与隐私', icon: IconShieldCheck },
  { id: '16', label: '通知', icon: IconBell },
  { id: '17', label: '账号', icon: IconUser }
]

export function SettingsShell({ activeScreen, onNavigate, title, children }: SettingsShellProps) {
  return (
    <main
      className={styles.stage}
      data-ui-screen={`${activeScreen}-settings`}
      data-ui-state="default"
    >
      <PixelSurface
        className={styles.settingsWindow}
        innerClassName={styles.settingsWindowInner}
        ariaLabel={title}
      >
        <PixelWindowHeader />
        <div className={styles.settingsBody}>
          <aside className={styles.sidebar} aria-label="设置导航">
            <nav className={styles.sidebarNav}>
              {SETTINGS_ITEMS.map((item) => {
                const ItemIcon = item.icon
                const isActive = activeScreen === item.id

                return (
                  <button
                    key={item.id}
                    className={isActive ? styles.sidebarItemActive : styles.sidebarItem}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => onNavigate(item.id)}
                  >
                    <ItemIcon size={27} stroke={1.75} aria-hidden="true" />
                    <span>{item.label}</span>
                    {isActive ? <IconChevronRight size={24} stroke={2.5} aria-hidden="true" /> : null}
                  </button>
                )
              })}
            </nav>

            <div className={styles.sidebarNote}>
              <img className="pixel-art" src="/assets/capybara/idle.png" alt="" />
              <p>专注当下，<br />效率自然来。</p>
            </div>
          </aside>

          <section className={styles.settingsContent} aria-labelledby="settings-page-title">
            <h1 id="settings-page-title">{title}</h1>
            {children}
          </section>
        </div>
      </PixelSurface>
    </main>
  )
}

interface ToggleProps {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function Toggle({ checked, label, onChange, disabled = false }: ToggleProps) {
  return (
    <label className={styles.toggle}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span aria-hidden="true" />
    </label>
  )
}

interface InfoStripProps extends PropsWithChildren {
  tone?: 'neutral' | 'warning'
}

export function InfoStrip({ children, tone = 'neutral' }: InfoStripProps) {
  return (
    <div className={`${styles.infoStrip} ${tone === 'warning' ? styles.infoStripWarning : ''}`}>
      <IconInfoCircle size={21} stroke={1.8} aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}

interface SettingsCardProps extends PropsWithChildren {
  title?: string
  icon?: ReactNode
  className?: string
}

export function SettingsCard({ title, icon, className, children }: SettingsCardProps) {
  return (
    <section className={[styles.settingsCard, className].filter(Boolean).join(' ')}>
      {title ? (
        <h2>
          {icon}
          <span>{title}</span>
        </h2>
      ) : null}
      {children}
    </section>
  )
}

interface MockSystemLinkProps {
  onActivate: () => void
  children?: ReactNode
}

export function MockSystemLink({ onActivate, children = '打开 macOS 系统设置' }: MockSystemLinkProps) {
  return (
    <button className={styles.systemLink} type="button" onClick={onActivate}>
      <span>{children}</span>
      <IconExternalLink size={18} stroke={1.8} aria-hidden="true" />
    </button>
  )
}

interface MockDialogProps extends PropsWithChildren {
  title: string
  description?: string
  confirmLabel: string
  confirmVariant?: 'primary' | 'danger'
  onCancel: () => void
  onConfirm: () => void
}

export function MockDialog({
  title,
  description,
  confirmLabel,
  confirmVariant = 'primary',
  onCancel,
  onConfirm,
  children
}: MockDialogProps) {
  return (
    <div className={styles.dialogBackdrop} role="presentation">
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="mock-dialog-title">
        <h2 id="mock-dialog-title">{title}</h2>
        {description ? <p>{description}</p> : null}
        {children}
        <div className={styles.dialogActions}>
          <Button onClick={onCancel}>取消</Button>
          <Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
