import { Type, type Static } from '@sinclair/typebox'
import {
  EntityIdSchema,
  IanaTimeZoneSchema,
  LocalDateSchema,
  MoneyMinorCnyStringSchema,
  RevisionSchema,
  TimeOfDaySchema
} from './common.js'

export const WorkSettingsSchema = Type.Object(
  {
    userId: EntityIdSchema,
    timeZone: IanaTimeZoneSchema,
    workStart: TimeOfDaySchema,
    workEnd: TimeOfDaySchema,
    lunchStart: TimeOfDaySchema,
    lunchEnd: TimeOfDaySchema,
    effectiveFrom: LocalDateSchema,
    currency: Type.Literal('CNY'),
    dailySalaryMinor: MoneyMinorCnyStringSchema,
    revision: RevisionSchema
  },
  { additionalProperties: false }
)

export type WorkSettings = Static<typeof WorkSettingsSchema>
