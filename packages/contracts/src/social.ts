import { Type, type Static } from '@sinclair/typebox'
import { EntityIdSchema, UtcTimestampSchema } from './common.js'
import { PublicActivityStatusSchema } from './activity.js'
import { PetActionSchema } from './pet.js'

export const FriendshipStatusSchema = Type.Union([
  Type.Literal('NONE'),
  Type.Literal('PENDING_OUT'),
  Type.Literal('PENDING_IN'),
  Type.Literal('ACCEPTED')
])
export const PublicUserProjectionSchema = Type.Object(
  {
    userId: EntityIdSchema,
    displayName: Type.String({ minLength: 1, maxLength: 64 }),
    activityStatus: PublicActivityStatusSchema,
    petAction: PetActionSchema,
    observedAt: UtcTimestampSchema
  },
  { additionalProperties: false }
)

export type FriendshipStatus = Static<typeof FriendshipStatusSchema>
export type PublicUserProjection = Static<typeof PublicUserProjectionSchema>
