import { describe, it, expect } from 'vitest'
import {
  isContentFree,
  hasPremiumAccess,
  canStartSession,
  hasFeatureAccess,
  FREE_TIER_LIMITS,
  FREEMIUM_LIMITS,
} from '../subscription-constants'

describe('isContentFree', () => {
  it('returns true for everything when premium', () => {
    expect(isContentFree('soundscape', 99, true)).toBe(true)
    expect(isContentFree('motivation', 99, true)).toBe(true)
    expect(isContentFree('music', 99, true)).toBe(true)
    expect(isContentFree('voiceGuide', 'anything', true)).toBe(true)
  })

  describe('soundscape', () => {
    it('free by index within limit', () => {
      expect(isContentFree('soundscape', 0, false)).toBe(true)
      expect(isContentFree('soundscape', 3, false)).toBe(true)
    })
    it('not free by index outside limit', () => {
      expect(isContentFree('soundscape', 4, false)).toBe(false)
    })
    it('free by id in freeIds', () => {
      expect(isContentFree('soundscape', 'focus', false)).toBe(true)
      expect(isContentFree('soundscape', 'relax', false)).toBe(true)
    })
    it('not free by id not in freeIds', () => {
      expect(isContentFree('soundscape', 'cosmic', false)).toBe(false)
    })
  })

  describe('voiceGuide', () => {
    it('breathing is free', () => {
      expect(isContentFree('voiceGuide', 'breathing', false)).toBe(true)
    })
    it('others are not free', () => {
      expect(isContentFree('voiceGuide', 'meditation', false)).toBe(false)
    })
  })

  describe('motivation', () => {
    it('first 2 are free', () => {
      expect(isContentFree('motivation', 0, false)).toBe(true)
      expect(isContentFree('motivation', 1, false)).toBe(true)
    })
    it('index 2+ are not free', () => {
      expect(isContentFree('motivation', 2, false)).toBe(false)
    })
  })

  describe('music', () => {
    it('first 2 are free', () => {
      expect(isContentFree('music', 0, false)).toBe(true)
      expect(isContentFree('music', 1, false)).toBe(true)
    })
    it('index 2+ are not free', () => {
      expect(isContentFree('music', 2, false)).toBe(false)
    })
  })
})

describe('hasPremiumAccess', () => {
  it('returns true for premium+active', () => {
    expect(hasPremiumAccess('premium', 'active')).toBe(true)
  })
  it('returns true for premium+trialing', () => {
    expect(hasPremiumAccess('premium', 'trialing')).toBe(true)
  })
  it('returns false for premium+canceled', () => {
    expect(hasPremiumAccess('premium', 'canceled')).toBe(false)
  })
  it('returns false for premium+expired', () => {
    expect(hasPremiumAccess('premium', 'expired')).toBe(false)
  })
  it('returns false for free+active', () => {
    expect(hasPremiumAccess('free', 'active')).toBe(false)
  })
})

describe('canStartSession', () => {
  it('premium users can always start', () => {
    expect(canStartSession('premium', 'active', 999)).toBe(true)
  })
  it('free users can start within limit', () => {
    expect(canStartSession('free', 'active', 0)).toBe(true)
  })
  it('free users cannot exceed limit', () => {
    expect(canStartSession('free', 'active', FREE_TIER_LIMITS.sessions_per_day)).toBe(false)
  })
})

describe('hasFeatureAccess', () => {
  it('premium users have access to all features', () => {
    expect(hasFeatureAccess('premium', 'active', 'ai_voice')).toBe(true)
    expect(hasFeatureAccess('premium', 'active', 'ai_coach')).toBe(true)
  })

  it('free users get basic features', () => {
    expect(hasFeatureAccess('free', 'active', 'unlimited_sessions')).toBe(true)
    expect(hasFeatureAccess('free', 'active', 'checkpoints')).toBe(true)
  })

  it('free users do not get AI features', () => {
    expect(hasFeatureAccess('free', 'active', 'ai_voice')).toBe(false)
    expect(hasFeatureAccess('free', 'active', 'ai_coach')).toBe(false)
    expect(hasFeatureAccess('free', 'active', 'ai_reflections')).toBe(false)
  })
})

describe('constants', () => {
  it('FREE_TIER_LIMITS has expected structure', () => {
    expect(FREE_TIER_LIMITS.sessions_per_day).toBeGreaterThan(0)
    expect(typeof FREE_TIER_LIMITS.ai_voice_enabled).toBe('boolean')
  })

  it('FREEMIUM_LIMITS has expected structure', () => {
    expect(FREEMIUM_LIMITS.soundscapes.freeCount).toBeGreaterThan(0)
    expect(FREEMIUM_LIMITS.soundscapes.freeIds.length).toBeGreaterThan(0)
    expect(FREEMIUM_LIMITS.musicPerGenre.freeCount).toBeGreaterThan(0)
  })
})
