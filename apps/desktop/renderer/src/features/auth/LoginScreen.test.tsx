import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginScreen } from './LoginScreen'

describe('LoginScreen', () => {
  it('uses the confirmed username and password login path', () => {
    render(<LoginScreen />)

    expect(screen.getByRole('tab', { name: '登录' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('用户名')).toBeInTheDocument()
    expect(screen.getByLabelText('密码')).toBeInTheDocument()
    expect(screen.queryByText('邮箱')).not.toBeInTheDocument()
    expect(screen.queryByText('验证码')).not.toBeInTheDocument()
    expect(screen.queryByText('离线体验')).not.toBeInTheDocument()
  })

  it('switches to the registration state without introducing email fields', async () => {
    const user = userEvent.setup()
    render(<LoginScreen />)

    await user.click(screen.getByRole('tab', { name: '注册' }))

    expect(screen.getByRole('tab', { name: '注册' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('确认密码')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '注册并开始' })).toBeInTheDocument()
    expect(screen.queryByText('邮箱')).not.toBeInTheDocument()
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    render(<LoginScreen />)

    const password = screen.getByLabelText('密码')
    expect(password).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: '显示密码' }))

    expect(password).toHaveAttribute('type', 'text')
  })
})
