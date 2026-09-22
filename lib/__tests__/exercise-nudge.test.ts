import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { NOTIFICATION_TEMPLATES } from '@/lib/push-service'
import { pickExercise } from '@/lib/exercises/select'
import { ERA_PRESETS } from '@/lib/era/presets'

/**
 * The exercise nudge.
 *
 * The behavioural rules live in a database-backed sender, so the parts that
 * can be checked without a database are checked here: that the type is wired
 * everywhere it has to be, that the copy it sends is derived from a real
 * exercise, and — read off the source — that the two rules protecting the
 * reader are actually in the code rather than only in the commit message.
 */

const SOURCE = readFileSync('lib/push-service.ts', 'utf8')
const SENDER = SOURCE.slice(SOURCE.indexOf('export async function sendExerciseNudges'))

describe('the exercise nudge is wired', () => {
  it('has a template, a destination and a fallback that says something true', () => {
    const template = NOTIFICATION_TEMPLATES.exercise_nudge
    expect(template).toBeTruthy()
    expect(template.title.length).toBeGreaterThan(5)
  })

  it('opens /training, where the exercise actually is', () => {
    // A nudge that lands on home and makes somebody hunt for the thing it
    // was about is worse than no nudge. The URL map is module-private, so
    // this reads it the same way notification-deeplinks.test.ts does.
    expect(SOURCE).toMatch(/exercise_nudge:\s*'\/training'/)
  })

  it('is opportunistic, so it can never starve a reminder the user set', () => {
    const gate = readFileSync('lib/notification-gate.ts', 'utf8')
    expect(gate).toMatch(/exercise_nudge:\s*'opportunistic'/)
  })

  it('rides the nudge preference, not a time somebody chose', () => {
    expect(SOURCE).toMatch(/exercise_nudge:\s*'motivational_nudge_alerts'/)
  })

  it('runs at 17:00 local — not stacked on the evening check-ins', () => {
    // era_checkin and practice_checkin both go at 20:00. Three asks in one
    // evening is how people turn notifications off.
    // The argument list has its own parens, so this cannot be [^)]*.
    expect(SENDER).toMatch(/filterUsersByLocalHour\([\s\S]*?,\s*17\)/)
  })
})

describe('the rules that protect the reader', () => {
  it('sends nothing to somebody who already did one today', () => {
    // Answered is answered. A reminder afterwards teaches people to ignore
    // the next one.
    expect(SENDER).toMatch(/history\.some\(r => r\.day === today\)/)
    expect(SENDER).toMatch(/alreadyDone\+\+/)
  })

  it('only ever fires inside an active era', () => {
    expect(SENDER).toMatch(/status: 'active'/)
    expect(SENDER).toMatch(/day < 1 \|\| day > era\.length_days/)
  })

  it('tells the picker what was done recently, so it does not repeat one', () => {
    expect(SENDER).toMatch(/recentIds: history\.map/)
  })
})

describe('what the notification actually says', () => {
  it('names a real exercise and its own length, for every era', () => {
    // The copy is built from the pick, so it can be checked without a
    // database: whatever the sender would name, it exists and has a length.
    for (const preset of ERA_PRESETS) {
      const pick = pickExercise({ eraKey: preset.key, day: 3, lengthDays: 30 })
      expect(pick, preset.key).toBeTruthy()
      const title = `${pick!.exercise.minutes} min: ${pick!.exercise.title}`
      expect(title, preset.key).toMatch(/^\d+ min: .+/)
      expect(pick!.exercise.why.length, preset.key).toBeGreaterThan(20)
    }
  })

  it('never promises a length the exercise does not claim', () => {
    const pick = pickExercise({ eraKey: 'locked_in', day: 1, lengthDays: 30 })!
    expect(pick.exercise.minutes).toBeGreaterThan(0)
    expect(pick.exercise.minutes).toBeLessThanOrEqual(15)
  })

  it('says nothing shaming, in the fallback or in any exercise line', () => {
    const shaming = /\b(lazy|excuse|failed|you didn’t|behind|slacking|no excuses)\b/i
    const fallback = NOTIFICATION_TEMPLATES.exercise_nudge
    expect(shaming.test(`${fallback.title} ${fallback.body}`)).toBe(false)
    for (const preset of ERA_PRESETS) {
      const pick = pickExercise({ eraKey: preset.key, day: 3, lengthDays: 30 })!
      expect(shaming.test(pick.exercise.why), preset.key).toBe(false)
    }
  })
})
