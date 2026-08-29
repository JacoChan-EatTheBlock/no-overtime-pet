import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Friend, FriendRequest } from '../../api/types'
import {
  acceptRequest,
  declineRequest,
  getPendingRequests,
  listFriends,
  updateVisibility
} from '../../api/friends'
import {
  FriendPetStripScreen,
  FriendsManagementScreen,
  PetSocialMenuScreens,
  QuickMenuScreen
} from './PetSocialMenuScreens'

// 好友页以服务端为权威数据源，组件不再内置 fixture，因此必须提供 API 替身。
vi.mock('../../api/friends', () => ({
  sendFriendRequest: vi.fn(),
  getPendingRequests: vi.fn(),
  acceptRequest: vi.fn(),
  declineRequest: vi.fn(),
  listFriends: vi.fn(),
  removeFriend: vi.fn(),
  updateVisibility: vi.fn()
}))

function makeFriend(relationId: string, displayName: string): Friend {
  return {
    relationId,
    friend: {
      id: `user-${relationId}`,
      username: relationId,
      displayName,
      friendCode: 'C7P4-K8M2'
    },
    since: '2026-08-01T00:00:00.000Z'
  }
}

function makeRequest(id: string, displayName: string): FriendRequest {
  return {
    id,
    requesterId: `user-${id}`,
    requester: { id: `user-${id}`, username: id, displayName },
    status: 'PENDING',
    createdAt: '2026-08-20T00:00:00.000Z'
  }
}

describe('PetSocialMenuScreens', () => {
  /** 待处理申请需要真实状态：接受后刷新必须返回剩余申请，而不是把已接受的人放回来。 */
  let pendingRequests: FriendRequest[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    pendingRequests = [makeRequest('lan', '阿岚'), makeRequest('zhou', '小周')]

    vi.mocked(listFriends).mockResolvedValue([makeFriend('hui', '小灰')])
    vi.mocked(getPendingRequests).mockImplementation(async () => [...pendingRequests])
    vi.mocked(updateVisibility).mockResolvedValue(undefined)
    vi.mocked(acceptRequest).mockImplementation(async (id: string) => {
      pendingRequests = pendingRequests.filter((item) => item.id !== id)
    })
    vi.mocked(declineRequest).mockImplementation(async (id: string) => {
      pendingRequests = pendingRequests.filter((item) => item.id !== id)
    })
  })

  it.each([
    ['00-default-pet', '00-default-pet'],
    ['02-friend-pet-strip', '02-friend-pet-strip'],
    ['08-friends-management', '08-friends-management'],
    ['18-quick-menu', '18-quick-menu']
  ] as const)('renders the stable %s UI state', (screenId, expectedAttribute) => {
    const { container } = render(<PetSocialMenuScreens screenId={screenId} />)

    expect(container.querySelector(`[data-ui-screen="${expectedAttribute}"]`)).toBeInTheDocument()
  })

  it('pages the friend strip without exposing detailed work content', async () => {
    const user = userEvent.setup()
    const { container } = render(<FriendPetStripScreen />)

    expect(screen.getByText('我 · 工作中')).toBeInTheDocument()
    expect(screen.getByText('好友 1–5/12')).toBeInTheDocument()
    const visiblePets = Array.from(container.querySelectorAll<HTMLImageElement>('[data-pet-motion]'))
    expect(new Set(visiblePets.map((pet) => pet.getAttribute('src')))).toEqual(
      new Set(['/assets/capybara/idle.png'])
    )
    expect(visiblePets.map((pet) => pet.dataset.petMotion)).toEqual([
      'WORKING',
      'MEETING',
      'SLACKING',
      'AWAY',
      'CLOCKED_OUT'
    ])

    await user.click(screen.getByRole('button', { name: '下一组好友' }))

    expect(screen.getByText('好友 6–10/12')).toBeInTheDocument()
    expect(screen.queryByText(/任务|DDL|日薪|应用名/)).not.toBeInTheDocument()
  })

  it('keeps a friend accepted while changing only the selected one-way projection', async () => {
    const user = userEvent.setup()
    render(<FriendsManagementScreen />)

    expect(await screen.findByText('小灰')).toBeInTheDocument()
    expect(screen.queryByText('拉黑')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '不对其展示' }))

    // 单向隐藏只改可见性，好友关系必须保留。
    expect(updateVisibility).toHaveBeenCalledWith('hui', true)
    expect(screen.getByText('小灰')).toBeInTheDocument()
    expect(await screen.findByText('恢复对其展示')).toBeInTheDocument()
    expect(screen.getByText(/好友关系仍保留/)).toBeInTheDocument()
  })

  it('accepts one request without affecting the other request', async () => {
    const user = userEvent.setup()
    render(<FriendsManagementScreen />)

    const lanName = await screen.findByText('阿岚')
    const lanRow = lanName.closest('div')

    expect(lanRow).not.toBeNull()
    await user.click(within(lanRow as HTMLElement).getByRole('button', { name: '接受' }))

    await waitFor(() => {
      expect(screen.queryByText('阿岚')).not.toBeInTheDocument()
    })
    expect(acceptRequest).toHaveBeenCalledWith('lan')
    expect(screen.getByText('小周')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('阿岚的申请已接受')
  })

  it('updates activity broadcasting and local friend-pet display independently', async () => {
    const user = userEvent.setup()
    render(<QuickMenuScreen />)

    const shareActivity = screen.getByRole('checkbox', { name: '允许好友查看我的活动状态' })
    const showFriendPets = screen.getByRole('checkbox', { name: '在桌面显示好友桌宠' })

    expect(shareActivity).toBeChecked()
    expect(showFriendPets).toBeChecked()

    await user.click(shareActivity)

    expect(shareActivity).not.toBeChecked()
    expect(showFriendPets).toBeChecked()

    await user.click(showFriendPets)

    expect(shareActivity).not.toBeChecked()
    expect(showFriendPets).not.toBeChecked()
    expect(screen.queryByText(/纠正|刚才识别错了|拉黑/)).not.toBeInTheDocument()
  })
})
