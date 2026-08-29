import { describe, expect, it } from 'vitest'
import { readApiPort } from './configuration.js'

describe('readApiPort', () => {
  it('uses the frozen Foundation port when unset', () => {
    expect(readApiPort(undefined)).toBe(28780)
  })

  it('rejects invalid ports instead of silently choosing another', () => {
    expect(() => readApiPort('0')).toThrow('API_PORT')
    expect(() => readApiPort('not-a-port')).toThrow('API_PORT')
  })
})
