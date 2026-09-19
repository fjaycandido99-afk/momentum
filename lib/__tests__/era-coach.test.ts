import { describe, it, expect, vi } from 'vitest'

// coach.ts imports lib/groq for the live call; these tests only exercise the
// prompt builder, so keep the network client out of the module graph.
vi.mock('@/lib/groq', () => ({ getGroq: vi.fn() }))

import { buildPromiseReplyMessages, isCallbackDay, fallbackPromiseReply, formatEraChatBlock, type PromiseReplyInput } from '../era/coach'

const base: PromiseReplyInput = {
  eraTitle: 'Locked In',
  day: 9,
  lengthDays: 30,
  change: 'I waste my mornings on my phone',
  why: 'I want to prove I can be consistent',
  promise: "I'll finish the report before 11",
  stats: { made: 8, answered: 7, kept: 5, keptPercent: 71, promiseStreak: 8 },
  yesterday: 'kept',
  coachFocus: 'Focus: the one important thing they keep avoiding.',
  stageNote: 'Stage: building (week 2).',
  mission: 'Put your phone in another room for your first hour of work',
}

describe('isCallbackDay', () => {
  it('quotes day 1 back on day 1, every 7th day, the last day, and after a broken promise', () => {
    expect(isCallbackDay(1, 30, null)).toBe(true)
    expect(isCallbackDay(7, 30, 'kept')).toBe(true)
    expect(isCallbackDay(14, 30, 'kept')).toBe(true)
    expect(isCallbackDay(30, 30, 'kept')).toBe(true)
    expect(isCallbackDay(9, 30, 'broken')).toBe(true)
  })

  it('stays about today on ordinary days', () => {
    expect(isCallbackDay(9, 30, 'kept')).toBe(false)
    expect(isCallbackDay(2, 30, null)).toBe(false)
  })
})

describe('buildPromiseReplyMessages', () => {
  it('hands the model only real numbers from the DB', () => {
    const { user } = buildPromiseReplyMessages(base, 'stoic', 'calm')
    expect(user).toContain('Day 9 of 30.')
    expect(user).toContain('Promises kept so far: 5 of 7 answered.')
    expect(user).toContain(`"${base.change}"`)
    expect(user).toContain(`"${base.promise}"`)
  })

  it('says so plainly when nothing has been answered yet, rather than implying a record', () => {
    const { user } = buildPromiseReplyMessages(
      { ...base, day: 1, stats: { made: 0, answered: 0, kept: 0, keptPercent: null, promiseStreak: 0 }, yesterday: null },
      'stoic',
      null,
    )
    expect(user).toContain('No promises answered yet in this era.')
    expect(user).not.toMatch(/kept so far/)
  })

  it('tells the model to use day 1 only on callback days', () => {
    expect(buildPromiseReplyMessages({ ...base, day: 14 }, 'stoic', null).system).toMatch(/tie the promise back to what they told you on day 1/)
    expect(buildPromiseReplyMessages(base, 'stoic', null).system).toMatch(/Don't quote day 1 today/)
  })

  it('handles a broken yesterday without scolding', () => {
    const { system, user } = buildPromiseReplyMessages({ ...base, yesterday: 'broken' }, 'stoic', null)
    expect(system).toMatch(/Don't scold/)
    expect(user).toContain("did not keep yesterday's promise")
  })

  it('carries the mindset voice', () => {
    const { system } = buildPromiseReplyMessages(base, 'stoic', null)
    expect(system).toMatch(/Stoic/)
  })
})

describe('fallbackPromiseReply', () => {
  it('never claims anything it cannot know', () => {
    expect(fallbackPromiseReply(1)).toMatch(/^Day 1\./)
    expect(fallbackPromiseReply(12)).toMatch(/^Day 12\./)
    expect(fallbackPromiseReply(12)).not.toMatch(/\d+ of \d+|%/)
  })
})

describe('formatEraChatBlock', () => {
  const input = {
    eraTitle: 'Locked In',
    day: 9,
    lengthDays: 30,
    change: 'I waste my mornings',
    why: null,
    stats: { made: 8, answered: 7, kept: 5, keptPercent: 71, promiseStreak: 8 },
    todayPromise: { text: 'Finish the report', kept: null },
  }

  it('tells the chat the era, the day, the record and today', () => {
    const block = formatEraChatBlock(input)
    expect(block).toContain('"Locked In"')
    expect(block).toContain('Today is day 9.')
    expect(block).toContain('5 of 7 answered')
    expect(block).toContain('"Finish the report" — not checked in yet')
  })

  it('says when there is no promise yet, and leaves out a record that does not exist', () => {
    const block = formatEraChatBlock({
      ...input,
      stats: { made: 0, answered: 0, kept: 0, keptPercent: null, promiseStreak: 0 },
      todayPromise: null,
    })
    expect(block).toContain('not made a promise yet today')
    expect(block).not.toMatch(/Promises kept so far/)
  })

  it('tells the model not to bring it up every turn', () => {
    expect(formatEraChatBlock(input)).toMatch(/only when it is relevant/)
  })
})

describe('era program in the prompt', () => {
  it("carries the era's focus, the stage and today's mission", () => {
    const { system, user } = buildPromiseReplyMessages(base, 'stoic', null)
    expect(system).toContain(base.coachFocus)
    expect(system).toContain(base.stageNote)
    expect(user).toContain(`"${base.mission}"`)
  })

  it('leaves the mission out when there is none', () => {
    const { user } = buildPromiseReplyMessages({ ...base, mission: null }, 'stoic', null)
    expect(user).not.toMatch(/mission/)
  })
})
