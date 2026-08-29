// ---------------------------------------------------------------------------
// api/work-settings.ts — 工作时间设置 API
// ---------------------------------------------------------------------------
import { apiGet, apiPut } from './client'
import type { WorkSettings } from './types'

/**
 * 获取当前用户的工作时间设置。
 */
export async function getWorkSettings(): Promise<WorkSettings> {
  return apiGet<WorkSettings>('/work-settings/current')
}

/**
 * 更新工作时间设置（乐观并发：需传入当前 revision）。
 */
export async function updateWorkSettings(
  data: Partial<Omit<WorkSettings, 'revision'>>,
  revision: number,
): Promise<WorkSettings> {
  return apiPut<WorkSettings>('/work-settings', data, {
    ifMatch: String(revision),
  })
}
