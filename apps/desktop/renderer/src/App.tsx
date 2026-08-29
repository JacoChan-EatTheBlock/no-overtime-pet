import { useEffect, useState, type ReactNode } from 'react'
import { isAuthenticated, getMe, logout as apiLogout } from './api/auth'
import type { User } from './api/types'
import {
  IconCalendarDue,
  IconUsers,
  IconSettings,
  IconShoppingBag,
  IconWallet
} from '@tabler/icons-react'
import { LoginScreen } from './features/auth/LoginScreen'
import { TaskScheduleFlow } from './features/task-schedule/TaskScheduleFlow'
import { useEngine } from './features/task-schedule/adapter/useEngine'
import { FriendsManagementScreen } from './features/pet-social-menu/PetSocialMenuScreens'
import { ShopScreen } from './features/shop/ShopScreen'
import { CustomizationScreen } from './features/customization/CustomizationScreen'
import { WalletScreen } from './features/wallet/WalletScreen'
import { SettingsUiGroup } from './features/settings/SettingsUiGroup'
import { NangFeeScreen } from './features/nang-fee/NangFeeScreen'
import styles from './App.module.css'

/**
 * Screen IDs — each is a full-window PixelSurface panel with its own close button.
 *
 * 'task-flow' 是任务与排程的 6 屏（气泡/待办/AI 建议/安排草案/跑路确认/跑路结果），
 * 由 useEngine 驱动真实逻辑层，内部自己路由，所以在外层只占一个屏幕位。
 */
export type ScreenId =
  | 'task-flow'
  | 'friends'
  | 'shop'
  | 'customization'
  | 'wallet'
  | 'settings'
  | 'nangfee'

/** Navigation items shown in the bottom bar. */
const NAV_ITEMS: Array<{ id: ScreenId; label: string; icon: typeof IconCalendarDue }> = [
  { id: 'task-flow', label: '任务安排', icon: IconCalendarDue },
  { id: 'friends', label: '好友', icon: IconUsers },
  { id: 'wallet', label: '钱包', icon: IconWallet },
  { id: 'shop', label: '商店', icon: IconShoppingBag },
  { id: 'settings', label: '设置', icon: IconSettings }
]

export function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authChecking, setAuthChecking] = useState(() => isAuthenticated())
  const [screen, setScreen] = useState<ScreenId>('task-flow')
  const engine = useEngine('05-task-list')

  useEffect(() => {
    if (!isAuthenticated()) {
      setAuthChecking(false)
      return
    }

    let cancelled = false

    getMe()
      .then((me) => {
        if (!cancelled) {
          setUser(me)
          setAuthChecking(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          apiLogout()
          setAuthChecking(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  function openScreen(id: ScreenId): void {
    setScreen(id)
  }

  if (authChecking) {
    return null
  }

  if (!user) {
    return <LoginScreen onSuccess={setUser} />
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
    friends: <FriendsManagementScreen />,
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
    nangfee: <NangFeeScreen />,
    settings: <SettingsUiGroup />
  }

  return (
    <main className={styles.stage} data-ui-screen={screen}>
      <div className={styles.content}>
        {screens[screen]}
      </div>

      <nav className={styles.navBar} aria-label="主导航">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={screen === id ? styles.navItemActive : styles.navItem}
            onClick={() => openScreen(id)}
          >
            <Icon size={20} stroke={1.6} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </main>
  )
}
