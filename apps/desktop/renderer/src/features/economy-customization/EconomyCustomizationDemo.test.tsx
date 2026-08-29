import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EconomyCustomizationDemo } from './EconomyCustomizationDemo'

describe('EconomyCustomizationDemo', () => {
  it('shows one user-facing currency and labels all economy values as UI Mock data', () => {
    render(<EconomyCustomizationDemo initialScreen="wallet" />)

    expect(document.querySelector('[data-ui-screen="09-wallet"]')).toBeInTheDocument()
    expect(screen.getByText('UI MOCK · 非真实交易')).toBeInTheDocument()
    expect(screen.getByText('你唯一能花的余额')).toBeInTheDocument()
    expect(screen.queryByText(/窝囊时长余额/)).not.toBeInTheDocument()
    expect(screen.queryByText(/等价毫秒/)).not.toBeInTheDocument()
  })

  it('opens the shop and filters the fixed mock catalog', async () => {
    const user = userEvent.setup()
    render(<EconomyCustomizationDemo initialScreen="wallet" />)

    await user.click(screen.getByRole('button', { name: '去商店' }))
    expect(document.querySelector('[data-ui-screen="10-shop"]')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '帽子' }))
    expect(screen.getByRole('button', { name: /加班免死金牌帽/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /社畜水豚角色/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '角色' }))
    expect(screen.getByRole('button', { name: /社畜水豚角色/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /加班免死金牌帽/ })).not.toBeInTheDocument()
  })

  it('runs a local purchase demo without presenting it as a real ledger transaction', async () => {
    const user = userEvent.setup()
    render(<EconomyCustomizationDemo initialScreen="shop" />)

    await user.click(screen.getByRole('button', { name: /购买演示/ }))

    const dialog = screen.getByRole('dialog', { name: '确认购买演示' })
    expect(within(dialog).getByText(/不会扣除真实余额/)).toBeInTheDocument()
    expect(within(dialog).getByText(/不会创建账本或购买记录/)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: '确认演示' }))

    expect(screen.getByRole('status')).toHaveTextContent('未写入真实账户')
    expect(screen.getByRole('button', { name: '去装扮' })).toBeInTheDocument()
    expect(screen.getByText('窝囊费 ¥298.40')).toBeInTheDocument()
  })

  it('supports wardrobe tabs, hat selection, bottom-to-top ordering and mock save states', async () => {
    const user = userEvent.setup()
    render(<EconomyCustomizationDemo initialScreen="wardrobe" />)

    expect(document.querySelector('[data-ui-screen="11-wardrobe"]')).toBeInTheDocument()
    expect(screen.getByLabelText('已装备 6 顶帽子')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '将加班免死金牌帽上移' }))
    expect(screen.getByRole('status')).toHaveTextContent('帽子顺序已在本页 Mock 中调整')

    await user.click(screen.getByRole('button', { name: '清空帽子' }))
    expect(screen.getByLabelText('已装备 0 顶帽子')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('真实装备未变化')

    await user.click(screen.getByRole('tab', { name: '角色' }))
    expect(screen.getByText(/我的角色\s+1/)).toBeInTheDocument()
    expect(screen.getByText('默认角色 · 已拥有')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '保存装扮演示' }))
    expect(screen.getByRole('status')).toHaveTextContent('未调用 appearance API')
  })
})
