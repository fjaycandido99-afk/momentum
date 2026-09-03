import { describe, it, expect } from 'vitest'
import { isSessionType, type SessionType } from '@/lib/daily-guide/decision-tree'

describe('isSessionType', () => {
  it('accepts every real segment', () => {
    const all: SessionType[] = ['morning_prime', 'midday_reset', 'wind_down', 'bedtime_story']
    for (const s of all) expect(isSessionType(s)).toBe(true)
  })

  it('rejects anything else, so a stale link falls back to the clock', () => {
    for (const bad of ['', 'morning', 'MORNING_PRIME', 'drop table', null, undefined, 3, {}]) {
      expect(isSessionType(bad)).toBe(false)
    }
  })
})

describe('notification deep links', () => {
  // Imported lazily: push-service pulls in prisma and web-push at module
  // load, which we do not want in a unit test. The URL map is a plain
  // literal, so reading it out of the source is enough to pin the
  // contract that each guide push names its own segment.
  const source = require('fs').readFileSync('lib/push-service.ts', 'utf8') as string
  const urlMap = source.slice(
    source.indexOf('const DEFAULT_URL_BY_TYPE'),
    source.indexOf('export async function sendPushToUser')
  )

  const expected: Record<string, string> = {
    morning_reminder: 'session=morning_prime',
    evening_reminder: 'session=wind_down',
    bedtime_reminder: 'session=bedtime_story',
    midday_reset: 'session=midday_reset',
    wind_down: 'session=wind_down',
    daily_affirmation: 'session=morning_prime',
  }

  for (const [type, param] of Object.entries(expected)) {
    it(`${type} opens its own segment, not whatever the clock picks`, () => {
      const line = urlMap.split(/\r?\n/).find(l => l.trim().startsWith(`${type}:`))
      expect(line, `no url mapping for ${type}`).toBeTruthy()
      expect(line).toContain('/daily-guide')
      expect(line).toContain(param)
    })
  }

  it('every segment named in a deep link is a real segment', () => {
    const params = urlMap.match(/session=([a-z_]+)/g) ?? []
    expect(params.length).toBeGreaterThan(0)
    for (const p of params) {
      expect(isSessionType(p.replace('session=', ''))).toBe(true)
    }
  })
})
