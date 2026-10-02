import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import {
  ACHIEVEMENTS,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  CATEGORY_BADGE_IMAGES,
  ACHIEVEMENT_BADGE_IMAGES,
  badgeImage,
  checkNewAchievements,
  achievementMark,
  achievementProgress,
  visibleAchievements,
  type EraAchievementStats,
  type PracticeAchievementStats,
  type RecordAchievementStats,
} from '../achievements'
import { SERVER_ONLY_XP_EVENTS, XP_REWARDS } from '../gamification'
import { ERA_PRESETS } from '../era/presets'

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
  carriedForward: 0, erasReflected: 0, eraReturns: 0, completedKeys: [],
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
    expect(eraUnlocks({ erasCompleted: 3, perfectEras: 1 })).toEqual(['era_complete', 'era_flawless', 'era_second', 'era_three'])
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
  booksFinished: 0,
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
    expect(practiceUnlocks({ longestPracticeRun: 14 })).toEqual(['practice_run_14', 'practice_run_7'])
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

describe('retired achievements', () => {
  const RETIRED = ACHIEVEMENTS.filter(a => a.retired).map(a => a.id)

  it('marks the ones whose feature no longer exists', () => {
    // Path and virtue stopped being written in February 2026; routines have
    // no UI that can create one. Nothing should count them any more.
    expect(RETIRED).toContain('path_first')
    expect(RETIRED).toContain('virtue_tracker')
    expect(RETIRED).toContain('first_routine')
  })

  it('hides them from anyone who has not earned them', () => {
    // Seven badges permanently stuck at zero in "Next up", counting against
    // a denominator nobody could ever close.
    const visible = visibleAchievements(new Set()).map(a => a.id)
    for (const id of RETIRED) expect(visible, id).not.toContain(id)
  })

  it('still shows one to the person who holds it', () => {
    // Six of these are held by a real account, earned while the feature was
    // live. Deleting the definition would have erased them.
    const visible = visibleAchievements(new Set(['path_21'])).map(a => a.id)
    expect(visible).toContain('path_21')
    expect(visible).not.toContain('path_7')
  })

  it('never awards one again, whatever the leftover data says', () => {
    // The columns still exist and 7 old rows still carry values. An unlock
    // now would be an accident of history, not an achievement.
    const stats = {
      ...baseStats,
      hasFirstRoutine: true,
      hasFirstPathComplete: true,
      pathCompleteCount: 99,
      consecutivePathDays: 99,
      consecutiveVirtueDays: 99,
    }
    const ids = checkNewAchievements(stats, new Set()).map(a => a.id)
    for (const id of RETIRED) expect(ids, id).not.toContain(id)
  })

  it('leaves every live achievement earnable', () => {
    // The point of retiring is to stop lying about what is reachable — not
    // to quietly shrink the list.
    const live = ACHIEVEMENTS.filter(a => !a.retired)
    expect(live.length).toBeGreaterThan(50)
    expect(visibleAchievements(new Set()).length).toBe(live.length)
  })
})

describe('what an era leaves behind', () => {
  it('names finishing, carrying forward, writing the line, and coming back', () => {
    expect(eraUnlocks({ erasCompleted: 2 })).toEqual(['era_complete', 'era_second'])
    expect(eraUnlocks({ carriedForward: 1 })).toEqual(['era_carried'])
    expect(eraUnlocks({ carriedForward: 3 })).toEqual(['era_carried', 'era_carried_3'])
    expect(eraUnlocks({ erasReflected: 1 })).toEqual(['era_reflection'])
    expect(eraUnlocks({ eraReturns: 1 })).toEqual(['era_return'])
  })

  it('goes further on the long counts', () => {
    expect(eraUnlocks({ promisesKept: 100 })).toEqual(
      ['era_first_kept', 'era_kept_100', 'era_kept_25', 'era_kept_50', 'era_kept_7'],
    )
    expect(eraUnlocks({ comebacks: 5 })).toEqual(['era_comeback', 'era_comeback_5'])
  })
})

describe('proof days and Right now', () => {
  const none: RecordAchievementStats = { proofDays: 0, resetsDone: 0, resetsHelped: 0 }
  const unlocks = (r: Partial<RecordAchievementStats>) =>
    checkNewAchievements({ ...baseStats, record: { ...none, ...r } }, new Set())
      .filter(a => a.condition.type === 'record')
      .map(a => a.id)
      .sort()

  it('counts days with something kept, Proof’s own unit', () => {
    expect(unlocks({ proofDays: 30 })).toEqual(['proof_30', 'proof_7'])
  })

  it('rewards finishing a session, and their own rating when it helped', () => {
    expect(unlocks({ resetsDone: 1 })).toEqual(['reset_first'])
    expect(unlocks({ resetsDone: 10, resetsHelped: 1 })).toEqual(['reset_10', 'reset_first', 'reset_helped'])
  })

  it('awards nothing when the record stats were not loaded', () => {
    expect(checkNewAchievements({ ...baseStats }, new Set()).some(a => a.condition.type === 'record')).toBe(false)
  })

  it('reports progress with its denominator', () => {
    const a = ACHIEVEMENTS.find(x => x.id === 'proof_100')!
    expect(achievementProgress(a, { ...baseStats, record: { ...none, proofDays: 42 } })).toEqual({ current: 42, target: 100 })
    expect(achievementProgress(a, { ...baseStats })).toBeNull()
  })
})

describe('per-badge art', () => {
  it('points only at committed files, for real achievements', () => {
    for (const [id, src] of Object.entries(ACHIEVEMENT_BADGE_IMAGES)) {
      expect(ACHIEVEMENTS.some(a => a.id === id), id).toBe(true)
      expect(existsSync(`public${src}`), String(src)).toBe(true)
    }
  })

  it('falls back to the category art', () => {
    expect(badgeImage('no_such_badge', 'era')).toBe(CATEGORY_BADGE_IMAGES.era)
    expect(badgeImage(undefined, 'growth')).toBe(CATEGORY_BADGE_IMAGES.growth)
  })
})

describe('a coin for every era', () => {
  it('awards the coin for the era that was finished, and only that one', () => {
    expect(eraUnlocks({ erasCompleted: 1, completedKeys: ['gym_arc'] })).toEqual(['era_complete', 'era_done_gym_arc'])
    expect(eraUnlocks({ erasCompleted: 1, completedKeys: ['stoic_mode'] })).toContain('era_done_stoic_mode')
    expect(eraUnlocks({ erasCompleted: 1, completedKeys: ['stoic_mode'] })).not.toContain('era_done_gym_arc')
  })

  it('has a coin for every era there is, with its own art', () => {
    const keys = [...ERA_PRESETS.map(p => p.key), 'custom']
    for (const key of keys) {
      const a = ACHIEVEMENTS.find(x => x.id === `era_done_${key}`)
      expect(a, key).toBeDefined()
      expect(ACHIEVEMENT_BADGE_IMAGES[`era_done_${key}`], key).toBeDefined()
    }
  })

  it('is gold: finishing an era is hard', () => {
    for (const a of ACHIEVEMENTS.filter(x => x.id.startsWith('era_done_'))) expect(a.rarity).toBe('epic')
  })
})

import { ACHIEVEMENT_LINES } from '../achievement-lines'

describe('the line on every coin', () => {
  it('every achievement has one, and no line is orphaned', () => {
    for (const a of ACHIEVEMENTS) expect(ACHIEVEMENT_LINES[a.id], a.id).toBeTruthy()
    for (const id of Object.keys(ACHIEVEMENT_LINES)) expect(ACHIEVEMENTS.some(a => a.id === id), id).toBe(true)
  })

  it('is short and in Voxu’s voice: no exclamation marks, no hype', () => {
    for (const [id, line] of Object.entries(ACHIEVEMENT_LINES)) {
      expect(line.length, id).toBeLessThanOrEqual(60)
      expect(line, id).not.toMatch(/!|amazing|awesome|crushed|legend|beast|incredible/i)
    }
  })

  it('never repeats another coin’s line', () => {
    const lines = Object.values(ACHIEVEMENT_LINES)
    expect(new Set(lines).size).toBe(lines.length)
  })
})
