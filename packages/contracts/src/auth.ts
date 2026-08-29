import { Type, type Static } from '@sinclair/typebox'
import { EntityIdSchema, RevisionSchema, UtcTimestampSchema } from './common.js'

export const UsernameSchema = Type.String({ minLength: 3, maxLength: 32, pattern: '^[A-Za-z0-9_]+$' })
export const PasswordSchema = Type.String({ minLength: 8, maxLength: 128 })

export const RegisterRequestSchema = Type.Object(
  { username: UsernameSchema, password: PasswordSchema },
  { additionalProperties: false }
)
export const LoginRequestSchema = Type.Object(
  { username: UsernameSchema, password: PasswordSchema },
  { additionalProperties: false }
)
export const UserProfileSchema = Type.Object(
  {
    id: EntityIdSchema,
    username: UsernameSchema,
    displayName: Type.String({ minLength: 1, maxLength: 64 }),
    friendCode: Type.String({ minLength: 6, maxLength: 24 }),
    revision: RevisionSchema,
    createdAt: UtcTimestampSchema,
    deletedAt: Type.Optional(UtcTimestampSchema)
  },
  { additionalProperties: false }
)
export const AuthSessionSchema = Type.Object(
  {
    accessToken: Type.String({ minLength: 1 }),
    accessTokenExpiresAt: UtcTimestampSchema,
    refreshToken: Type.String({ minLength: 1 }),
    refreshTokenExpiresAt: UtcTimestampSchema,
    user: UserProfileSchema
  },
  { additionalProperties: false }
)

export type RegisterRequest = Static<typeof RegisterRequestSchema>
export type LoginRequest = Static<typeof LoginRequestSchema>
export type UserProfile = Static<typeof UserProfileSchema>
export type AuthSession = Static<typeof AuthSessionSchema>
