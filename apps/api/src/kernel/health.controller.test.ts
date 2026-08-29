import { describe, expect, it } from 'vitest'
import {
  ApiHealthDataSchema,
  ApiSuccessEnvelopeSchema,
  isSchemaValue
} from '@no-overtime/contracts'
import { HealthController } from './health.controller.js'

describe('HealthController', () => {
  it('returns the shared API envelope', () => {
    const response = new HealthController().getHealth()
    const schema = ApiSuccessEnvelopeSchema(ApiHealthDataSchema)

    expect(isSchemaValue(schema, response)).toBe(true)
  })
})
