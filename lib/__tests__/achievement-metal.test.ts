import { describe, it, expect } from 'vitest'
import { METAL } from '@/components/progress/AchievementBadge'

// Francis, 2026-09-30: "gold should be for the harder achievement". Gold on
// every badge meant nothing — the metal climbs with the difficulty.
describe('achievement metals', () => {
  it('steel, silver, then gold only for epic and legendary', () => {
    expect(METAL).toEqual({ common: 'steel', rare: 'silver', epic: 'gold', legendary: 'gold' })
  })
})
