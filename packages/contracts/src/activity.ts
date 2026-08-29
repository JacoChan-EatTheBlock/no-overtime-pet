import { Type, type Static } from '@sinclair/typebox'
import {
  DurationMsSchema,
  EntityIdSchema,
  ProbabilitySchema,
  UtcTimestampSchema
} from './common.js'

export const ActivityCategorySchema = Type.Union([
  Type.Literal('CODING'),
  Type.Literal('READING'),
  Type.Literal('DESIGNING'),
  Type.Literal('MEETING'),
  Type.Literal('BROWSING_WORK'),
  Type.Literal('BROWSING_LEISURE'),
  Type.Literal('MEDIA_LEISURE'),
  Type.Literal('TYPING'),
  Type.Literal('IDLE'),
  Type.Literal('AWAY'),
  Type.Literal('UNKNOWN')
])
export const PublicActivityStatusSchema = Type.Union([
  Type.Literal('WORKING'),
  Type.Literal('MEETING'),
  Type.Literal('SLACKING'),
  Type.Literal('IDLE'),
  Type.Literal('AWAY'),
  Type.Literal('OFFLINE')
])
export const LocalActivityObservationSchema = Type.Object(
  {
    id: EntityIdSchema,
    observedAt: UtcTimestampSchema,
    category: ActivityCategorySchema,
    confidence: ProbabilitySchema,
    durationMs: DurationMsSchema,
    sourcePolicyVersion: Type.String({ minLength: 1, maxLength: 64 })
  },
  { additionalProperties: false }
)

export type ActivityCategory = Static<typeof ActivityCategorySchema>
export type PublicActivityStatus = Static<typeof PublicActivityStatusSchema>
export type LocalActivityObservation = Static<typeof LocalActivityObservationSchema>
