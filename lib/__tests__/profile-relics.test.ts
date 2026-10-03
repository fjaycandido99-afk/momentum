import { describe, it, expect } from 'vitest'
import { collectionByCategory, recentRelics, type HeldStatus } from '@/lib/profile/relics'

const a = (id: string, category: HeldStatus['category'], unlockedAt: string | null): HeldStatus =>
  ({ id, category, unlocked: unlockedAt !== null, unlockedAt })

describe('profile relics', () => {
  const all = [
    a('first_era', 'era', '2026-09-01T10:00:00Z'),
    a('week', 'consistency', '2026-09-20T10:00:00Z'),
    a('month', 'consistency', null),
    a('explore', 'explorer', '2026-09-25T10:00:00Z'),
    a('secret_one', 'secret', '2026-09-28T10:00:00Z'),
    a('reader', 'growth', '2026-09-10T10:00:00Z'),
  ]

  it('shows the last three earned, newest first, never a locked one', () => {
    expect(recentRelics(all).map(x => x.id)).toEqual(['secret_one', 'explore', 'week'])
    expect(recentRelics([a('x', 'era', null)])).toEqual([])
  })

  it('counts earned of total per category in grid order, skipping empty categories', () => {
    const c = collectionByCategory(all)
    expect(c.map(x => x.category)).toEqual(['era', 'consistency', 'explorer', 'growth', 'secret'])
    expect(c.find(x => x.category === 'consistency')).toMatchObject({ earned: 1, total: 2, label: 'Consistency' })
  })
})
