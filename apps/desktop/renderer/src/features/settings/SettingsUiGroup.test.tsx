import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { WorkSettings } from '../../api/types'
import { getWorkSettings, updateWorkSettings } from '../../api/work-settings'
import { AccountSettingsScreen } from './AccountSettingsScreen'
import { ActivityRecognitionScreen } from './ActivityRecognitionScreen'
import { NotificationSettingsScreen } from './NotificationSettingsScreen'
import { PrivacySettingsScreen } from './PrivacySettingsScreen'
import { SettingsUiGroup } from './SettingsUiGroup'
import { WorkSettingsScreen } from './WorkSettingsScreen'

const noopNavigate = () => undefined

// 工作设置已改为以服务端为权威数据源：加载和保存都走 API，
// 组件不再内置 fixture，所以这里必须显式提供 API 替身。
vi.mock('../../api/work-settings', () => ({
  getWorkSettings: vi.fn(),
  updateWorkSettings: vi.fn()
}))

const getWorkSettingsMock = vi.mocked(getWorkSettings)
const updateWorkSettingsMock = vi.mocked(updateWorkSettings)

/** 09:00–18:30、午休 1 小时 → 标准带薪 8 小时 30 分；日薪 ¥800 → 每小时约 ¥94.12。 */
const WORK_SETTINGS: WorkSettings = {
  workStart: '09:00',
  lunchStart: '12:00',
  lunchEnd: '13:00',
  workEnd: '18:30',
  dailySalaryMinor: '80000',
  revision: 1
}

describe('settings UI group', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getWorkSettingsMock.mockResolvedValue({ ...WORK_SETTINGS })
    updateWorkSettingsMock.mockImplementation(async (data, revision) => ({
      ...WORK_SETTINGS,
      ...data,
      revision: revision + 1
    }))
  })

  it('updates the workday preview from settings loaded through the API', async () => {
    const user = userEvent.setup()
    render(<WorkSettingsScreen onNavigate={noopNavigate} />)

    expect(await screen.findByText('8小时30分')).toBeInTheDocument()
    expect(screen.getByText('¥94.12')).toBeInTheDocument()

    const salaryInput = screen.getByLabelText('日薪（人民币）')
    await user.clear(salaryInput)
    await user.type(salaryInput, '850')

    expect(screen.getByText('¥100.00')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '保存设置' }))

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('下一个工作日生效')
    })
    // 保存必须带上当前 revision，服务端才能做乐观并发校验。
    expect(updateWorkSettingsMock).toHaveBeenCalledWith(
      expect.objectContaining({ dailySalaryMinor: '85000' }),
      WORK_SETTINGS.revision
    )
  })

  it('keeps activity recognition read-only while allowing pause and close', async () => {
    const user = userEvent.setup()
    render(<ActivityRecognitionScreen onNavigate={noopNavigate} />)

    expect(screen.getByRole('heading', { name: '写方案', level: 3 })).toBeInTheDocument()
    expect(screen.queryByText(/纠正|改分类|备注|历史回写/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '暂停识别' }))
    expect(screen.getByText('识别已暂停')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '继续识别' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '关闭识别' }))
    expect(screen.getByText('识别已关闭')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '暂停识别' })).toBeDisabled()
  })

  it('separates privacy product toggles from mock system permission status', async () => {
    const user = userEvent.setup()
    render(<PrivacySettingsScreen onNavigate={noopNavigate} />)

    const broadcastToggle = screen.getByRole('checkbox', { name: '向好友广播状态' })
    const screenshotToggle = screen.getByRole('checkbox', { name: '联网截图识别' })

    expect(broadcastToggle).toBeChecked()
    expect(screenshotToggle).not.toBeChecked()
    expect(screen.getByText('Screen Recording：Mock 未允许')).toBeInTheDocument()
    expect(screen.queryByText('查看并删除活动数据')).not.toBeInTheDocument()

    await user.click(screenshotToggle)
    expect(screenshotToggle).toBeChecked()
    expect(screen.getByText('Screen Recording：Mock 未允许')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '打开 macOS 系统设置' }))
    expect(screen.getByRole('status')).toHaveTextContent('UI Mock')
  })

  it('uses macOS notification semantics and keeps notification types independently operable', async () => {
    const user = userEvent.setup()
    render(<NotificationSettingsScreen onNavigate={noopNavigate} />)

    const taskToggle = screen.getByRole('checkbox', { name: '下一个任务开始' })
    const friendToggle = screen.getByRole('checkbox', { name: '好友成功跑路' })

    expect(taskToggle).toBeChecked()
    expect(friendToggle).not.toBeChecked()

    await user.click(friendToggle)
    expect(friendToggle).toBeChecked()
    expect(taskToggle).toBeChecked()

    await user.click(screen.getByRole('radio', { name: '静默记录' }))
    expect(screen.getByRole('radio', { name: '静默记录' })).toHaveAttribute('aria-checked', 'true')

    await user.click(screen.getByRole('button', { name: '打开 macOS 通知设置' }))
    expect(screen.getByRole('status')).toHaveTextContent('macOS 通知设置')
    expect(screen.queryByText(/通知助手|Windows/)).not.toBeInTheDocument()
  })

  it('keeps the account page limited to the approved MVP actions', async () => {
    const user = userEvent.setup()
    render(<AccountSettingsScreen onNavigate={noopNavigate} />)

    expect(screen.queryByText(/设备会话|数据导出|活动历史删除|退出其他设备/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '修改资料' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '修改密码' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '退出登录' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '删除账号' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '修改资料' }))
    const nameInput = screen.getByLabelText('显示名称')
    await user.clear(nameInput)
    await user.type(nameInput, 'Magnus 2')
    await user.click(screen.getByRole('button', { name: '保存资料' }))

    expect(screen.getByText('Magnus 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '删除账号' }))
    expect(screen.getByRole('dialog', { name: '确认删除账号？' })).toBeInTheDocument()
    expect(screen.getByLabelText('密码')).toBeInTheDocument()
  })

  it('navigates among the settings screens inside the feature group', async () => {
    const user = userEvent.setup()
    const { container } = render(<SettingsUiGroup initialScreen="15" />)

    expect(container.querySelector('[data-ui-screen="15-settings"]')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '通知' }))
    expect(container.querySelector('[data-ui-screen="16-settings"]')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '账号' }))
    expect(container.querySelector('[data-ui-screen="17-settings"]')).toBeInTheDocument()
  })
})
