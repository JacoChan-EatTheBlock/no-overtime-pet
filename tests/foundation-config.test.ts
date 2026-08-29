import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

function readEnvironmentExample(): Map<string, string> {
  const source = readFileSync(resolve(process.cwd(), '.env.example'), 'utf8')
  const entries = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => {
      const separator = line.indexOf('=')
      return [line.slice(0, separator), line.slice(separator + 1)] as const
    })

  return new Map(entries)
}

describe('Windows Foundation configuration', () => {
  it('freezes the documented local ports', () => {
    const environment = readEnvironmentExample()

    expect(environment.get('RENDERER_PORT')).toBe('5173')
    expect(environment.get('API_PORT')).toBe('28780')
    expect(environment.get('POSTGRES_PORT')).toBe('55430')
    expect(environment.get('REDIS_PORT')).toBe('56380')
    expect(environment.get('VITE_API_BASE_URL')).toBe('http://127.0.0.1:28780/v1')
  })

  it('keeps renderer-visible variables free of credentials', () => {
    const environment = readEnvironmentExample()
    const publicEntries = [...environment].filter(([name]) => name.startsWith('VITE_'))

    expect(publicEntries).toEqual([
      ['VITE_API_BASE_URL', 'http://127.0.0.1:28780/v1']
    ])
  })

  it('defines isolated PostgreSQL and Redis compose services', () => {
    const compose = parse(
      readFileSync(resolve(process.cwd(), 'docker-compose.dev.yml'), 'utf8')
    ) as {
      services?: Record<string, { ports?: string[] }>
      volumes?: Record<string, unknown>
    }

    expect(Object.keys(compose.services ?? {})).toEqual(['postgres', 'redis'])
    expect(compose.services?.postgres.ports).toContain('${POSTGRES_PORT:-55430}:5432')
    expect(compose.services?.redis.ports).toContain('${REDIS_PORT:-56380}:6379')
    expect(Object.keys(compose.volumes ?? {})).toEqual(['postgres-data', 'redis-data'])
  })
})
