import { describe, it, expect } from 'vitest'
import {
  BEHAVIOUR_GUIDANCE,
  behaviourLines,
  behaviourSection,
  type BehaviourFacts,
} from '@/lib/ai/behaviour-context'

const full: BehaviourFacts = {
  era: { title: 'Locked In', day: 12, lengthDays: 30 },
  promises: { kept: 9, answered: 11 },
  practices: [
    { label: 'Gym — Push / Pull / Legs', kept: 5, due: 6 },
    { label: 'Reading', kept: 2, due: 7 },
  ],
  exercises: { run: 8, days: 30 },
}

describe('what the coach is told you did', () => {
  it('says the era, the promises, each discipline and the exercises', () => {
    const lines = behaviourLines(full)
    expect(lines.join('\n')).toContain('Locked In, day 12 of 30')
    expect(lines.join('\n')).toContain('kept 9 of 11')
    expect(lines.join('\n')).toContain('Gym — Push / Pull / Legs: kept 5 of 6')
    expect(lines.join('\n')).toContain('Reading: kept 2 of 7')
    expect(lines.join('\n')).toContain('finished on 8 of the last 30 days')
  })

  it('never states a number without its denominator', () => {
    // The rule the whole app runs on. A bare number becomes a score, and a
    // score becomes a verdict on someone's character.
    for (const line of behaviourLines(full)) {
      const counts = line.match(/\b\d+\b/g) ?? []
      if (counts.length === 0) continue
      expect(line, line).toMatch(/\bof\b/)
    }
  })

  it('never emits a percentage or a rating', () => {
    const text = behaviourLines(full).join(' ')
    expect(text).not.toMatch(/%|score|rating|streak of|level|xp|\bout of 10\b/i)
  })

  it('carries no journal text, promise text or plan rows', () => {
    // Words are the journal section's business, under the same consent gate.
    // This block is the shape of a week, not its contents.
    const facts: BehaviourFacts = {
      ...full,
      practices: [{ label: 'Gym — Push / Pull / Legs', kept: 5, due: 6 }],
    }
    const text = behaviourLines(facts).join(' ')
    expect(text).not.toMatch(/felt|wrote|said|promised to|journal/i)
  })

  it('stays quiet on a brand-new account rather than saying "0 of 0"', () => {
    // Someone who started yesterday should not be handed a row of zeroes for
    // the coach to comment on.
    const fresh: BehaviourFacts = {
      era: null,
      promises: { kept: 0, answered: 0 },
      practices: [{ label: 'Reading', kept: 0, due: 0 }],
      exercises: { run: 0, days: 30 },
    }
    expect(behaviourLines(fresh)).toEqual([])
    expect(behaviourSection(fresh)).toBeNull()
  })

  it('does report a genuine run of misses, because that is information', () => {
    const missing: BehaviourFacts = {
      era: null,
      promises: { kept: 0, answered: 4 },
      practices: [{ label: 'Gym', kept: 0, due: 3 }],
      exercises: null,
    }
    const text = behaviourLines(missing).join('\n')
    expect(text).toContain('kept 0 of 4')
    expect(text).toContain('Gym: kept 0 of 3')
  })

  it('tells the model how to use it, and how not to', () => {
    expect(BEHAVIOUR_GUIDANCE).toMatch(/never the words they wrote/i)
    // The guidance is line-wrapped, so this phrase spans a newline.
    expect(BEHAVIOUR_GUIDANCE).toMatch(/do not\s+list it back/i)
    expect(BEHAVIOUR_GUIDANCE).toMatch(/never use it to scold|not a failing/i)
  })

  it('puts the guidance above the numbers', () => {
    // A prompt that opens with bare counts invites a report.
    const section = behaviourSection(full)!
    expect(section.indexOf('counts only')).toBeLessThan(section.indexOf('Locked In'))
  })

  it('handles an era with nothing else, and nothing with an era', () => {
    expect(behaviourLines({ era: full.era, promises: null, practices: [], exercises: null }))
      .toHaveLength(1)
    expect(behaviourLines({ era: null, promises: null, practices: [], exercises: null }))
      .toEqual([])
  })
})
