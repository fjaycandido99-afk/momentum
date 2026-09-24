import { describe, expect, it } from 'vitest'
import {
  DRAFT_SYSTEM_PROMPT,
  buildDraftPrompt,
  draftSummary,
  toDraft,
  type DraftRequest,
} from '@/lib/routines/ai-draft'
import { MAX_ROUTINE_STEPS, ROUTINE_LIMITS, validateSteps } from '@/lib/routines/steps'

const gym = { id: 'p-gym', label: 'Push Pull Legs' }

const input = (over: Partial<DraftRequest> = {}): DraftRequest => ({
  description: 'Up at six, gym after work, read before bed',
  practices: [gym],
  ...over,
})

const ok = (response: Parameters<typeof toDraft>[0], req = input()) => {
  const result = toDraft(response, req)
  if ('problem' in result) throw new Error(`refused: ${result.problem}`)
  return result.draft
}

describe('the prompt', () => {
  it('lists their disciplines with the ids the model must use', () => {
    const prompt = buildDraftPrompt(input())
    expect(prompt).toContain('Push Pull Legs — id: p-gym')
    expect(prompt).toContain('Up at six, gym after work')
  })

  it('forbids discipline steps outright when they have none', () => {
    expect(buildDraftPrompt(input({ practices: [] }))).toContain('Do not use kind "practice" at all')
  })

  it('lets the era name the routine and nothing else', () => {
    const prompt = buildDraftPrompt(input({ eraTitle: 'Gym Arc' }))
    expect(prompt).toContain('You may name the routine after it')
  })

  it('caps how much of a description it will carry', () => {
    const prompt = buildDraftPrompt(input({ description: 'x'.repeat(5000) }))
    expect(prompt.length).toBeLessThan(2000)
  })

  it('tells the model not to invent numbers or steps', () => {
    expect(DRAFT_SYSTEM_PROMPT).toMatch(/never write a number they did not say/i)
    expect(DRAFT_SYSTEM_PROMPT).toMatch(/never add a step they did not mention/i)
    expect(DRAFT_SYSTEM_PROMPT).toMatch(/do not invent a time/i)
  })
})

describe('what it accepts', () => {
  it('a normal timed day', () => {
    const draft = ok({
      label: 'Training day',
      mode: 'timed',
      days: [1, 4],
      steps: [
        { kind: 'promise', time: '06:00' },
        { kind: 'practice', ref: 'p-gym', time: '18:00' },
        { kind: 'own', label: 'Read before bed', time: '21:30' },
      ],
    })

    expect(draft.label).toBe('Training day')
    expect(draft.mode).toBe('timed')
    expect(draft.days).toEqual([1, 4])
    expect(draft.steps.map(s => s.kind)).toEqual(['promise', 'practice', 'own'])
    expect(draft.steps[1].ref).toBe('p-gym')
    // And it would have passed the editor's own check.
    expect(validateSteps(draft.steps, draft.mode)).toBeNull()
  })

  it('a sequence day, with the times dropped and a start kept', () => {
    const draft = ok({
      mode: 'sequence',
      startTime: '07:00',
      steps: [
        { kind: 'promise', time: '07:00' },
        { kind: 'journal', time: '07:10' },
      ],
    })
    expect(draft.startTime).toBe('07:00')
    expect(draft.steps.every(s => s.time === null)).toBe(true)
  })

  it('sorts the day the way the builder would', () => {
    const draft = ok({
      mode: 'timed',
      steps: [
        { kind: 'journal', time: '21:30' },
        { kind: 'promise', time: '06:00' },
      ],
    })
    expect(draft.steps.map(s => s.time)).toEqual(['06:00', '21:30'])
  })

  it('reads the weights, and puts a bad-days step in the minimum', () => {
    const draft = ok({
      mode: 'timed',
      steps: [
        { kind: 'promise', time: '07:00', weight: 'required' },
        { kind: 'reset', time: '22:00', weight: 'minimum_only' },
      ],
    })
    expect(draft.steps[1].weight).toBe('minimum_only')
    expect(draft.steps[1].inMinimum).toBe(true)
  })
})

describe('what it refuses to believe', () => {
  it('a discipline that is not theirs', () => {
    // An invented id, or a label where an id belongs. Either way the step
    // points at nothing and could not be saved.
    const draft = ok({
      mode: 'timed',
      steps: [
        { kind: 'practice', ref: 'p-somebody-else', time: '18:00' },
        { kind: 'practice', ref: 'Push Pull Legs', time: '18:30' },
        { kind: 'promise', time: '07:00' },
      ],
    })
    expect(draft.steps).toHaveLength(1)
    expect(draft.steps[0].kind).toBe('promise')
  })

  it('a discipline step at all when they have none', () => {
    const result = toDraft(
      { mode: 'timed', steps: [{ kind: 'practice', ref: 'p-gym', time: '18:00' }] },
      input({ practices: [] }),
    )
    expect(result).toEqual({ problem: 'NO_STEPS' })
  })

  it('a kind that does not exist', () => {
    const draft = ok({
      mode: 'timed',
      steps: [
        { kind: 'meditation', time: '07:00' },
        { kind: 'cold_plunge', time: '07:15' },
        { kind: 'promise', time: '07:30' },
      ],
    })
    expect(draft.steps).toHaveLength(1)
  })

  it('an invented time', () => {
    // The model is told to leave a step out rather than guess when it
    // happens. If it guesses anyway, the step goes.
    const draft = ok({
      mode: 'timed',
      steps: [
        { kind: 'promise', time: 'morning' },
        { kind: 'audio', time: '7am' },
        { kind: 'exercise', time: '25:00' },
        { kind: 'journal', time: '21:30' },
      ],
    })
    expect(draft.steps).toHaveLength(1)
    expect(draft.steps[0].time).toBe('21:30')
  })

  it('words on one of the app’s own moments', () => {
    // Letting a model rename "Today's promise" makes the app
    // unrecognisable to the person using it.
    const draft = ok({
      mode: 'timed',
      steps: [{ kind: 'promise', label: 'Manifest abundance', time: '07:00' }],
    })
    expect(draft.steps[0].label).toBe('')
  })

  it('a step of their own with no words', () => {
    const result = toDraft({ mode: 'timed', steps: [{ kind: 'own', time: '07:00' }] }, input())
    expect(result).toEqual({ problem: 'NO_STEPS' })
  })

  it('a floor it made up', () => {
    const draft = ok({
      mode: 'timed',
      steps: [{ kind: 'own', label: 'Read', minimum: '5 pages', time: '21:30' }],
    })
    // "5 pages" is a number about their life that they did not say.
    expect(draft.steps[0].minimum).toBe('')
  })

  it('more steps than a routine holds', () => {
    const draft = ok({
      mode: 'timed',
      steps: Array.from({ length: 20 }, (_, i) => ({
        kind: 'own',
        label: `Step ${i + 1}`,
        time: `${String(i % 24).padStart(2, '0')}:00`,
      })),
    })
    expect(draft.steps.length).toBeLessThanOrEqual(MAX_ROUTINE_STEPS)
  })

  it('nothing usable at all', () => {
    expect(toDraft({}, input())).toEqual({ problem: 'NO_STEPS' })
    expect(toDraft({ steps: 'a routine' }, input())).toEqual({ problem: 'NO_STEPS' })
    expect(toDraft({ steps: [null, 7, 'promise'] }, input())).toEqual({ problem: 'NO_STEPS' })
  })

  it('junk days, junk mode, junk start time', () => {
    const draft = ok({
      mode: 'freeform',
      days: [1, 9, -2, 'Monday', 3],
      startTime: 'sunrise',
      steps: [{ kind: 'promise', time: '07:00' }],
    })
    expect(draft.mode).toBe('timed')
    expect(draft.days).toEqual([1, 3])
    // Null in timed mode regardless: a timed routine's steps carry their own
    // times, so a start time would be a second, contradictory answer.
    expect(draft.startTime).toBeNull()
  })

  it('a label longer than a routine name', () => {
    const draft = ok({ mode: 'timed', label: 'x'.repeat(300), steps: [{ kind: 'promise', time: '07:00' }] })
    expect(draft.label.length).toBeLessThanOrEqual(ROUTINE_LIMITS.label)
  })

  it('and names it itself when the model gave no name', () => {
    expect(ok({ mode: 'timed', steps: [{ kind: 'promise', time: '07:00' }] }).label).toBe('My routine')
    expect(
      ok(
        { mode: 'timed', steps: [{ kind: 'promise', time: '07:00' }] },
        input({ eraTitle: 'Gym Arc' }),
      ).label,
    ).toBe('Gym Arc day')
  })
})

describe('the line above the draft', () => {
  it('says what it made, in counts, and invites a change', () => {
    const draft = ok({
      mode: 'timed',
      steps: [
        { kind: 'promise', time: '07:00' },
        { kind: 'practice', ref: 'p-gym', time: '18:00' },
        { kind: 'own', label: 'Read', time: '21:30' },
        { kind: 'journal', time: '22:00' },
      ],
    })
    const line = draftSummary(draft)
    expect(line).toContain('4 steps from what you said')
    expect(line).toContain('and 1 more')
    expect(line).toContain('Change anything')
    // Never a claim about quality.
    expect(line).not.toMatch(/perfect|optimi[sz]ed|ideal|best/i)
  })
})
