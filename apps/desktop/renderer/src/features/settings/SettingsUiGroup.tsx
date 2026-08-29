import { useState } from 'react'
import { AccountSettingsScreen } from './AccountSettingsScreen'
import { ActivityRecognitionScreen } from './ActivityRecognitionScreen'
import { NotificationSettingsScreen } from './NotificationSettingsScreen'
import { PrivacySettingsScreen } from './PrivacySettingsScreen'
import type { SettingsScreenId } from './SettingsShared'
import { WorkSettingsScreen } from './WorkSettingsScreen'

interface SettingsUiGroupProps {
  initialScreen?: SettingsScreenId
}

export function SettingsUiGroup({ initialScreen = '04' }: SettingsUiGroupProps) {
  const [screen, setScreen] = useState<SettingsScreenId>(initialScreen)

  if (screen === '14') {
    return <ActivityRecognitionScreen onNavigate={setScreen} />
  }

  if (screen === '15') {
    return <PrivacySettingsScreen onNavigate={setScreen} />
  }

  if (screen === '16') {
    return <NotificationSettingsScreen onNavigate={setScreen} />
  }

  if (screen === '17') {
    return <AccountSettingsScreen onNavigate={setScreen} />
  }

  return <WorkSettingsScreen onNavigate={setScreen} />
}
