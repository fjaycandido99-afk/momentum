import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { COACH_PREFS, coachPrefsPrompt, parseCoachPrefs } from '@/lib/voice/coach-prefs'

describe('coach preferences (Settings › Voxu Voice)', () => {
  it('keeps only known keys, once each', () => {
    expect(parseCoachPrefs(['concise', 'nope', 'concise', 3, 'challenge'])).toEqual(['concise', 'challenge'])
    expect(parseCoachPrefs('concise')).toEqual([])
    expect(parseCoachPrefs(null)).toEqual([])
  })

  it('adds nothing to the prompt when none are chosen', () => {
    expect(coachPrefsPrompt([])).toBe('')
    expect(coachPrefsPrompt(null)).toBe('')
  })

  it('turns each chosen preference into exactly its instruction', () => {
    const out = coachPrefsPrompt(['simplify', 'concise'])
    for (const p of COACH_PREFS) {
      expect(out.includes(p.line)).toBe(p.key === 'simplify' || p.key === 'concise')
    }
  })

  it('"challenge me" still puts kindness first when they are struggling', () => {
    expect(coachPrefsPrompt(['challenge'])).toMatch(/kindness comes first/i)
  })

  it('is fed into the coach, BEFORE the crisis instructions (which must win)', () => {
    const src = readFileSync(join(process.cwd(), 'app/api/ai/journal-conversation/route.ts'), 'utf8')
    const prefsAt = src.indexOf('coachPrefsPrompt(prefs?.coach_prefs)')
    const crisisAt = src.indexOf('crisisPrompt', prefsAt)
    expect(prefsAt).toBeGreaterThan(0)
    expect(crisisAt).toBeGreaterThan(prefsAt)
    expect(src).toMatch(/coach_prefs: true/)
  })
})
