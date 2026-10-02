import { describe, it, expect } from 'vitest'
import { ACHIEVEMENTS } from '@/lib/achievements'
import { chainFor, nearest, remainingLabel, SECRET_CLUES, seriesKey } from '@/lib/relic-paths'

describe('relic chains', () => {
  it('orders a chain by its number, lowest first', () => {
    const ids = chainFor('streak_30').map(a => a.id)
    expect(ids).toEqual(['streak_3', 'streak_7', 'streak_14', 'streak_30', 'streak_60', 'streak_100', 'streak_365'])
  })

  it('finds the same chain from any step', () => {
    expect(chainFor('era_kept_7').map(a => a.id)).toEqual(chainFor('era_kept_100').map(a => a.id))
  })

  it('a one-off stands alone', () => {
    expect(chainFor('midnight_owl').map(a => a.id)).toEqual(['midnight_owl'])
    expect(seriesKey({ type: 'era_finished', eraKey: 'gym_arc' })).toBeNull()
  })

  it('never shows the same step twice (duplicate goals collapse)', () => {
    // genre_explorer and genre_explorer_audio both ask for 5 genres.
    const chain = chainFor('genre_explorer_audio')
    const thresholds = chain.map(a => JSON.stringify(a.condition))
    expect(new Set(chain.map(a => (a.condition as { count: number }).count)).size).toBe(chain.length)
    expect(chain.some(a => a.id === 'genre_explorer_audio')).toBe(true)
    expect(thresholds.length).toBeGreaterThan(1)
  })

  it('leaves retired coins out unless the person holds one', () => {
    // path_7 and path_21 are retired: nobody new can earn them.
    expect(chainFor('path_21').map(a => a.id)).toEqual([])
    expect(chainFor('path_21', new Set(['path_7', 'path_21'])).map(a => a.id)).toEqual(['path_7', 'path_21'])
    // a live chain never picks up a retired coin
    expect(chainFor('streak_7').some(a => a.retired)).toBe(false)
  })

  it('every unknown id is an empty chain', () => {
    expect(chainFor('no_such_relic')).toEqual([])
  })
})

describe('nearest relics', () => {
  const items = [
    { id: 'a', unlocked: false, progress: { current: 9, target: 10 } },
    { id: 'b', unlocked: false, progress: { current: 1, target: 10 } },
    { id: 'c', unlocked: true, progress: { current: 10, target: 10 } },
    { id: 'd', unlocked: false, progress: null },
    { id: 'e', unlocked: false, progress: { current: 0, target: 5 } },
    { id: 'f', unlocked: false, progress: { current: 4, target: 5 } },
  ]

  it('lists the closest locked ones with real progress, nearest first', () => {
    expect(nearest(items).map(i => i.id)).toEqual(['a', 'f', 'b'])
  })

  it('never lists something without measurable progress', () => {
    expect(nearest(items, 10).map(i => i.id)).not.toContain('d')
    expect(nearest(items, 10).map(i => i.id)).not.toContain('e')
  })

  it('says what is left in the goal\'s own unit', () => {
    const streak = ACHIEVEMENTS.find(a => a.id === 'streak_7')!
    expect(remainingLabel(streak, { current: 5, target: 7 })).toBe('2 days away')
    const xp = ACHIEVEMENTS.find(a => a.id === 'xp_2000')!
    expect(remainingLabel(xp, { current: 1500, target: 2000 })).toBe('500 XP away')
  })
})

describe('secret relics', () => {
  it('every secret relic has a clue that never states the rule', () => {
    for (const a of ACHIEVEMENTS.filter(x => x.category === 'secret')) {
      const clue = SECRET_CLUES[a.id]
      expect(clue, a.id).toBeTruthy()
      expect(clue).not.toMatch(/\d{1,2}\s?(AM|PM)|midnight|7 days|all modules/i)
    }
  })
})
