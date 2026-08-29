// ---------------------------------------------------------------------------
// api/tasks.ts — 待办任务 API
// ---------------------------------------------------------------------------
import { apiGet, apiPost, apiPatch, apiDelete } from './client'
import type { Task } from './types'

/**
 * 创建新任务。
 */
export async function createTask(data: {
  title: string
  dueAt?: string
  importance?: Task['importance']
}): Promise<Task> {
  return apiPost<Task>('/tasks', data)
}

/**
 * 获取任务列表，可按 status 筛选。
 */
export async function listTasks(status?: Task['status']): Promise<Task[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return apiGet<Task[]>(`/tasks${query}`)
}

/**
 * 更新任务字段（乐观并发：需传入当前 revision）。
 */
export async function updateTask(
  id: string,
  data: Partial<Pick<Task, 'title' | 'dueAt' | 'importance' | 'status'>>,
  revision: number,
): Promise<Task> {
  return apiPatch<Task>(`/tasks/${id}`, data, {
    ifMatch: String(revision),
  })
}

/**
 * 完成任务（幂等操作）。
 */
export async function completeTask(
  id: string,
  idempotencyKey: string,
): Promise<Task> {
  return apiPost<Task>(`/tasks/${id}/complete`, undefined, {
    idempotencyKey,
  })
}

/**
 * 删除任务。
 */
export async function deleteTask(id: string): Promise<void> {
  return apiDelete(`/tasks/${id}`)
}
