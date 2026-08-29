// ---------------------------------------------------------------------------
// contexts/AuthContext.tsx — 认证状态管理
// ---------------------------------------------------------------------------
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User, AuthResponse } from '../api/types'
import {
  register as apiRegister,
  login as apiLogin,
  logout as apiLogout,
  getMe,
  isAuthenticated as checkToken,
} from '../api/auth'
import { clearToken } from '../api/client'

// ---------------------------------------------------------------------------
// Context 类型
// ---------------------------------------------------------------------------

interface AuthState {
  /** 当前登录用户，null 表示未登录 */
  user: User | null
  /** 是否正在验证 token / 加载用户信息 */
  loading: boolean
  /** 最近一次认证错误 */
  error: string | null
}

interface AuthActions {
  /** 登录，成功后自动更新 user 状态 */
  login: (username: string, password: string) => Promise<AuthResponse>
  /** 注册，成功后自动更新 user 状态 */
  register: (username: string, password: string, displayName: string) => Promise<AuthResponse>
  /** 登出，清除 token 和 user 状态 */
  logout: () => void
}

type AuthContextValue = AuthState & AuthActions

// ---------------------------------------------------------------------------
// Context 实例
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── 初始化：检查本地 token 有效性 ────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      if (!checkToken()) {
        setLoading(false)
        return
      }

      try {
        const me = await getMe()
        if (!cancelled) {
          setUser(me)
        }
      } catch {
        // token 过期或无效，清理本地存储
        clearToken()
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  // ── 登录 ─────────────────────────────────────────────────────────
  const login = useCallback(async (username: string, password: string) => {
    setError(null)
    try {
      const result = await apiLogin(username, password)
      setUser(result.user)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败'
      setError(message)
      throw err
    }
  }, [])

  // ── 注册 ─────────────────────────────────────────────────────────
  const register = useCallback(
    async (username: string, password: string, displayName: string) => {
      setError(null)
      try {
        const result = await apiRegister(username, password, displayName)
        setUser(result.user)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : '注册失败'
        setError(message)
        throw err
      }
    },
    [],
  )

  // ── 登出 ─────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    apiLogout()
    setUser(null)
    setError(null)
  }, [])

  // ── Memo ─────────────────────────────────────────────────────────
  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, error, login, register, logout }),
    [user, loading, error, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * 获取当前认证状态和操作方法。
 * 必须在 `<AuthProvider>` 内部使用。
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>')
  }
  return ctx
}
