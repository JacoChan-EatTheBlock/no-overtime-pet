import { useId, useState, type FormEvent } from 'react'
import { login, register } from '../../api/auth'
import { ApiRequestError } from '../../api/client'
import type { User } from '../../api/types'
import {
  IconEye,
  IconEyeOff,
  IconLock,
  IconRun,
  IconUser
} from '@tabler/icons-react'
import { IconUserPlus } from '@tabler/icons-react'
import { Button } from '../../components/Button'
import { FormField } from '../../components/FormField'
import { usePersistedState } from '../../lib/storage'
import { PixelSurface } from '../../components/PixelSurface'
import { PixelWindowHeader } from '../../components/PixelWindowHeader'
import { LoginCoinAnimation } from './LoginCoinAnimation'
import styles from './LoginScreen.module.css'

type AuthMode = 'login' | 'register'

interface LoginScreenProps {
  onSuccess?: (user: User) => void
}

/** 将 API 错误码映射为用户友好的中文消息 */
function friendlyError(err: unknown): string {
  if (err instanceof ApiRequestError) {
    const map: Record<string, string> = {
      USERNAME_TAKEN: '该用户名已被注册',
      INVALID_CREDENTIALS: '用户名或密码错误',
      USER_NOT_FOUND: '用户不存在',
    }
    return map[err.code] ?? err.message ?? '请求失败，请重试'
  }
  if (err instanceof TypeError) {
    return '无法连接服务器，请检查网络'
  }
  return '未知错误，请稍后重试'
}

export function LoginScreen({ onSuccess }: LoginScreenProps = {}) {
  const usernameId = useId()
  const passwordId = useId()
  const confirmationId = useId()
  const displayNameId = useId()
  const [mode, setMode] = useState<AuthMode>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = usePersistedState<string>('auth:username', '')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function changeMode(nextMode: AuthMode): void {
    setMode(nextMode)
    setError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (!username.trim() || !password) {
      setError('请填写用户名和密码')
      return
    }

    if (username.trim().length < 3 || username.trim().length > 32) {
      setError('用户名长度须为 3–32 个字符')
      return
    }
    if (password.length < 8) {
      setError('密码至少需要 8 个字符')
      return
    }
    if (mode === 'register' && password !== passwordConfirmation) {
      setError('两次输入的密码不一致')
      return
    }

    if (mode === 'register' && !displayName.trim()) {
      setError('请填写显示名称')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result =
        mode === 'login'
          ? await login(username.trim(), password)
          : await register(username.trim(), password, displayName.trim())

      // token 已在 api/auth.ts 的 login/register 中自动保存
      onSuccess?.(result.user)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.stage} data-ui-screen="03-auth" data-ui-state={mode} data-loading={loading || undefined}>
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
                disabled={loading}
              >
                登录
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                className={mode === 'register' ? styles.activeTab : undefined}
                onClick={() => changeMode('register')}
                disabled={loading}
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
                disabled={loading}
              />

              {mode === 'register' ? (
                <FormField
                  id={displayNameId}
                  label="显示名称"
                  autoComplete="nickname"
                  placeholder="请输入显示名称"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  leadingIcon={<IconUserPlus size={24} stroke={1.8} aria-hidden="true" />}
                  disabled={loading}
                />
              ) : null}

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
                disabled={loading}
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
                  disabled={loading}
                />
              ) : null}

              <Button className={styles.submitButton} variant="primary" fullWidth type="submit" disabled={loading}>
                {loading
                  ? (mode === 'login' ? '登录中…' : '注册中…')
                  : (mode === 'login' ? '登录并开始' : '注册并开始')}
              </Button>

              <p className={`${styles.status} ${error ? styles.statusError : ''}`} role="alert" aria-live="assertive">
                {error}
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
