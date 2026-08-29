// ---------------------------------------------------------------------------
// api/auth.ts — 认证 API
// ---------------------------------------------------------------------------
import { apiGet, apiPost, setToken, getToken, clearToken } from './client'
import type { AuthResponse, User } from './types'

/**
 * 注册新账号，成功后自动存储 token。
 */
export async function register(
  username: string,
  password: string,
  displayName: string,
): Promise<AuthResponse> {
  const result = await apiPost<AuthResponse>('/auth/register', {
    username,
    password,
    displayName,
  })
  setToken(result.accessToken)
  return result
}

/**
 * 登录，成功后自动存储 token。
 */
export async function login(
  username: string,
  password: string,
): Promise<AuthResponse> {
  const result = await apiPost<AuthResponse>('/auth/login', {
    username,
    password,
  })
  setToken(result.accessToken)
  return result
}

/**
 * 获取当前登录用户信息。
 */
export async function getMe(): Promise<User> {
  return apiGet<User>('/auth/me')
}

/**
 * 登出：清除本地 token。
 */
export function logout(): void {
  clearToken()
}

/**
 * 检查本地是否存有 token（不验证有效性）。
 */
export function isAuthenticated(): boolean {
  return getToken() !== null
}
