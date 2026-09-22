import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import {
  ACHIEVEMENTS,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  CATEGORY_BADGE_IMAGES,
  checkNewAchievements,
  achievementMark,
  achievementProgress,
  type EraAchievementStats,
  type PracticeAchievementStats,
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

  it('every category has committed badge art', () => {
    for (const cat of Object.keys(CATEGORY_LABELS)) {
      const img = CATEGORY_BADGE_IMAGES[cat as keyof typeof CATEGORY_BADGE_IMAGES]
      expect(img, cat).toBeTruthy()
      expect(existsSync(`public${img}`), cat).toBe(true)
    }
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

describe('achievementMark', () => {
  const byId = (id: string) => ACHIEVEMENTS.find(a => a.id === id)!

  it('stamps the number that tells same-category badges apart', () => {
    expect(achievementMark(byId('streak_3'))).toBe('3')
    expect(achievementMark(byId('streak_365'))).toBe('365')
    expect(achievementMark(byId('xp_2000'))).toBe('2K')
    expect(achievementMark(byId('era_kept_7'))).toBe('7')
  })

  it('has no number for one-offs, so the badge stamps its glyph instead', () => {
    expect(achievementMark(byId('first_journal'))).toBeNull()
    expect(achievementMark(byId('era_first_promise'))).toBeNull()
  })

  it('gives every Consistency badge a different stamp', () => {
    const marks = ACHIEVEMENTS.filter(a => a.category === 'consistency' && a.condition.type === 'streak').map(achievementMark)
    expect(new Set(marks).size).toBe(marks.length)
  })
})

describe('achievementProgress', () => {
  const byId = (id: string) => ACHIEVEMENTS.find(a => a.id === id)!

  it('reports current/target, capped at the target', () => {
    expect(achievementProgress(byId('streak_7'), { ...baseStats, streak: 5 })).toEqual({ current: 5, target: 7 })
    expect(achievementProgress(byId('streak_7'), { ...baseStats, streak: 12 })).toEqual({ current: 7, target: 7 })
    expect(achievementProgress(byId('era_kept_7'), { ...baseStats, era: { ...noEra, promisesKept: 5 } })).toEqual({ current: 5, target: 7 })
  })

  it('never guesses: no progress for time-of-day ones or unloaded stats', () => {
    expect(achievementProgress(byId('night_owl'), baseStats)).toBeNull()
    expect(achievementProgress(byId('era_kept_7'), baseStats)).toBeNull()
  })
})

const noPractice: PracticeAchievementStats = {
  practicesKept: 0, minimumDays: 0, longestPracticeRun: 0, disciplinesKept: 0,
  practiceComebacks: 0, exercisesDone: 0, exerciseDays: 0, exerciseVariety: 0,
}

function practiceUnlocks(practice: Partial<PracticeAchievementStats>): string[] {
  return checkNewAchievements({ ...baseStats, practice: { ...noPractice, ...practice } }, new Set())
    .filter(a => a.id.startsWith('practice_') || a.id.startsWith('exercise_'))
    .map(a => a.id)
    .sort()
}

describe('practice and exercise achievements', () => {
  it('unlock from practice stats at the right thresholds', () => {
    expect(practiceUnlocks({ practicesKept: 1 })).toEqual(['practice_first_kept'])
    expect(practiceUnlocks({ practicesKept: 10 })).toEqual(['practice_first_kept', 'practice_kept_10'])
    expect(practiceUnlocks({ practiceComebacks: 1 })).toEqual(['practice_back_on'])
    expect(practiceUnlocks({ longestPracticeRun: 14 })).toEqual(['practice_run_14'])
    expect(practiceUnlocks({ disciplinesKept: 3 })).toEqual(['practice_three'])
  })

  it('rewards doing the minimum, because that is the whole point of a floor', () => {
    // "Just the minimum" is a KEPT day, not a half-failure — the one
    // behaviour the practices feature exists to produce, and for months it
    // was the only thing in the app that earned nothing.
    expect(practiceUnlocks({ minimumDays: 1 })).toContain('practice_floor')
  })

  it('unlock from exercise stats', () => {
    expect(practiceUnlocks({ exercisesDone: 1 })).toEqual(['exercise_first'])
    expect(practiceUnlocks({ exercisesDone: 10 })).toEqual(['exercise_10', 'exercise_first'])
    expect(practiceUnlocks({ exerciseVariety: 5 })).toEqual(['exercise_variety_5'])
    expect(practiceUnlocks({ exerciseDays: 30 })).toEqual(['exercise_days_30'])
  })

  it("can't unlock without practice stats", () => {
    const ids = checkNewAchievements({ ...baseStats }, new Set()).map(a => a.id)
    expect(ids.some(id => id.startsWith('practice_') || id.startsWith('exercise_'))).toBe(false)
  })

  it('reports progress with its denominator, never a bare number', () => {
    const a = ACHIEVEMENTS.find(x => x.id === 'practice_kept_10')!
    const progress = achievementProgress(a, { ...baseStats, practice: { ...noPractice, practicesKept: 4 } })
    expect(progress).toEqual({ current: 4, target: 10 })
  })

  it('never reports progress past the target', () => {
    const a = ACHIEVEMENTS.find(x => x.id === 'practice_kept_10')!
    const progress = achievementProgress(a, { ...baseStats, practice: { ...noPractice, practicesKept: 99 } })
    expect(progress).toEqual({ current: 10, target: 10 })
  })

  it('shows no progress at all when the stats were not loaded', () => {
    const a = ACHIEVEMENTS.find(x => x.id === 'practice_kept_10')!
    expect(achievementProgress(a, { ...baseStats })).toBeNull()
  })

  it('covers both of the features that used to earn nothing', () => {
    const ids = ACHIEVEMENTS.map(a => a.id)
    expect(ids.filter(id => id.startsWith('practice_')).length).toBeGreaterThanOrEqual(5)
    expect(ids.filter(id => id.startsWith('exercise_')).length).toBeGreaterThanOrEqual(3)
  })
})
