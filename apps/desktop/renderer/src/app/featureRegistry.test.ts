import { describe, expect, it } from 'vitest'
import { featureRegistry } from './featureRegistry'

describe('featureRegistry', () => {
  it('pre-registers each independently mergeable UI workstream once', () => {
    expect(featureRegistry.map((feature) => feature.owner)).toEqual([
      'WS-02',
      'WS-03',
      'WS-04',
      'WS-05',
      'WS-06',
      'WS-07'
    ])
    expect(new Set(featureRegistry.map((feature) => feature.id)).size).toBe(featureRegistry.length)
  })
})
