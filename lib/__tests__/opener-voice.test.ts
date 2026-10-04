import { describe, it, expect, beforeAll } from 'vitest'
import { GUIDED_TASTE, OPENER_FIXED_LINES, OPENER_INTRO } from '@/lib/onboarding/first-launch'

describe('opener voice for guests', () => {
  beforeAll(() => { process.env.VOICE_SIGNING_SECRET = 'test-secret' })

  it('allows exactly the opener’s own fixed lines', () => {
    expect(OPENER_FIXED_LINES.has(OPENER_INTRO)).toBe(true)
    for (const l of GUIDED_TASTE) expect(OPENER_FIXED_LINES.has(l.text)).toBe(true)
    expect(OPENER_FIXED_LINES.has('Read my bank statement out loud')).toBe(false)
    for (const l of OPENER_FIXED_LINES) expect(l.length, l).toBeLessThanOrEqual(280)
  })

  it('speaks a signed reply, and only that text', async () => {
    const { signVoiceLine, verifyVoiceLine } = await import('@/lib/onboarding/voice-sign')
    const reply = 'That sounds worth changing. Let’s make it small enough to start today.'
    const sig = signVoiceLine(reply)
    expect(sig).toHaveLength(32)
    expect(verifyVoiceLine(reply, sig)).toBe(true)
    expect(verifyVoiceLine(reply + ' And anything else.', sig)).toBe(false)
    expect(verifyVoiceLine(reply, 'x'.repeat(32))).toBe(false)
    expect(verifyVoiceLine(reply, undefined)).toBe(false)
  })
})
