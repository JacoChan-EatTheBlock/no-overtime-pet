import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationsDirectory = resolve(process.cwd(), 'packages/db/migrations')

describe('Foundation database migrations', () => {
  it('uses unique four-digit migration numbers', () => {
    const files = readdirSync(migrationsDirectory).filter((file) => file.endsWith('.sql'))
    const numbers = files.map((file) => file.slice(0, 4))

    expect(files.every((file) => /^\d{4}_[a-z0-9_]+\.sql$/.test(file))).toBe(true)
    expect(new Set(numbers).size).toBe(numbers.length)
  })

  it('defines the four frozen core tables', () => {
    const sql = readFileSync(`${migrationsDirectory}/0000_core.sql`, 'utf8')

    for (const table of [
      'core_schema_versions',
      'core_users',
      'core_idempotency_keys',
      'core_outbox_events'
    ]) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`)
    }
  })
})
