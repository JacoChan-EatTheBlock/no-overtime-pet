import { Type, type Static, type TSchema } from '@sinclair/typebox'
import { SCHEMA_VERSION, SchemaVersionSchema, UtcTimestampSchema } from './common.js'

export const ApiErrorCodeSchema = Type.Union([
  Type.Literal('VALIDATION_ERROR'),
  Type.Literal('UNAUTHORIZED'),
  Type.Literal('FORBIDDEN'),
  Type.Literal('NOT_FOUND'),
  Type.Literal('CONFLICT'),
  Type.Literal('REVISION_CONFLICT'),
  Type.Literal('IDEMPOTENCY_CONFLICT'),
  Type.Literal('RATE_LIMITED'),
  Type.Literal('DEPENDENCY_UNAVAILABLE'),
  Type.Literal('INTERNAL_ERROR')
])

export function ApiSuccessEnvelopeSchema<T extends TSchema>(data: T) {
  return Type.Object(
    {
      schemaVersion: SchemaVersionSchema,
      requestId: Type.String({ minLength: 1, maxLength: 128 }),
      serverTime: UtcTimestampSchema,
      data
    },
    { additionalProperties: false }
  )
}

export const ApiErrorEnvelopeSchema = Type.Object(
  {
    schemaVersion: SchemaVersionSchema,
    requestId: Type.String({ minLength: 1, maxLength: 128 }),
    serverTime: UtcTimestampSchema,
    error: Type.Object(
      {
        code: ApiErrorCodeSchema,
        message: Type.String({ minLength: 1, maxLength: 512 }),
        details: Type.Optional(Type.Unknown())
      },
      { additionalProperties: false }
    )
  },
  { additionalProperties: false }
)

export const ApiHealthDataSchema = Type.Object(
  {
    service: Type.Literal('no-overtime-api'),
    status: Type.Literal('ok')
  },
  { additionalProperties: false }
)

export const ApiRoutes = {
  health: '/v1/health',
  auth: '/v1/auth',
  tasks: '/v1/tasks',
  proposals: '/v1/proposals',
  schedules: '/v1/schedules',
  workSettings: '/v1/work-settings',
  economy: '/v1/economy',
  friends: '/v1/friends'
} as const

export function createSuccessEnvelope<T>(requestId: string, data: T) {
  return {
    schemaVersion: SCHEMA_VERSION,
    requestId,
    serverTime: new Date().toISOString(),
    data
  } as const
}

export type ApiErrorCode = Static<typeof ApiErrorCodeSchema>
export type ApiErrorEnvelope = Static<typeof ApiErrorEnvelopeSchema>
