import type { FeatureModuleDefinition } from '../../app/featureRegistry'

export const accountFeature = {
  id: 'account',
  owner: 'WS-02',
  status: 'placeholder',
  routes: ['/login', '/settings/account']
} as const satisfies FeatureModuleDefinition
