import type { FeatureModuleDefinition } from '../../app/featureRegistry'

export const socialFeature = {
  id: 'social',
  owner: 'WS-07',
  status: 'placeholder',
  routes: ['/friends', '/office']
} as const satisfies FeatureModuleDefinition
