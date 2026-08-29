import { Type, type Static } from '@sinclair/typebox'
import {
  DurationMsSchema,
  EntityIdSchema,
  LocalDateSchema,
  RevisionSchema,
  UtcTimestampSchema
} from './common.js'

export const ScheduleBlockKindSchema = Type.Union([
  Type.Literal('TASK'),
  Type.Literal('MEETING'),
  Type.Literal('BREAK'),
  Type.Literal('BUFFER')
])
export const ScheduleBlockSchema = Type.Object(
  {
    id: EntityIdSchema,
    scheduleId: EntityIdSchema,
    taskId: Type.Optional(EntityIdSchema),
    kind: ScheduleBlockKindSchema,
    startsAt: UtcTimestampSchema,
    endsAt: UtcTimestampSchema,
    durationMs: DurationMsSchema,
    locked: Type.Boolean(),
    position: Type.Integer({ minimum: 0 }),
    revision: RevisionSchema
  },
  { additionalProperties: false }
)
export const DailyScheduleSchema = Type.Object(
  {
    id: EntityIdSchema,
    userId: EntityIdSchema,
    workDate: LocalDateSchema,
    policyVersion: Type.String({ minLength: 1, maxLength: 64 }),
    revision: RevisionSchema,
    confirmedAt: Type.Optional(UtcTimestampSchema),
    blocks: Type.Array(ScheduleBlockSchema)
  },
  { additionalProperties: false }
)

export type ScheduleBlock = Static<typeof ScheduleBlockSchema>
export type DailySchedule = Static<typeof DailyScheduleSchema>
