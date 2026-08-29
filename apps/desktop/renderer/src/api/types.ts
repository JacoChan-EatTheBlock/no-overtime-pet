// ---------------------------------------------------------------------------
// api/types.ts — 共享 API 类型
// ---------------------------------------------------------------------------

/** 后端返回的用户对象 */
export interface User {
  id: string
  username: string
  displayName: string
  friendCode: string
}

/** POST /v1/auth/login 与 /v1/auth/register 的响应体 */
export interface AuthResponse {
  accessToken: string
  user: User
}

/** 通用 API 错误体（嵌套在 { error: ApiError } 中） */
export interface ApiError {
  code: string
  message: string
}

// ---------------------------------------------------------------------------
// Tasks API 响应类型
// ---------------------------------------------------------------------------

/** 后端返回的任务对象 */
export interface Task {
  id: string
  title: string
  dueAt: string | null
  importance: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'PENDING' | 'COMPLETED'
  createdAt: string
  revision: number
}

/** 工作设置 */
export interface WorkSettings {
  workStart: string          // "HH:mm"
  workEnd: string            // "HH:mm"
  lunchStart: string         // "HH:mm"
  lunchEnd: string           // "HH:mm"
  dailySalaryMinor: string   // BIGINT 分, e.g. "50000" = ¥500.00
  revision: number
}

// ---------------------------------------------------------------------------
// Friends API 响应类型
// ---------------------------------------------------------------------------

/** GET /v1/friends 返回的好友条目 */
export interface Friend {
  relationId: string
  friend: {
    id: string
    username: string
    displayName: string
    friendCode: string
  }
  since: string
}

/** GET /v1/friend-requests 返回的待处理请求条目 */
export interface FriendRequest {
  id: string
  requesterId: string
  requester?: {
    id: string
    username: string
    displayName: string
  }
  status: 'PENDING'
  createdAt: string
}
