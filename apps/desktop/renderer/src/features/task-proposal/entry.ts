import type { FeatureModuleDefinition } from '../../app/featureRegistry'

export const taskProposalFeature = {
  id: 'task-proposal',
  owner: 'WS-03',
  status: 'placeholder',
  routes: ['/tasks', '/tasks/new', '/proposals/:proposalId']
} as const satisfies FeatureModuleDefinition
