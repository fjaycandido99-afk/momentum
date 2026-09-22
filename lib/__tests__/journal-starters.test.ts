import { describe, it, expect } from 'vitest'
import {
  GENERIC_STARTERS,
  chatStarters,
  dailyStarters,
  isConversational,
  splitAnsweredPrompt,
} from '@/lib/journal/starters'
import { MINDSET_DAILY_QUESTIONS } from '@/lib/mindset/daily-questions'
import type { MindsetId } from '@/lib/mindset/types'

const MINDSETS = Object.keys(MINDSET_DAILY_QUESTIONS) as MindsetId[]
const tuesday = new Date('2026-09-22T09:00:00')

describe('today’s starters', () => {
  it('offers four, for every mindset', () => {
    for (const id of MINDSETS) {
      expect(dailyStarters(id, tuesday), id).toHaveLength(4)
    }
  })

  it('leads with the mindset’s own questions, not the generic ones', () => {
    // The generic four sound like a journalling app; the mindset questions
    // sound like the era somebody chose.
    for (const id of MINDSETS) {
      const first = dailyStarters(id, tuesday)[0]
      expect(MINDSET_DAILY_QUESTIONS[id], id).toContain(first)
    }
  })

  it('never repeats a starter within a day', () => {
    for (const id of MINDSETS) {
      const got = dailyStarters(id, tuesday)
      expect(new Set(got).size, id).toBe(got.length)
    }
  })

  it('is stable across a day and moves with the date', () => {
    // A prompt that reshuffles while you are deciding whether to answer it
    // is a prompt nobody answers.
    const morning = dailyStarters('stoic', new Date('2026-09-22T07:00:00'))
    const evening = dailyStarters('stoic', new Date('2026-09-22T23:00:00'))
    expect(evening).toEqual(morning)

    const tomorrow = dailyStarters('stoic', new Date('2026-09-23T07:00:00'))
    expect(tomorrow).not.toEqual(morning)
  })

  it('still fills four when a mindset has no questions of its own', () => {
    const got = dailyStarters(undefined, tuesday)
    expect(got).toHaveLength(4)
  })
})

describe('which ones the coach can ask', () => {
  it('takes the questions and leaves the lists alone', () => {
    // "3 things I'm grateful for" is a list. A coach asking for one and then
    // responding to it is a form, not a conversation.
    expect(isConversational('Where did you take the easy way out?')).toBe(true)
    expect(isConversational('3 things I’m grateful for')).toBe(false)
    expect(isConversational('Today I noticed...')).toBe(false)
    expect(isConversational('A moment that mattered')).toBe(false)
  })

  it('hands the coach only questions, for every mindset', () => {
    for (const id of MINDSETS) {
      for (const q of chatStarters(id, null, tuesday)) {
        expect(q.trim().endsWith('?'), `${id}: ${q}`).toBe(true)
      }
    }
  })

  it('puts the era prompt first, because it is the most specific thing asked', () => {
    const eraPrompt = 'Day 2 of Locked In. Where did you hold your focus today?'
    const got = chatStarters('stoic', eraPrompt, tuesday)
    expect(got[0]).toBe(eraPrompt)
    expect(got.length).toBeGreaterThan(1)
  })

  it('offers the era prompt on its own when nothing else qualifies', () => {
    const eraPrompt = 'Day 9 of Gym Arc. What did showing up cost you today?'
    const got = chatStarters(undefined, eraPrompt, tuesday)
    expect(got[0]).toBe(eraPrompt)
  })

  it('returns nothing rather than something unanswerable', () => {
    // No era, and a mindset whose day happens to surface no questions: an
    // empty list hides the block instead of showing an empty one.
    const got = chatStarters('stoic', null, tuesday)
    for (const q of got) expect(isConversational(q)).toBe(true)
    expect(Array.isArray(got)).toBe(true)
  })

  it('keeps the generic four out of the coach’s mouth entirely', () => {
    for (const id of MINDSETS) {
      const asked = chatStarters(id, null, tuesday)
      for (const generic of GENERIC_STARTERS) {
        expect(asked, `${id}: ${generic}`).not.toContain(generic)
      }
    }
  })
})

describe('taking an answered prompt into the conversation', () => {
  const prompts = [
    'Are you working as hard as you tell people you are?',
    'What belief about yourself would you like to let go of?',
    'Day 3 of Locked In. Where did you hold your focus today, and where did it slip?',
    'Today I noticed...',
  ]

  it('splits the app’s question from the person’s answer', () => {
    // Straight from the screenshot: the prompt seeded the box, "No" is the
    // whole answer, and both halves matter.
    const got = splitAnsweredPrompt(
      'Are you working as hard as you tell people you are?\nNo',
      prompts,
    )
    expect(got.question).toBe('Are you working as hard as you tell people you are?')
    expect(got.answer).toBe('No')
  })

  it('handles the era prompt, which is the longest thing anyone is asked', () => {
    const got = splitAnsweredPrompt(
      'Day 3 of Locked In. Where did you hold your focus today, and where did it slip?\nHeld it all morning. Lost it after lunch.',
      prompts,
    )
    expect(got.question).toMatch(/^Day 3 of Locked In/)
    expect(got.answer).toBe('Held it all morning. Lost it after lunch.')
  })

  it('treats a question with nothing after it as an opener, not an answer', () => {
    // They tapped the prompt and wrote nothing. Sending that as their reply
    // would have them asking themselves a question.
    const got = splitAnsweredPrompt('Today I noticed...', prompts)
    expect(got.question).toBeNull()
    expect(got.answer).toBe('Today I noticed...')
  })

  it('leaves free writing alone', () => {
    const got = splitAnsweredPrompt('Had a strange day. Not sure why.', prompts)
    expect(got.question).toBeNull()
    expect(got.answer).toBe('Had a strange day. Not sure why.')
  })

  it('is not fooled by a prompt that is a prefix of a longer one', () => {
    const overlapping = ['Where did you hold your focus?', 'Where did you hold your focus? And then?']
    const got = splitAnsweredPrompt('Where did you hold your focus? And then? Nowhere', overlapping)
    expect(got.question).toBe('Where did you hold your focus? And then?')
    expect(got.answer).toBe('Nowhere')
  })

  it('matches however they capitalised it, and survives empty input', () => {
    expect(splitAnsweredPrompt('today i noticed... the quiet', prompts).answer).toBe('the quiet')
    expect(splitAnsweredPrompt('   ', prompts)).toEqual({ question: null, answer: '' })
    expect(splitAnsweredPrompt('anything', [])).toEqual({ question: null, answer: 'anything' })
  })
})
