import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import {
  ACHIEVEMENTS,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  CATEGORY_BADGE_IMAGES,
  checkNewAchievements,
  type EraAchievementStats,
} from '../achievements'
import { SERVER_ONLY_XP_EVENTS, XP_REWARDS } from '../gamification'

const baseStats = {
  streak: 0, totalXP: 0, level: 1, journalCount: 0, moodLogCount: 0, breathingCount: 0,
  moduleCount: 0, fullDayCount: 0, weekendActiveCount: 0, uniqueGenres: 0, uniqueModuleTypes: 0,
  hasFirstJournal: false, hasFirstSoundscape: false, hasFirstRoutine: false, hasCompletedGoal: false,
  hasFirstPathComplete: false, pathCompleteCount: 0, consecutivePathDays: 0, consecutiveVirtueDays: 0,
  currentHour: 12, consecutiveFullDays: 0,
}

const noEra: EraAchievementStats = {
  promisesMade: 0, promisesKept: 0, longestPromiseStreak: 0, erasStarted: 0,
  erasCompleted: 0, perfectEras: 0, customEras: 0, comebacks: 0,
}

function eraUnlocks(era: Partial<EraAchievementStats>): string[] {
  return checkNewAchievements({ ...baseStats, era: { ...noEra, ...era } }, new Set())
    .filter(a => a.category === 'era')
    .map(a => a.id)
    .sort()
}

describe('era achievements', () => {
  it('unlock from era stats at the right thresholds', () => {
    expect(eraUnlocks({ promisesMade: 1 })).toEqual(['era_first_promise'])
    expect(eraUnlocks({ promisesMade: 7, promisesKept: 7 })).toEqual(['era_first_kept', 'era_first_promise', 'era_kept_7'])
    expect(eraUnlocks({ longestPromiseStreak: 7 })).toEqual(['era_streak_7'])
    expect(eraUnlocks({ comebacks: 1 })).toEqual(['era_comeback'])
    expect(eraUnlocks({ customEras: 1 })).toEqual(['era_custom'])
    expect(eraUnlocks({ erasCompleted: 1 })).toEqual(['era_complete'])
    expect(eraUnlocks({ erasCompleted: 3, perfectEras: 1 })).toEqual(['era_complete', 'era_flawless', 'era_three'])
  })

  it("can't unlock without era stats — a caller that didn't load them unlocks nothing", () => {
    const ids = checkNewAchievements({ ...baseStats }, new Set()).map(a => a.id)
    expect(ids.some(id => id.startsWith('era_'))).toBe(false)
  })

  it('skips what is already unlocked', () => {
    const got = checkNewAchievements({ ...baseStats, era: { ...noEra, promisesMade: 1 } }, new Set(['era_first_promise']))
    expect(got.map(a => a.id)).not.toContain('era_first_promise')
  })
})

describe('achievement catalogue', () => {
  it('has unique ids and unique titles', () => {
    const ids = ACHIEVEMENTS.map(a => a.id)
    const titles = ACHIEVEMENTS.map(a => a.title)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(titles).size, `duplicate titles: ${titles.filter((t, i) => titles.indexOf(t) !== i)}`).toBe(titles.length)
  })

  it('every category used has a label and an icon, and Era leads the order', () => {
    for (const a of ACHIEVEMENTS) {
      expect(CATEGORY_LABELS[a.category], a.id).toBeTruthy()
      expect(CATEGORY_ICONS[a.category], a.id).toBeTruthy()
    }
    expect(Object.keys(CATEGORY_LABELS)[0]).toBe('era')
  })

  it('points only at badge images that are committed', () => {
    for (const [cat, img] of Object.entries(CATEGORY_BADGE_IMAGES)) {
      expect(img, cat).toMatch(/^\/achievements\/[a-z_]+\.(jpg|webp|png)$/)
      expect(existsSync(`public${img}`), `${cat}: public${img}`).toBe(true)
    }
  })
})

describe('era XP events', () => {
  it('exist and are server-only, so the client XP endpoint rejects them', () => {
    for (const e of ['eraStart', 'eraPromise', 'eraKept', 'eraComplete']) {
      expect(e in XP_REWARDS, e).toBe(true)
      expect(SERVER_ONLY_XP_EVENTS, e).toContain(e)
    }
  })
})
