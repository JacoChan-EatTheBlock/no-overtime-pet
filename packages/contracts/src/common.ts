import { Type, type Static } from '@sinclair/typebox'

export const SCHEMA_VERSION = '1.0' as const

export const SchemaVersionSchema = Type.Literal(SCHEMA_VERSION)
export const EntityIdSchema = Type.String({
  pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
})
export const UtcTimestampSchema = Type.String({
  pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?Z$'
})
export const LocalDateSchema = Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' })
export const TimeOfDaySchema = Type.String({ pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d$' })
export const IanaTimeZoneSchema = Type.Union([
  Type.Literal('UTC'),
  Type.String({ pattern: '^[A-Za-z_]+(?:/[A-Za-z0-9_+\\-]+)+$' })
])
export const DurationMsSchema = Type.Integer({ minimum: 0 })
export const RevisionSchema = Type.Integer({ minimum: 1 })
export const ProbabilitySchema = Type.Number({ minimum: 0, maximum: 1 })
export const MoneyMinorCnyStringSchema = Type.String({ pattern: '^-?\\d+$' })
export const IdempotencyKeySchema = Type.String({ minLength: 1, maxLength: 128 })

export type EntityId = Static<typeof EntityIdSchema>
export type UtcTimestamp = Static<typeof UtcTimestampSchema>
export type LocalDate = Static<typeof LocalDateSchema>
export type TimeOfDay = Static<typeof TimeOfDaySchema>
export type IanaTimeZone = Static<typeof IanaTimeZoneSchema>
export type DurationMs = Static<typeof DurationMsSchema>
export type Revision = Static<typeof RevisionSchema>
export type MoneyMinorCnyString = Static<typeof MoneyMinorCnyStringSchema>
