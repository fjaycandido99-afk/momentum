import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  AI_FEATURE_LIMITS,
  AI_MEMORY_DEPTH,
  aiFeatureAllowance,
  type AiFeatureKey,
} from '@/lib/subscription-constants'
import { detectCrisisLevel, detectRegion, crisisResourceForLevel } from '@/lib/ai/crisis-detect'
import { applyVoiceTone, GUIDE_TONES } from '@/lib/ai/voice-tone'
import { TONE_VOICES, CHAT_CREDIT_LIMIT, MONTHLY_CREDIT_LIMIT } from '@/lib/daily-guide/audio-utils'

// consumeAiQuota touches the database, so the counter tests below drive a
// stubbed Prisma. Everything else here is pure.
const upsert = vi.fn()
const update = vi.fn()
const findUnique = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    aiUsageDaily: {
      upsert: (...a: unknown[]) => upsert(...a),
      update: (...a: unknown[]) => update(...a),
      findUnique: (...a: unknown[]) => findUnique(...a),
    },
  },
}))

const { consumeAiQuota, peekAiQuota, dayKeyFor } = await import('@/lib/ai/quota')

beforeEach(() => {
  upsert.mockReset()
  update.mockReset()
  findUnique.mockReset()
})

// Premium is unlimited everywhere EXCEPT where a call costs us real money
// per use. Spoken replies burn ElevenLabs characters out of a shared
// monthly pool, so premium is capped there too. Anything added to this
// list is a deliberate decision to charge someone and still say no.
const METERED_FOR_PREMIUM: AiFeatureKey[] = ['chat_voice']

describe('aiFeatureAllowance', () => {
  it('gives premium an unlimited allowance except where each call costs money', () => {
    for (const key of Object.keys(AI_FEATURE_LIMITS) as AiFeatureKey[]) {
      if (METERED_FOR_PREMIUM.includes(key)) {
        expect(aiFeatureAllowance(key, true)).toBeGreaterThan(0)
      } else {
        expect(aiFeatureAllowance(key, true)).toBeNull()
      }
    }
  })

  it('keeps every free allowance small enough to still be a taste', () => {
    for (const key of Object.keys(AI_FEATURE_LIMITS) as AiFeatureKey[]) {
      const free = aiFeatureAllowance(key, false)
      expect(free).not.toBeNull()
      expect(free as number).toBeLessThanOrEqual(5)
    }
  })

  it('treats a zero allowance as locked, not unlimited', () => {
    // The null/0 distinction is the one that would silently hand a paid
    // feature to every free user if it were ever confused.
    expect(aiFeatureAllowance('retrospective', false)).toBe(0)
    expect(aiFeatureAllowance('retrospective', true)).toBeNull()
  })
})

describe('AI_MEMORY_DEPTH', () => {
  it('never lets the free tier see more than premium', () => {
    expect(AI_MEMORY_DEPTH.free.journalDays).toBeLessThan(AI_MEMORY_DEPTH.premium.journalDays)
    expect(AI_MEMORY_DEPTH.free.savedItems).toBeLessThan(AI_MEMORY_DEPTH.premium.savedItems)
    expect(AI_MEMORY_DEPTH.free.goals).toBe(false)
    expect(AI_MEMORY_DEPTH.free.moodTrend).toBe(false)
  })
})

describe('dayKeyFor', () => {
  it('uses the user timezone, not the server, to decide what day it is', () => {
    // 03:00 UTC is still the previous evening in Honolulu. A quota that
    // reset on the UTC boundary would clear mid-evening for this user.
    const at = new Date('2026-09-02T03:00:00Z')
    expect(dayKeyFor('UTC', at)).toBe('2026-09-02')
    expect(dayKeyFor('Pacific/Honolulu', at)).toBe('2026-09-01')
  })

  it('falls back to UTC for a missing or bogus timezone', () => {
    const at = new Date('2026-09-02T12:00:00Z')
    expect(dayKeyFor(null, at)).toBe('2026-09-02')
    expect(dayKeyFor('Not/AZone', at)).toBe('2026-09-02')
  })
})

describe('consumeAiQuota', () => {
  it('does not touch the database for an unlimited tier', async () => {
    const v = await consumeAiQuota('u1', 'chat', true, 'UTC')
    expect(v.allowed).toBe(true)
    expect(v.limit).toBeNull()
    expect(upsert).not.toHaveBeenCalled()
  })

  it('refuses a locked feature without spending a write', async () => {
    const v = await consumeAiQuota('u1', 'retrospective', false, 'UTC')
    expect(v.allowed).toBe(false)
    expect(v.reason).toBe('locked')
    expect(upsert).not.toHaveBeenCalled()
  })

  it('allows the first call and reports what is left', async () => {
    upsert.mockResolvedValue({ count: 0 })
    update.mockResolvedValue({ count: 1 })
    const v = await consumeAiQuota('u1', 'chat', false, 'UTC')
    expect(v.allowed).toBe(true)
    expect(v.limit).toBe(AI_FEATURE_LIMITS.chat.free)
    expect(v.remaining).toBe((AI_FEATURE_LIMITS.chat.free as number) - 1)
  })

  it('refuses once the day is used up, and does not increment further', async () => {
    upsert.mockResolvedValue({ count: AI_FEATURE_LIMITS.chat.free as number })
    const v = await consumeAiQuota('u1', 'chat', false, 'UTC')
    expect(v.allowed).toBe(false)
    expect(v.reason).toBe('exhausted')
    expect(v.remaining).toBe(0)
    expect(update).not.toHaveBeenCalled()
  })
})

describe('peekAiQuota', () => {
  it('reports remaining without consuming anything', async () => {
    findUnique.mockResolvedValue({ count: 2 })
    const v = await peekAiQuota('u1', 'chat', false, 'UTC')
    expect(v.remaining).toBe((AI_FEATURE_LIMITS.chat.free as number) - 2)
    expect(update).not.toHaveBeenCalled()
    expect(upsert).not.toHaveBeenCalled()
  })

  it('treats no row yet as a full allowance', async () => {
    findUnique.mockResolvedValue(null)
    const v = await peekAiQuota('u1', 'chat', false, 'UTC')
    expect(v.remaining).toBe(AI_FEATURE_LIMITS.chat.free)
    expect(v.allowed).toBe(true)
  })
})

describe('crisis detection', () => {
  it('flags explicit ideation as urgent', () => {
    expect(detectCrisisLevel('i want to die')).toBe('urgent')
    expect(detectCrisisLevel("I've been thinking about suicide lately")).toBe('urgent')
    expect(detectCrisisLevel('i keep wanting to hurt myself')).toBe('urgent')
  })

  it('flags hopelessness as concern, not urgent', () => {
    expect(detectCrisisLevel('everything feels hopeless')).toBe('concern')
    expect(detectCrisisLevel("I can't go on like this")).toBe('concern')
  })

  it('leaves ordinary hard days alone', () => {
    expect(detectCrisisLevel('work was rough and I am tired')).toBeNull()
    expect(detectCrisisLevel('')).toBeNull()
  })

  it('always offers a reachable resource, even for an unmapped region', () => {
    const content = crisisResourceForLevel('urgent', detectRegion('Asia/Manila'))
    expect(content).not.toBeNull()
    expect(content!.resources.length).toBeGreaterThan(0)
    expect(content!.resources.some(r => r.href.startsWith('http'))).toBe(true)
  })

  it('maps timezones to their local helpline region', () => {
    expect(detectRegion('Europe/London')).toBe('UK')
    expect(detectRegion('America/New_York')).toBe('US')
    expect(detectRegion('Australia/Sydney')).toBe('AU')
    expect(detectRegion(null)).toBe('US')
  })
})

describe('crisis detection — self-harm intent', () => {
  it('catches intent to self-harm phrased without the word "plan"', () => {
    expect(detectCrisisLevel('i keep wanting to hurt myself')).toBe('urgent')
    expect(detectCrisisLevel('I want to harm myself')).toBe('urgent')
    expect(detectCrisisLevel('been thinking about hurting myself')).toBe('urgent')
  })

  it('does not fire on an ordinary physical injury', () => {
    expect(detectCrisisLevel('I hurt myself at the gym today')).toBeNull()
    expect(detectCrisisLevel('hurt my knee running')).toBeNull()
  })
})

describe('voice tone', () => {
  it('applies the delivery block the user actually chose', () => {
    const out = applyVoiceTone('BASE', 'direct')
    expect(out).toContain('BASE')
    expect(out).toContain('Direct')
    expect(out).not.toContain('Unhurried')
  })

  it('lands AFTER the mindset block so a hand-picked tone wins the conflict', () => {
    // The mindset modifier emits its own "TONE:" line. If delivery came
    // first, the philosophical tone would be the last word and the user's
    // explicit choice would lose.
    const withMindset = 'BASE\n\nTONE: aphoristic and severe'
    const out = applyVoiceTone(withMindset, 'calm')
    expect(out.indexOf('DELIVERY')).toBeGreaterThan(out.indexOf('TONE:'))
  })

  it('passes the prompt through untouched for a missing or unknown tone', () => {
    expect(applyVoiceTone('BASE', null)).toBe('BASE')
    expect(applyVoiceTone('BASE', 'shouty')).toBe('BASE')
  })

  it('has a voice id for every selectable tone', () => {
    for (const tone of GUIDE_TONES) {
      expect(TONE_VOICES[tone]).toBeTruthy()
    }
  })

  it('keeps the chat sub-budget below the global pool, or it reserves nothing', () => {
    expect(CHAT_CREDIT_LIMIT).toBeLessThan(MONTHLY_CREDIT_LIMIT)
  })
})
