import { useState, type ReactNode } from 'react'
import { LoginScreen } from './features/auth/LoginScreen'
import { TaskListScreen, type TaskItem } from './features/tasks/TaskListScreen'
import { TaskAIProposalScreen } from './features/tasks/TaskAIProposalCard'
import { ScheduleScreen } from './features/schedule/ScheduleScreen'
import { FriendsManagementScreen } from './features/pet-social-menu/PetSocialMenuScreens'
import { ShopScreen } from './features/shop/ShopScreen'
import { CustomizationScreen } from './features/customization/CustomizationScreen'
import { WalletScreen } from './features/wallet/WalletScreen'
import { SettingsUiGroup } from './features/settings/SettingsUiGroup'
import styles from './App.module.css'

/**
 * Screen IDs — each is a full-window PixelSurface panel with its own close button.
 * Navigation is stack-based: open a screen → close returns to previous.
 */
export type ScreenId =
  | 'tasks'
  | 'ai-proposal'
  | 'schedule'
  | 'friends'
  | 'shop'
  | 'customization'
  | 'wallet'
  | 'settings'

export function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [screen, setScreen] = useState<ScreenId>('tasks')
  const [proposalTask, setProposalTask] = useState<TaskItem | null>(null)

  if (!loggedIn) {
    return <LoginScreen onSuccess={() => setLoggedIn(true)} />
  }

  function openScreen(id: ScreenId): void {
    setScreen(id)
  }

  function handleAIAnalysis(task: TaskItem): void {
    setProposalTask(task)
    setScreen('ai-proposal')
  }

  function handleProposalConfirm(): void {
    setProposalTask(null)
    setScreen('schedule')
  }

  const screens: Record<ScreenId, ReactNode> = {
    tasks: (
      <TaskListScreen
        onClose={() => {}}
        onNavigate={openScreen}
        onAIAnalysis={handleAIAnalysis}
      />
    ),
    'ai-proposal': (
      <TaskAIProposalScreen
        task={proposalTask}
        onClose={() => setScreen('tasks')}
        onConfirm={handleProposalConfirm}
      />
    ),
    schedule: (
      <ScheduleScreen
        onClose={() => setScreen('tasks')}
        onNavigate={openScreen}
      />
    ),
    friends: (
      <FriendsManagementScreen />
    ),
    shop: (
      <ShopScreen
        onClose={() => setScreen('tasks')}
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
        onClose={() => setScreen('tasks')}
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
