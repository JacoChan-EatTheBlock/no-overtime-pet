import { useState, type ReactNode } from 'react'
import { LoginScreen } from './features/auth/LoginScreen'
import { TaskScheduleFlow } from './features/task-schedule/TaskScheduleFlow'
import { useEngine } from './features/task-schedule/adapter/useEngine'
import { FriendsManagementScreen } from './features/pet-social-menu/PetSocialMenuScreens'
import { ShopScreen } from './features/shop/ShopScreen'
import { CustomizationScreen } from './features/customization/CustomizationScreen'
import { WalletScreen } from './features/wallet/WalletScreen'
import { SettingsUiGroup } from './features/settings/SettingsUiGroup'
import styles from './App.module.css'

/**
 * Screen IDs — each is a full-window PixelSurface panel with its own close button.
 * Navigation is stack-based: open a screen → close returns to previous.
 *
 * 'task-flow' 是任务与排程的 6 屏（气泡/待办/AI 建议/安排草案/跑路确认/跑路结果），
 * 由 useEngine 驱动真实逻辑层，内部自己路由，所以在外层只占一个屏幕位。
 * 旧的 features/tasks 与 features/schedule 组件仍保留在仓库里，未接入路由。
 */
export type ScreenId =
  | 'task-flow'
  | 'friends'
  | 'shop'
  | 'customization'
  | 'wallet'
  | 'settings'

export function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [screen, setScreen] = useState<ScreenId>('task-flow')
  const engine = useEngine('05-task-list')

  function openScreen(id: ScreenId): void {
    setScreen(id)
  }

  if (!loggedIn) {
    return <LoginScreen onSuccess={() => setLoggedIn(true)} />
  }

  const screens: Record<ScreenId, ReactNode> = {
    'task-flow': (
      <TaskScheduleFlow
        engine={engine}
        nav={{
          openFriends: () => openScreen('friends'),
          openSettings: () => openScreen('settings')
        }}
      />
    ),
    friends: (
      <FriendsManagementScreen />
    ),
    shop: (
      <ShopScreen
        onClose={() => setScreen('task-flow')}
        onNavigate={openScreen}
      />
    ),
    customization: (
      <CustomizationScreen
        onClose={() => setScreen('shop')}
      />
    ),
    wallet: (
      <WalletScreen
        onClose={() => setScreen('task-flow')}
        onNavigate={openScreen}
      />
    ),
    settings: (
      <SettingsUiGroup />
    ),
  }

  return (
    <main className={styles.stage} data-ui-screen={screen}>
      {screens[screen]}
    </main>
  )
}
