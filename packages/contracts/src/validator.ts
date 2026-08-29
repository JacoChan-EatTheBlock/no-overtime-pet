import { Ajv } from 'ajv'
import type { Static, TSchema } from '@sinclair/typebox'

const ajv = new Ajv({ allErrors: true, strict: true })

export function isSchemaValue<T extends TSchema>(schema: T, value: unknown): value is Static<T> {
  return ajv.compile(schema)(value) as boolean
}
