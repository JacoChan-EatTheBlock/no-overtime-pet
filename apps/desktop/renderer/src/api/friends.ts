// ---------------------------------------------------------------------------
// api/friends.ts — 好友 API 客户端
// ---------------------------------------------------------------------------
import { apiGet, apiPost, apiPatch, apiDelete } from './client'
import type { Friend, FriendRequest } from './types'

// ━━━ Friend Requests ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** POST /v1/friend-requests — 发送好友请求 */
export function sendFriendRequest(friendCode: string): Promise<void> {
  return apiPost('/friend-requests', { friendCode })
}

/** GET /v1/friend-requests — 获取待处理的好友请求 */
export function getPendingRequests(): Promise<FriendRequest[]> {
  return apiGet<FriendRequest[]>('/friend-requests')
}

/** POST /v1/friend-requests/:id/accept — 接受好友请求 */
export function acceptRequest(id: string): Promise<void> {
  return apiPost(`/friend-requests/${id}/accept`)
}

/** POST /v1/friend-requests/:id/decline — 拒绝好友请求 */
export function declineRequest(id: string): Promise<void> {
  return apiPost(`/friend-requests/${id}/decline`)
}

// ━━━ Friends ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** GET /v1/friends — 好友列表 */
export function listFriends(): Promise<Friend[]> {
  return apiGet<Friend[]>('/friends')
}

/** DELETE /v1/friends/:id — 删除好友 */
export function removeFriend(relationId: string): Promise<void> {
  return apiDelete(`/friends/${relationId}`)
}

/** PATCH /v1/friends/:id/visibility — 隐藏/显示对特定好友的可见性 */
export function updateVisibility(
  relationId: string,
  hidden: boolean,
): Promise<void> {
  return apiPatch(`/friends/${relationId}/visibility`, { hidden })
}
