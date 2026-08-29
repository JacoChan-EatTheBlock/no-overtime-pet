export type FriendPublicStatus =
  | 'WORKING'
  | 'MEETING'
  | 'SLACKING'
  | 'AWAY'
  | 'CLOCKED_OUT'
  | 'OFFLINE'

export type PetMotion = FriendPublicStatus | 'IDLE'

export interface FriendFixture {
  id: string
  displayName: string
  status: FriendPublicStatus
  safeLabel: string
  isSelf?: boolean
}

export interface FriendRequestFixture {
  id: string
  displayName: string
}

export const PET_ASSET_PATH = '/assets/capybara/idle.png'

export const PET_MOTION_ASSET_PATHS: Partial<Record<PetMotion, string>> = {
  IDLE: PET_ASSET_PATH
}

export function resolvePetMotionAssetPath(motion: PetMotion): string {
  return PET_MOTION_ASSET_PATHS[motion] ?? PET_ASSET_PATH
}

export const FRIENDS: FriendFixture[] = [
  {
    id: 'self',
    displayName: '我',
    status: 'WORKING',
    safeLabel: '工作中',
    isSelf: true
  },
  {
    id: 'ash',
    displayName: '小灰',
    status: 'MEETING',
    safeLabel: '开会中'
  },
  {
    id: 'rabbit',
    displayName: '兔兔',
    status: 'SLACKING',
    safeLabel: '短暂出逃'
  },
  {
    id: 'bear',
    displayName: '熊仔',
    status: 'AWAY',
    safeLabel: '离开'
  },
  {
    id: 'shiba',
    displayName: '柴柴',
    status: 'CLOCKED_OUT',
    safeLabel: '已跑路'
  },
  {
    id: 'pudding',
    displayName: '布丁',
    status: 'OFFLINE',
    safeLabel: '离线'
  },
  {
    id: 'penguin',
    displayName: '企鹅',
    status: 'OFFLINE',
    safeLabel: '离线'
  },
  {
    id: 'fox',
    displayName: '阿狐',
    status: 'OFFLINE',
    safeLabel: '离线'
  },
  {
    id: 'mango',
    displayName: '芒果',
    status: 'WORKING',
    safeLabel: '工作中'
  },
  {
    id: 'coffee',
    displayName: '咖啡',
    status: 'MEETING',
    safeLabel: '开会中'
  },
  {
    id: 'rice',
    displayName: '米粒',
    status: 'AWAY',
    safeLabel: '离开'
  },
  {
    id: 'taro',
    displayName: '芋头',
    status: 'CLOCKED_OUT',
    safeLabel: '已跑路'
  }
]

export const FRIEND_REQUESTS: FriendRequestFixture[] = [
  { id: 'request-lan', displayName: '阿岚' },
  { id: 'request-zhou', displayName: '小周' }
]

export const STATUS_CLASS_NAMES: Record<FriendPublicStatus, string> = {
  WORKING: 'working',
  MEETING: 'meeting',
  SLACKING: 'slacking',
  AWAY: 'away',
  CLOCKED_OUT: 'clockedOut',
  OFFLINE: 'offline'
}
