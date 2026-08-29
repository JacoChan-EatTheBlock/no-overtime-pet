import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskScheduleFlow } from './TaskScheduleFlow'

describe('TaskScheduleFlow', () => {
  it('keeps task creation automatic and does not restore per-task AI actions', () => {
    render(<TaskScheduleFlow />)

    expect(screen.getByRole('heading', { name: '今天的待办' })).toBeInTheDocument()
    expect(screen.getByText('创建后将直接进入 AI 建议确认')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '交给 AI 分析' })).not.toBeInTheDocument()
  })

  it('creates a task and opens the editable AI proposal before scheduling', async () => {
    const user = userEvent.setup()
    render(<TaskScheduleFlow />)

    const title = screen.getByLabelText('要做什么 *')
    await user.clear(title)
    await user.type(title, '准备发布复盘')
    await user.click(screen.getByRole('button', { name: '创建并进入 AI 分析' }))

    expect(screen.getByRole('heading', { name: 'AI 分析建议' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '准备发布复盘' })).toBeInTheDocument()
    expect(screen.getByText('这是建议，确认后才会写入任务。')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: '修改' })[0])
    const category = screen.getByLabelText('任务类型')
    await user.clear(category)
    await user.type(category, '复盘与沟通')
    expect(category).toHaveValue('复盘与沟通')

    await user.click(screen.getByRole('button', { name: '确认建议' }))
    expect(screen.getByRole('heading', { name: '今日安排草案' })).toBeInTheDocument()
  })

  it('lets the user lock the draft, finish commitments, and reach the winning result', async () => {
    const user = userEvent.setup()
    render(<TaskScheduleFlow initialScreen="07-schedule-draft" />)

    const lockButton = screen.getByRole('button', { name: '锁定查收邮件与消息' })
    await user.click(lockButton)
    expect(screen.getByRole('button', { name: '解锁查收邮件与消息' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '确认今日安排' }))
    expect(screen.getByRole('heading', { name: '今天，8月29日' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '完成这项' }))
    await user.click(screen.getByRole('button', { name: '完成这项' }))
    expect(screen.getByRole('progressbar', { name: '承诺任务完成进度' })).toHaveAttribute('aria-valuenow', '5')

    await user.click(screen.getByRole('button', { name: '跑路' }))
    expect(screen.getByText('任务已完成，可以获得准点奖励资格。')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '照样跑路' }))
    expect(screen.getByRole('heading', { name: '准点跑路成功' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '今天胜利' })).toBeInTheDocument()
    expect(screen.getByText('+¥88.00')).toBeInTheDocument()
    expect(screen.getByText('准点奖池奖励：待 18:35 结算')).toBeInTheDocument()
  })

  it('allows clocking out with incomplete work while reporting the eligibility impact', async () => {
    const user = userEvent.setup()
    render(<TaskScheduleFlow initialScreen="12-clockout-confirm" />)

    expect(screen.getByText('今天会记录为「任务未完成」，不会获得准点奖励。')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '照样跑路' }))

    expect(screen.getByRole('heading', { name: '已经跑路' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '今天未胜利' })).toBeInTheDocument()
    expect(screen.getByText('准点奖池奖励：无资格')).toBeInTheDocument()
  })

  it('provides every formal screen as a stable initial state', () => {
    const { rerender } = render(<TaskScheduleFlow initialScreen="01-task-bubble" />)
    expect(document.querySelector('[data-ui-screen="01-task-bubble"]')).toBeInTheDocument()

    rerender(<TaskScheduleFlow key="analysis" initialScreen="06-ai-analysis" />)
    expect(document.querySelector('[data-ui-screen="06-ai-analysis"]')).toBeInTheDocument()

    rerender(<TaskScheduleFlow key="success" initialScreen="13-clockout-success" />)
    expect(document.querySelector('[data-ui-screen="13-clockout-success"][data-ui-state="win"]')).toBeInTheDocument()
  })
})
