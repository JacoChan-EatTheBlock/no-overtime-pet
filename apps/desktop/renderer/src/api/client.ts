// ---------------------------------------------------------------------------
// api/client.ts — HTTP 客户端封装（原生 fetch）
// ---------------------------------------------------------------------------
import type { ApiError } from './types'

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------
const API_BASE: string =
  (import.meta as Record<string, { env?: Record<string, string> }>).env
    ?.VITE_API_BASE ?? 'http://localhost:3000/v1'

// ---------------------------------------------------------------------------
// Token 管理
// ---------------------------------------------------------------------------
const TOKEN_KEY = 'auth_token'

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

// ---------------------------------------------------------------------------
// 自定义错误类
// ---------------------------------------------------------------------------
export class ApiRequestError extends Error {
  public readonly status: number
  public readonly code: string

  constructor(status: number, body: ApiError) {
    super(body.message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = body.code
  }
}

// ---------------------------------------------------------------------------
// 通用请求选项
// ---------------------------------------------------------------------------
export interface RequestOptions {
  /** 用于乐观并发控制 (If-Match header) */
  ifMatch?: string
  /** 用于幂等写操作 (Idempotency-Key header) */
  idempotencyKey?: string
  /** 自定义 headers（会覆盖同名默认 header） */
  headers?: Record<string, string>
  /** AbortSignal，用于取消请求 */
  signal?: AbortSignal
}

// ---------------------------------------------------------------------------
// 内部：构建请求
// ---------------------------------------------------------------------------
function buildHeaders(options?: RequestOptions): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  if (options?.ifMatch) {
    headers['If-Match'] = options.ifMatch
  }

  if (options?.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey
  }

  if (options?.headers) {
    Object.assign(headers, options.headers)
  }

  return headers
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const url = `${API_BASE}${path}`

  const res = await fetch(url, {
    method,
    headers: buildHeaders(options),
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options?.signal,
  })

  // 204 No Content — 无响应体
  if (res.status === 204) {
    return undefined as T
  }

  const json: unknown = await res.json()

  if (!res.ok) {
    const errorBody = (json as { error?: ApiError }).error ?? {
      code: 'UNKNOWN',
      message: res.statusText,
    }
    throw new ApiRequestError(res.status, errorBody)
  }

  // 统一解包 { data: T } 格式；若顶层就是数据则直接返回
  if (
    json !== null &&
    typeof json === 'object' &&
    'data' in (json as Record<string, unknown>)
  ) {
    return (json as { data: T }).data
  }

  return json as T
}

// ---------------------------------------------------------------------------
// 公开泛型方法
// ---------------------------------------------------------------------------
export function apiGet<T>(path: string, options?: RequestOptions): Promise<T> {
  return request<T>('GET', path, undefined, options)
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  return request<T>('POST', path, body, options)
}

export function apiPut<T>(
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  return request<T>('PUT', path, body, options)
}

export function apiPatch<T>(
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  return request<T>('PATCH', path, body, options)
}

export function apiDelete(
  path: string,
  options?: RequestOptions,
): Promise<void> {
  return request<void>('DELETE', path, undefined, options)
}
