import { describe, it, expect } from 'vitest'
import { cleanSelection, resolveRelics, nextShown, MAX_EQUIPPED, type EarnedRelic } from '@/lib/relics'

const earned: EarnedRelic[] = [
  { id: 'streak_3', rarity: 'common', unlockedAt: '2026-09-01T00:00:00Z' },
  { id: 'era_complete', rarity: 'epic', unlockedAt: '2026-09-10T00:00:00Z' },
  { id: 'era_done_stoic_mode', rarity: 'epic', unlockedAt: '2026-09-20T00:00:00Z' },
  { id: 'proof_30', rarity: 'rare', unlockedAt: '2026-09-25T00:00:00Z' },
]
const ids = new Set(earned.map(e => e.id))

describe('relics', () => {
  it('only lets you wear what you have earned', () => {
    const got = cleanSelection({ featured: 'era_flawless', equipped: ['era_flawless', 'streak_3'] }, ids)
    expect(got).toEqual({ featured: null, equipped: ['streak_3'] })
  })

  it('caps the equipped at three, without repeats', () => {
    const got = cleanSelection({ featured: null, equipped: ['streak_3', 'streak_3', 'proof_30', 'era_complete', 'era_done_stoic_mode'] }, ids)
    expect(got.equipped).toEqual(['streak_3', 'proof_30', 'era_complete'])
    expect(got.equipped.length).toBeLessThanOrEqual(MAX_EQUIPPED)
  })

  it('always keeps the featured coin among the equipped', () => {
    const got = cleanSelection({ featured: 'proof_30', equipped: ['streak_3', 'era_complete', 'era_done_stoic_mode'] }, ids)
    expect(got.featured).toBe('proof_30')
    expect(got.equipped[0]).toBe('proof_30')
    expect(got.equipped.length).toBe(3)
  })

  it('wears the rarest, newest coin until they choose', () => {
    expect(resolveRelics({ featured: null, equipped: [] }, earned)).toEqual({
      featured: 'era_done_stoic_mode', equipped: ['era_done_stoic_mode'],
    })
  })

  it('wears nothing when nothing is earned', () => {
    expect(resolveRelics({ featured: null, equipped: [] }, [])).toEqual({ featured: null, equipped: [] })
  })

  it('turns to the next equipped coin once per open, starting from the featured', () => {
    const eq = ['a', 'b', 'c']
    expect(nextShown(eq, null, 'b')).toBe('b')
    expect(nextShown(eq, 'b', 'b')).toBe('c')
    expect(nextShown(eq, 'c', 'b')).toBe('a')
    expect(nextShown(eq, 'gone', 'a')).toBe('a')
    expect(nextShown([], 'a', 'a')).toBeNull()
  })
})

import { randomOther } from '@/lib/relics'

describe('shuffle all relics', () => {
  it('never shows the same coin twice in a row', () => {
    for (let i = 0; i < 50; i++) expect(randomOther(['a', 'b', 'c'], 'b')).not.toBe('b')
  })

  it('reaches every other coin', () => {
    expect(randomOther(['a', 'b', 'c'], 'b', () => 0)).toBe('a')
    expect(randomOther(['a', 'b', 'c'], 'b', () => 0.99)).toBe('c')
  })

  it('shows the only coin there is, and nothing with none', () => {
    expect(randomOther(['a'], 'a')).toBe('a')
    expect(randomOther([], null)).toBeNull()
  })
})
