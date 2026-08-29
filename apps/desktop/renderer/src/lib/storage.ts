// ---------------------------------------------------------------------------
// lib/storage.ts — 通用 localStorage 持久化工具
// ---------------------------------------------------------------------------
import { useState, useCallback } from 'react'

const STORAGE_PREFIX = 'no-overtime-pet:'

/**
 * 从 localStorage 读取数据，解析失败或不存在时返回 fallback。
 */
export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/**
 * 将数据序列化后写入 localStorage。
 * 静默忽略 quota exceeded 等写入异常。
 */
export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch {
    /* quota exceeded — silently ignore */
  }
}

/**
 * 删除 localStorage 中指定 key 的数据。
 */
export function removeFromStorage(key: string): void {
  localStorage.removeItem(STORAGE_PREFIX + key)
}

/**
 * 自定义 Hook：与 localStorage 自动同步的 useState。
 *
 * - 初始化时从 localStorage 读取（读取失败则使用 fallback）。
 * - 每次 setState 时同步写入 localStorage。
 * - 仅在需要跨刷新持久化的数据上使用，UI 临时状态请继续使用 useState。
 */
export function usePersistedState<T>(
  key: string,
  fallback: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => loadFromStorage(key, fallback))

  const setPersistedState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next =
          typeof value === 'function'
            ? (value as (p: T) => T)(prev)
            : value
        saveToStorage(key, next)
        return next
      })
    },
    [key],
  )

  return [state, setPersistedState]
}
