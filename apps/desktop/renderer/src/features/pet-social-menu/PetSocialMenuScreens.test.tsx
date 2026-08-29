import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  FriendPetStripScreen,
  FriendsManagementScreen,
  PetSocialMenuScreens,
  QuickMenuScreen
} from './PetSocialMenuScreens'

describe('PetSocialMenuScreens', () => {
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

    expect(screen.getByText('小灰')).toBeInTheDocument()
    expect(screen.queryByText('拉黑')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '不对其展示' }))

    expect(screen.getByText('小灰')).toBeInTheDocument()
    expect(screen.getByText('恢复对其展示')).toBeInTheDocument()
    expect(screen.getByText(/好友关系与对方到你的展示方向均保持不变/)).toBeInTheDocument()
  })

  it('accepts one request without affecting the other request', async () => {
    const user = userEvent.setup()
    render(<FriendsManagementScreen />)

    const requestRows = screen.getAllByText(/阿岚|小周/).map((name) => name.closest('div'))
    const lanRow = requestRows[0]

    expect(lanRow).not.toBeNull()
    await user.click(within(lanRow as HTMLElement).getByRole('button', { name: '接受' }))

    expect(screen.queryByText('阿岚')).not.toBeInTheDocument()
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
