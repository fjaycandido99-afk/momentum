import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { SITUATIONS, coachStylePrompt, defaultStyle, normalizeStyle, promiseStyleNote } from '@/lib/coach/style'

describe('coaching style (Settings › Mindset & Coaching)', () => {
  it('carries the old Voxu Voice switches over when no style was saved', () => {
    const s = normalizeStyle(null, ['concise', 'challenge', 'encourage', 'simplify'])
    expect(s.length).toBe('short')
    expect(s.responses.procrastinating).toBe('challenge')
    expect(s.responses.doubting).toBe('encourage')
    expect(s.responses.overwhelmed).toBe('simplify')
  })

  it('a saved style wins over the old switches', () => {
    expect(normalizeStyle({ length: 'normal' }, ['concise']).length).toBe('normal')
  })

  it('throws away anything invalid instead of storing it', () => {
    const s = normalizeStyle({ intensity: 'brutal', callout: 'yes', responses: { missed: 'shame', doubting: 'straight' } })
    expect(s.intensity).toBe('balanced')
    expect(s.callout).toBe(false)
    expect(s.responses.missed).toBe(defaultStyle().responses.missed)
    expect(s.responses.doubting).toBe('straight')
  })

  it('every choice becomes exactly its instruction, and distress always wins', () => {
    const style = { ...defaultStyle(), intensity: 'hard' as const, callout: true, length: 'short' as const }
    const out = coachStylePrompt(style)
    for (const sit of SITUATIONS) {
      for (const o of sit.options) expect(out.includes(o.prompt)).toBe(o.key === style.responses[sit.key])
    }
    expect(out).toMatch(/call it out/)
    expect(out).toMatch(/real distress, set all of this aside/)
  })

  it('the promise reply only gets the situation it can see', () => {
    const s = defaultStyle()
    expect(promiseStyleNote(s, 'broken')).toContain(SITUATIONS[2].options[0].prompt)
    expect(promiseStyleNote(s, 'broken')).not.toContain(SITUATIONS[4].options[0].prompt)
    expect(promiseStyleNote(s, 'kept')).toContain(SITUATIONS[4].options[0].prompt)
  })

  it('reaches Talk/journal before the crisis prompt, and the promise reply', () => {
    const j = readFileSync(join(process.cwd(), 'app/api/ai/journal-conversation/route.ts'), 'utf8')
    const at = j.indexOf('coachStylePrompt(normalizeStyle(')
    expect(at).toBeGreaterThan(0)
    expect(j.indexOf('crisisPrompt', at)).toBeGreaterThan(at)
    const svc = readFileSync(join(process.cwd(), 'lib/era/service.ts'), 'utf8')
    expect(svc).toMatch(/styleNote: promiseStyleNote\(/)
    expect(readFileSync(join(process.cwd(), 'lib/era/coach.ts'), 'utf8')).toMatch(/input\.styleNote/)
  })
})
