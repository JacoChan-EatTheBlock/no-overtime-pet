import { accountFeature } from '../features/account/entry'
import { activityPetFeature } from '../features/activity-pet/entry'
import { economyFeature } from '../features/economy/entry'
import { scheduleFeature } from '../features/schedule/entry'
import { socialFeature } from '../features/social/entry'
import { taskProposalFeature } from '../features/task-proposal/entry'

export interface FeatureModuleDefinition {
  id: 'account' | 'task-proposal' | 'schedule' | 'economy' | 'activity-pet' | 'social'
  owner: 'WS-02' | 'WS-03' | 'WS-04' | 'WS-05' | 'WS-06' | 'WS-07'
  status: 'placeholder' | 'implemented'
  routes: readonly string[]
}

export const featureRegistry = [
  accountFeature,
  taskProposalFeature,
  scheduleFeature,
  economyFeature,
  activityPetFeature,
  socialFeature
] as const satisfies readonly FeatureModuleDefinition[]
