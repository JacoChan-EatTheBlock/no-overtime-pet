import { describe, expect, it } from 'vitest'
import {
  ApiErrorEnvelopeSchema,
  TaskSchema,
  WorkSettingsSchema,
  isSchemaValue
} from './index.js'

describe('Foundation contracts', () => {
  it('accepts API money as a decimal string', () => {
    expect(
      isSchemaValue(WorkSettingsSchema, {
        userId: '00000000-0000-4000-8000-000000000001',
        timeZone: 'Asia/Taipei',
        workStart: '09:00:00',
        workEnd: '18:00:00',
        lunchStart: '12:00:00',
        lunchEnd: '13:00:00',
        effectiveFrom: '2026-08-29',
        currency: 'CNY',
        dailySalaryMinor: '50000',
        revision: 1
      })
    ).toBe(true)

    expect(
      isSchemaValue(WorkSettingsSchema, {
        userId: '00000000-0000-4000-8000-000000000001',
        timeZone: 'Asia/Taipei',
        workStart: '09:00:00',
        workEnd: '18:00:00',
        lunchStart: '12:00:00',
        lunchEnd: '13:00:00',
        effectiveFrom: '2026-08-29',
        currency: 'CNY',
        dailySalaryMinor: 50000,
        revision: 1
      })
    ).toBe(false)
  })

  it('rejects unversioned task payloads and unknown fields', () => {
    expect(
      isSchemaValue(TaskSchema, {
        id: '00000000-0000-4000-8000-000000000001',
        userId: '00000000-0000-4000-8000-000000000002',
        title: '完成基座',
        dueAt: '2026-08-29T10:00:00.000Z',
        importance: 'HIGH',
        status: 'PLANNED',
        workDate: '2026-08-29',
        locked: false,
        revision: 1,
        createdAt: '2026-08-29T01:00:00.000Z',
        updatedAt: '2026-08-29T01:00:00.000Z',
        unexpected: true
      })
    ).toBe(false)
  })

  it('uses the frozen error envelope', () => {
    expect(
      isSchemaValue(ApiErrorEnvelopeSchema, {
        schemaVersion: '1.0',
        requestId: 'request-1',
        serverTime: '2026-08-29T01:00:00.000Z',
        error: { code: 'VALIDATION_ERROR', message: 'invalid input' }
      })
    ).toBe(true)
  })
})
