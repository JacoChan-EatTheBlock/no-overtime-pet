// ---------------------------------------------------------------------------
// api/index.ts — 统一导出
// ---------------------------------------------------------------------------

// --- HTTP 客户端 ---
export {
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  setToken,
  getToken,
  clearToken,
  ApiRequestError,
} from './client'
export type { RequestOptions } from './client'

// --- 类型 ---
export type {
  User,
  AuthResponse,
  Task,
  WorkSettings,
  Friend,
  FriendRequest,
  ApiError,
} from './types'

// --- 认证 ---
export { register, login, getMe, logout, isAuthenticated } from './auth'

// --- 待办 ---
export {
  createTask,
  listTasks,
  updateTask,
  completeTask,
  deleteTask,
} from './tasks'

// --- 工作设置 ---
export { getWorkSettings, updateWorkSettings } from './work-settings'

// --- 好友 ---
export {
  sendFriendRequest,
  getPendingRequests,
  acceptRequest,
  declineRequest,
  listFriends,
  removeFriend,
  updateVisibility,
} from './friends'
