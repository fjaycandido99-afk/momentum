import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Settings saves every field it sends; a field it saves but never LOADS goes
 * back as the page's default on any change. That silently revoked Voxu Memory
 * consent and reset reminder times (fixed 2026-10-03). Pin the round trip.
 */
const page = readFileSync(join(process.cwd(), 'app/(dashboard)/settings/page.tsx'), 'utf8')
const route = readFileSync(join(process.cwd(), 'app/api/daily-guide/preferences/route.ts'), 'utf8')

function savedFields(): string[] {
  const body = page.match(/method: 'POST',[\s\S]*?body: JSON\.stringify\(\{([\s\S]*?)\}\),/)
  expect(body).not.toBeNull()
  return [...body![1].matchAll(/^\s*([a-z_]+):/gm)].map(m => m[1]).filter(k => k !== 'timezone')
}

describe('Settings preference round trip', () => {
  it('loads every field it saves', () => {
    const getSelect = route.slice(route.indexOf('export async function GET'), route.indexOf('export async function POST'))
    const fields = savedFields()
    expect(fields.length).toBeGreaterThan(5)
    for (const k of fields) expect(getSelect, `${k} is saved by Settings but not loaded`).toMatch(new RegExp(`\\b${k}: true`))
  })

  it('no longer sends the controls nothing reads', () => {
    for (const dead of ['user_type', 'work_days', 'class_days', 'enabled_segments', 'workout_enabled', 'guide_tone']) {
      expect(savedFields()).not.toContain(dead)
    }
  })
})
