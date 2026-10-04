import { describe, it, expect } from 'vitest'
import { parseCoachPrefs } from '@/lib/voice/coach-prefs'

// The four old Voxu Voice switches: still parsed, so they carry over into
// the coaching style (lib/coach/style normalizeStyle — see coach-style.test).
describe('legacy coach preferences', () => {
  it('keeps only known keys, once each', () => {
    expect(parseCoachPrefs(['concise', 'nope', 'concise', 3, 'challenge'])).toEqual(['concise', 'challenge'])
    expect(parseCoachPrefs('concise')).toEqual([])
  })
})
