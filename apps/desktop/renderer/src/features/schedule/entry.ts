import type { FeatureModuleDefinition } from '../../app/featureRegistry'

export const scheduleFeature = {
  id: 'schedule',
  owner: 'WS-04',
  status: 'placeholder',
  routes: ['/schedule/today']
} as const satisfies FeatureModuleDefinition
