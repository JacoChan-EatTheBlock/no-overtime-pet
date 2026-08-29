import { Type, type Static } from '@sinclair/typebox'

export const PetActionSchema = Type.Union([
  Type.Literal('WORK_NORMAL'),
  Type.Literal('SLACKING'),
  Type.Literal('TYPE_FRENZY')
])
export const PetEffectSchema = Type.Union([
  Type.Literal('COIN_OUT'),
  Type.Literal('COIN_IN_GLOW')
])

export type PetAction = Static<typeof PetActionSchema>
export type PetEffect = Static<typeof PetEffectSchema>
