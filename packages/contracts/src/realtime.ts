import { Type, type Static } from '@sinclair/typebox'
import { EntityIdSchema, SchemaVersionSchema, UtcTimestampSchema } from './common.js'

export const RealtimeEventTypeSchema = Type.Union([
  Type.Literal('presence.snapshot'),
  Type.Literal('presence.changed'),
  Type.Literal('activity.changed'),
  Type.Literal('friendship.revoked')
])
export const RealtimeEventEnvelopeSchema = Type.Object(
  {
    schemaVersion: SchemaVersionSchema,
    eventId: EntityIdSchema,
    eventType: RealtimeEventTypeSchema,
    occurredAt: UtcTimestampSchema,
    payload: Type.Unknown()
  },
  { additionalProperties: false }
)

export type RealtimeEventType = Static<typeof RealtimeEventTypeSchema>
export type RealtimeEventEnvelope = Static<typeof RealtimeEventEnvelopeSchema>
