import type { FeatureModuleDefinition } from '../../app/featureRegistry'

export const economyFeature = {
  id: 'economy',
  owner: 'WS-05',
  status: 'placeholder',
  routes: ['/wallet', '/shop', '/wardrobe']
} as const satisfies FeatureModuleDefinition
