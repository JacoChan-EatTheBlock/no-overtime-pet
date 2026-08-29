import { Type, type Static } from '@sinclair/typebox'
import {
  EntityIdSchema,
  LocalDateSchema,
  RevisionSchema,
  UtcTimestampSchema
} from './common.js'

export const TaskImportanceSchema = Type.Union([
  Type.Literal('LOW'),
  Type.Literal('MEDIUM'),
  Type.Literal('HIGH'),
  Type.Literal('CRITICAL')
])
export const TaskStatusSchema = Type.Union([
  Type.Literal('BACKLOG'),
  Type.Literal('PLANNED'),
  Type.Literal('IN_PROGRESS'),
  Type.Literal('COMPLETED'),
  Type.Literal('CANCELLED')
])
export const TaskSchema = Type.Object(
  {
    id: EntityIdSchema,
    userId: EntityIdSchema,
    title: Type.String({ minLength: 1, maxLength: 200 }),
    dueAt: UtcTimestampSchema,
    importance: TaskImportanceSchema,
    status: TaskStatusSchema,
    workDate: LocalDateSchema,
    locked: Type.Boolean(),
    revision: RevisionSchema,
    createdAt: UtcTimestampSchema,
    updatedAt: UtcTimestampSchema,
    deletedAt: Type.Optional(UtcTimestampSchema)
  },
  { additionalProperties: false }
)

export type TaskImportance = Static<typeof TaskImportanceSchema>
export type TaskStatus = Static<typeof TaskStatusSchema>
export type Task = Static<typeof TaskSchema>
