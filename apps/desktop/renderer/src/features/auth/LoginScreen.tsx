import { useId, useState, type FormEvent } from 'react'
import {
  IconEye,
  IconEyeOff,
  IconLock,
  IconRun,
  IconUser
} from '@tabler/icons-react'
import { Button } from '../../components/Button'
import { FormField } from '../../components/FormField'
import { PixelSurface } from '../../components/PixelSurface'
import { PixelWindowHeader } from '../../components/PixelWindowHeader'
import { LoginCoinAnimation } from './LoginCoinAnimation'
import styles from './LoginScreen.module.css'

type AuthMode = 'login' | 'register'

interface LoginScreenProps {
  onSuccess?: () => void
}

export function LoginScreen({ onSuccess }: LoginScreenProps = {}) {
  const usernameId = useId()
  const passwordId = useId()
  const confirmationId = useId()
  const [mode, setMode] = useState<AuthMode>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  function changeMode(nextMode: AuthMode): void {
    setMode(nextMode)
    setStatusMessage('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (!username.trim() || !password) {
      setStatusMessage('请填写用户名和密码')
      return
    }

    if (mode === 'register' && password !== passwordConfirmation) {
      setStatusMessage('两次输入的密码不一致')
      return
    }

    setStatusMessage(mode === 'login' ? '登录演示已提交' : '注册演示已提交')
    onSuccess?.()
  }

  return (
    <main className={styles.stage} data-ui-screen="03-auth" data-ui-state={mode}>
      <PixelSurface className={styles.window} innerClassName={styles.windowInner} ariaLabel="登录与注册">
        <PixelWindowHeader />

        <div className={styles.content}>
          <section className={styles.formColumn}>
            <div className={styles.heading}>
              <div className={styles.titleRow}>
                <h1>不要加班</h1>
                <IconRun className={styles.runIcon} aria-hidden="true" />
              </div>
              <p>把今天的活排明白，然后准点跑路。</p>
            </div>

            <div className={styles.tabs} role="tablist" aria-label="账号操作">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                className={mode === 'login' ? styles.activeTab : undefined}
                onClick={() => changeMode('login')}
              >
                登录
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                className={mode === 'register' ? styles.activeTab : undefined}
                onClick={() => changeMode('register')}
              >
                注册
              </button>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <FormField
                id={usernameId}
                label="用户名"
                autoComplete="username"
                placeholder="请输入用户名"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                leadingIcon={<IconUser size={24} stroke={1.8} aria-hidden="true" />}
              />

              <FormField
                id={passwordId}
                label="密码"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="请输入密码"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                leadingIcon={<IconLock size={23} stroke={1.8} aria-hidden="true" />}
                trailingAction={
                  <button
                    className={styles.passwordToggle}
                    type="button"
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? (
                      <IconEyeOff size={23} stroke={1.8} aria-hidden="true" />
                    ) : (
                      <IconEye size={23} stroke={1.8} aria-hidden="true" />
                    )}
                  </button>
                }
              />

              {mode === 'register' ? (
                <FormField
                  id={confirmationId}
                  label="确认密码"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="请再次输入密码"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  leadingIcon={<IconLock size={23} stroke={1.8} aria-hidden="true" />}
                />
              ) : null}

              <Button className={styles.submitButton} variant="primary" fullWidth type="submit">
                {mode === 'login' ? '登录并开始' : '注册并开始'}
              </Button>

              <p className={styles.status} role="status">
                {statusMessage}
              </p>
            </form>

            <footer className={styles.privacyLine}>
              <IconLock size={18} stroke={1.8} aria-hidden="true" />
              <span>好友只能看到模糊状态，看不到任务内容</span>
              <button type="button">隐私说明</button>
            </footer>
          </section>

          <section className={styles.visualColumn} aria-label="金币砸脑壳装饰动画">
            <LoginCoinAnimation className={styles.animation} />
          </section>
        </div>
      </PixelSurface>
    </main>
  )
}
