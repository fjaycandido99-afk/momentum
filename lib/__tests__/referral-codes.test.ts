import { describe, expect, it } from 'vitest'
import { codeFromLabel, conversionOf, normalizeCode, referralUrl, CODE_MAX } from '../referral/codes'

describe('normalizeCode', () => {
  it('accepts what survives being typed off a video', () => {
    expect(normalizeCode('gymtok')).toBe('gymtok')
    expect(normalizeCode('  GymTok  ')).toBe('gymtok')
    expect(normalizeCode('creator-42')).toBe('creator-42')
  })

  it('refuses anything that would break or mislead in a URL', () => {
    expect(normalizeCode('a')).toBeNull() // too short to be memorable
    expect(normalizeCode('x'.repeat(CODE_MAX + 1))).toBeNull()
    expect(normalizeCode('has space')).toBeNull()
    expect(normalizeCode('-leading')).toBeNull()
    expect(normalizeCode('trailing-')).toBeNull()
    expect(normalizeCode('under_score')).toBeNull()
    expect(normalizeCode('emoji🔥')).toBeNull()
    expect(normalizeCode('')).toBeNull()
    expect(normalizeCode(42)).toBeNull()
  })

  it('refuses codes that would collide with real paths', () => {
    for (const reserved of ['api', 'admin', 'login', 'signup', 'era', 'join']) {
      expect(normalizeCode(reserved)).toBeNull()
    }
  })
})

describe('codeFromLabel', () => {
  it('suggests something shareable', () => {
    expect(codeFromLabel('TikTok bio')).toBe('tiktok-bio')
    expect(codeFromLabel('Marco — gym creator')).toBe('marco-gym-creator')
    expect(codeFromLabel('!!!')).toBeNull()
  })
})

describe('referralUrl', () => {
  it('is the link that gets sent', () => {
    expect(referralUrl('gymtok')).toBe('https://voxu.app/i/gymtok')
  })
})

describe('conversionOf', () => {
  it('has no rate without clicks to divide by', () => {
    expect(conversionOf(0, 0)).toBeNull()
    expect(conversionOf(3, 0)).toBeNull()
    expect(conversionOf(3, 12)).toBe(25)
    expect(conversionOf(1, 3)).toBe(33.3)
  })
})
