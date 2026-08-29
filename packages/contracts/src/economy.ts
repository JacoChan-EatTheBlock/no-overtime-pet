import { Type, type Static } from '@sinclair/typebox'
import {
  DurationMsSchema,
  EntityIdSchema,
  MoneyMinorCnyStringSchema,
  RevisionSchema,
  UtcTimestampSchema
} from './common.js'

export const LedgerEntryKindSchema = Type.Union([
  Type.Literal('WORK_CREDIT'),
  Type.Literal('OVERTIME_FORFEIT_DEBIT'),
  Type.Literal('ON_TIME_REWARD_CREDIT'),
  Type.Literal('PURCHASE_DEBIT'),
  Type.Literal('REFUND_CREDIT'),
  Type.Literal('ADMIN_CORRECTION')
])
export const WalletBalanceSchema = Type.Object(
  {
    userId: EntityIdSchema,
    normalizedBalanceMs: Type.Integer(),
    displayBalanceMinor: MoneyMinorCnyStringSchema,
    currency: Type.Literal('CNY'),
    revision: RevisionSchema,
    asOf: UtcTimestampSchema
  },
  { additionalProperties: false }
)
export const CatalogItemSchema = Type.Object(
  {
    id: EntityIdSchema,
    sku: Type.String({ minLength: 1, maxLength: 64 }),
    kind: Type.Union([Type.Literal('CHARACTER'), Type.Literal('HAT')]),
    name: Type.String({ minLength: 1, maxLength: 100 }),
    priceWorkDurationMs: DurationMsSchema,
    active: Type.Boolean(),
    revision: RevisionSchema
  },
  { additionalProperties: false }
)

export type LedgerEntryKind = Static<typeof LedgerEntryKindSchema>
export type WalletBalance = Static<typeof WalletBalanceSchema>
export type CatalogItem = Static<typeof CatalogItemSchema>
