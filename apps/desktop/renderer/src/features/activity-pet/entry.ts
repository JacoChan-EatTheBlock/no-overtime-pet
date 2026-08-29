import type { FeatureModuleDefinition } from '../../app/featureRegistry'

export const activityPetFeature = {
  id: 'activity-pet',
  owner: 'WS-06',
  status: 'placeholder',
  routes: ['/activity', '/settings/privacy']
} as const satisfies FeatureModuleDefinition
