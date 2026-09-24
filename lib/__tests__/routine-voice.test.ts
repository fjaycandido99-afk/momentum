import { describe, expect, it } from 'vitest'
import {
  CUE_LIMIT,
  VOICE_SYSTEM_PROMPT,
  buildVoicePrompt,
  hasFallbackForEveryKind,
  toCues,
  validateCue,
  type VoiceStep,
} from '@/lib/routines/voice'

const step = (over: Partial<VoiceStep> = {}): VoiceStep => ({
  kind: 'journal',
  title: 'Journal',
  time: '21:30',
  ...over,
})

describe('the prompt', () => {
  it('lists the steps in order, with their times', () => {
    const prompt = buildVoicePrompt([
      step({ kind: 'promise', title: 'Today’s promise', time: '07:00' }),
      step({ kind: 'own', title: 'Cold shower', time: '07:15' }),
    ])
    expect(prompt).toContain('1. Today’s promise at 07:00')
    expect(prompt).toContain('2. Cold shower at 07:15')
    expect(prompt).toContain('Return 2 cues')
  })

  it('leaves the time out when there is none', () => {
    expect(buildVoicePrompt([step({ time: null })])).toContain('1. Journal (Journal)')
  })

  it('forbids the things a lock screen must not say', () => {
    expect(VOICE_SYSTEM_PROMPT).toMatch(/no advice, no\s+facts, no numbers/i)
    expect(VOICE_SYSTEM_PROMPT).toMatch(/never scolds/i)
    expect(VOICE_SYSTEM_PROMPT).toMatch(/at most 90 characters/i)
  })
})

describe('which cues are allowed through', () => {
  it('a plain nudge', () => {
    expect(validateCue('The day is done. Put one honest line down.', step())).toBeNull()
  })

  it('nothing empty', () => {
    expect(validateCue('', step())).toBe('EMPTY')
    expect(validateCue('   ', step())).toBe('EMPTY')
    expect(validateCue(null, step())).toBe('EMPTY')
    expect(validateCue(42, step())).toBe('EMPTY')
  })

  it('nothing that would be cut off', () => {
    expect(validateCue('x'.repeat(CUE_LIMIT + 1), step())).toBe('TOO_LONG')
    expect(validateCue('x'.repeat(CUE_LIMIT), step())).toBeNull()
  })

  it('no number about their life that they did not give', () => {
    expect(validateCue('Ten minutes is enough.', step())).toBeNull()
    expect(validateCue('Just 10 minutes and you are done.', step())).toBe('BANNED')
    expect(validateCue('Three sets, no more.', step())).toBeNull()
    expect(validateCue('3 sets today.', step())).toBe('BANNED')
    expect(validateCue('Read 20 pages.', step())).toBe('BANNED')
  })

  it('no promise about how they will feel', () => {
    expect(validateCue('You will feel better afterwards.', step())).toBe('BANNED')
    expect(validateCue('You’ll sleep better for it.', step())).toBe('BANNED')
    expect(validateCue('Studies show this works.', step())).toBe('BANNED')
  })

  it('no scolding, and no assuming they missed it', () => {
    expect(validateCue('You missed this yesterday.', step())).toBe('BANNED')
    expect(validateCue('Again. Get it done.', step())).toBe('BANNED')
    expect(validateCue('Still not done?', step())).toBe('BANNED')
  })

  it('no streaks or scores, which the rest of the app refuses', () => {
    expect(validateCue('Keep your streak alive.', step())).toBe('BANNED')
    expect(validateCue('You are behind for the week.', step())).toBe('BANNED')
  })

  it('and not just the step’s name read back', () => {
    // The notification title already says it.
    expect(validateCue('Journal', step())).toBe('ECHOES_TITLE')
    expect(validateCue('journal.', step())).toBe('ECHOES_TITLE')
    expect(validateCue('Journal, one line.', step())).toBeNull()
  })
})

describe('keeping the good ones', () => {
  const steps = [
    step({ kind: 'promise', title: 'Today’s promise', time: '07:00' }),
    step({ kind: 'own', title: 'Cold shower', time: '07:15' }),
    step({ kind: 'journal', title: 'Journal', time: '21:30' }),
  ]

  it('maps each cue to its own step', () => {
    const kept = toCues(
      { cues: ['Name the one thing.', 'In you go.', 'One line, then sleep.'] },
      steps,
    )
    expect(kept).toEqual([
      { index: 0, cue: 'Name the one thing.' },
      { index: 1, cue: 'In you go.' },
      { index: 2, cue: 'One line, then sleep.' },
    ])
  })

  it('drops one bad line without losing the others', () => {
    // One refused cue costs one line: that step keeps the kind's own, and
    // every other step still gets its voice. All-or-nothing here would
    // throw away seven good lines because of one.
    const kept = toCues(
      { cues: ['Name the one thing.', 'You will feel amazing, 10 minutes!', 'One line, then sleep.'] },
      steps,
    )
    expect(kept.map(k => k.index)).toEqual([0, 2])
  })

  it('survives a response of the wrong shape entirely', () => {
    expect(toCues({}, steps)).toEqual([])
    expect(toCues({ cues: 'nope' }, steps)).toEqual([])
    expect(toCues({ cues: [null, undefined, 7] }, steps)).toEqual([])
  })

  it('ignores extra cues for steps that do not exist', () => {
    const kept = toCues({ cues: ['One.', 'Two.', 'Three.', 'Four.', 'Five.'] }, steps)
    expect(kept).toHaveLength(3)
  })
})

describe('what makes failure safe', () => {
  it('every kind that can be voiced already has a line of its own', () => {
    // A refused cue leaves the step's `cue` null, which means the kind's
    // fallback — so silence from the model is invisible, not broken.
    expect(hasFallbackForEveryKind()).toBe(true)
  })
})
