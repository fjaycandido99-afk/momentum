import { describe, it, expect } from 'vitest'
import {
  TECHNIQUE_ERRORS,
  calloutLines,
  pairLines,
  parseCalloutLines,
  parsePairLines,
  toTechnique,
  validateTechnique,
  type TechniqueDraft,
} from '@/lib/movements/technique'
import {
  DRAFT_SYSTEM_PROMPT,
  draftUserPrompt,
  parseDraft,
} from '@/lib/movements/technique-draft'

const ok: TechniqueDraft = {
  movementId: 'back_squat',
  reviewedBy: 'Sam Okafor, CSCS',
  reviewedOn: '2026-09-21',
  steps: ['Set the bar on your shoulders, not your neck.', 'Stand up out of the rack.'],
  cues: [{ label: 'Chest proud', detail: 'Ribs down, eyes forward.' }],
  mistakes: [{ label: 'Knees falling in' }],
  callouts: [{ label: 'Chest proud', x: 30, y: 25, side: 'left' }],
}

describe('accepting reviewed technique', () => {
  it('accepts a draft with a person, a date and steps', () => {
    expect(validateTechnique(ok)).toBeNull()
  })

  it('refuses a movement that is not in the library', () => {
    expect(validateTechnique({ ...ok, movementId: 'nope' })).toBe('unknown_movement')
  })

  it('demands a name, and demands that it be a person', () => {
    // The screen prints this name. A reader deciding whether to trust a cue
    // is entitled to know whose cue it is — and "Voxu" is not an answer,
    // because the whole point is that the app didn't write it.
    expect(validateTechnique({ ...ok, reviewedBy: '   ' })).toBe('reviewer_required')
    expect(validateTechnique({ ...ok, reviewedBy: 'Voxu' })).toBe('reviewer_not_a_person')
    expect(validateTechnique({ ...ok, reviewedBy: 'the team' })).toBe('reviewer_not_a_person')
    expect(validateTechnique({ ...ok, reviewedBy: 'ChatGPT' })).toBe('reviewer_not_a_person')
    expect(validateTechnique({ ...ok, reviewedBy: 'Claude' })).toBe('reviewer_not_a_person')
    expect(validateTechnique({ ...ok, reviewedBy: 'A' })).toBe('reviewer_not_a_person')
  })

  it('demands a date, because guidance ages', () => {
    expect(validateTechnique({ ...ok, reviewedOn: '' })).toBe('date_required')
    expect(validateTechnique({ ...ok, reviewedOn: 'last week' })).toBe('date_required')
    expect(validateTechnique({ ...ok, reviewedOn: '21/09/2026' })).toBe('date_required')
  })

  it('needs at least one step and not more than a screenful', () => {
    expect(validateTechnique({ ...ok, steps: [] })).toBe('steps_required')
    expect(validateTechnique({ ...ok, steps: ['   ', ''] })).toBe('steps_required')
    expect(validateTechnique({ ...ok, steps: Array(9).fill('Stand up.') })).toBe('too_many_steps')
    expect(validateTechnique({ ...ok, steps: ['x'.repeat(201)] })).toBe('step_too_long')
  })

  it('refuses a dose, wherever it is hidden', () => {
    // A reviewer can say how to move. How much is between the person and
    // their own coach — nobody in this system has examined them.
    const doses = [
      'Do 3 x 8 with control.',
      'Work up to 20kg.',
      'Hold for 30 seconds.',
      'Two sets of 5.',
      'Leave 2 RIR in the tank.',
      'Use 80% of your 1RM.',
      'Rest 90 secs between efforts.',
    ]
    for (const step of doses) {
      expect(validateTechnique({ ...ok, steps: [step] }), step).toBe('dose_not_allowed')
    }
  })

  it('catches a dose in a cue, a mistake or a callout too', () => {
    expect(validateTechnique({ ...ok, cues: [{ label: 'Pause 2 seconds' }] })).toBe('dose_not_allowed')
    expect(validateTechnique({ ...ok, mistakes: [{ label: 'Going too heavy', detail: 'Over 100kg early.' }] }))
      .toBe('dose_not_allowed')
    expect(validateTechnique({ ...ok, callouts: [{ label: '5 reps', x: 10, y: 10, side: 'left' }] }))
      .toBe('dose_not_allowed')
  })

  it('refuses claims about evidence and anything medical', () => {
    expect(validateTechnique({ ...ok, steps: ['Studies show this is safest.'] }))
      .toBe('evidence_claim_not_allowed')
    expect(validateTechnique({ ...ok, steps: ['This is clinically proven.'] }))
      .toBe('evidence_claim_not_allowed')
    expect(validateTechnique({ ...ok, steps: ['This treats back pain.'] }))
      .toBe('medical_claim_not_allowed')
    expect(validateTechnique({ ...ok, cues: [{ label: 'Cures tight hips' }] }))
      .toBe('medical_claim_not_allowed')
  })

  it('keeps callouts on the picture', () => {
    expect(validateTechnique({ ...ok, callouts: [{ label: 'x', x: 120, y: 10, side: 'left' }] }))
      .toBe('callout_off_image')
    expect(validateTechnique({ ...ok, callouts: [{ label: 'x', x: 10, y: -1, side: 'left' }] }))
      .toBe('callout_off_image')
  })

  it('caps how much can be shown', () => {
    expect(validateTechnique({ ...ok, cues: Array(5).fill({ label: 'Up' }) })).toBe('too_many')
    expect(validateTechnique({ ...ok, callouts: Array(5).fill({ label: 'Up', x: 1, y: 1, side: 'left' }) }))
      .toBe('too_many')
  })

  it('has a readable message for every error it can return', () => {
    for (const [key, message] of Object.entries(TECHNIQUE_ERRORS)) {
      expect(message.length, key).toBeGreaterThan(10)
      // Written for the person filling the form, not for a log.
      expect(message, key).not.toMatch(/invalid|error|failed|400/i)
    }
  })
})

describe('toTechnique', () => {
  it('trims, drops blanks, and keeps the reviewer and the date', () => {
    const t = toTechnique({
      ...ok,
      steps: ['  Set the bar.  ', '', '  Stand up.  '],
      cues: [{ label: ' Chest proud ', detail: '  ' }, { label: '' }],
    })
    expect(t.steps).toEqual(['Set the bar.', 'Stand up.'])
    expect(t.cues).toEqual([{ label: 'Chest proud' }])
    expect(t.reviewedBy).toBe('Sam Okafor, CSCS')
    expect(t.reviewedOn).toBe('2026-09-21')
  })
})

describe('the editor’s line format', () => {
  it('round-trips callouts', () => {
    const lines = 'Chest proud | Ribs down | 30 | 25 | left\nKnees out |  | 60 | 55 | right'
    const parsed = parseCalloutLines(lines)
    expect(parsed).toEqual([
      { label: 'Chest proud', detail: 'Ribs down', x: 30, y: 25, side: 'left' },
      { label: 'Knees out', detail: undefined, x: 60, y: 55, side: 'right' },
    ])
    expect(calloutLines(parsed)).toContain('Chest proud | Ribs down | 30 | 25 | left')
  })

  it('defaults a missing side to left rather than throwing', () => {
    expect(parseCalloutLines('Chest proud')?.[0]).toEqual({
      label: 'Chest proud',
      detail: undefined,
      x: 0,
      y: 0,
      side: 'left',
    })
  })

  it('round-trips cues and mistakes', () => {
    const parsed = parsePairLines('Chest proud | Ribs down\nKnees out')
    expect(parsed).toEqual([{ label: 'Chest proud', detail: 'Ribs down' }, { label: 'Knees out' }])
    expect(pairLines(parsed)).toBe('Chest proud | Ribs down\nKnees out')
  })

  it('ignores blank lines', () => {
    expect(parsePairLines('\n\n  \n')).toEqual([])
    expect(parseCalloutLines('\n \n')).toEqual([])
  })
})

describe('AI drafts', () => {
  const today = '2026-09-21'

  it('parses a clean draft', () => {
    const json = JSON.stringify({
      steps: ['Set the bar across your shoulders.', 'Stand up out of the rack.'],
      cues: [{ label: 'Chest proud', detail: 'Ribs down, eyes forward.' }],
      mistakes: [{ label: 'Knees falling in', detail: 'Let them track over your toes.' }],
      callouts: [{ label: 'Chest proud', detail: 'Ribs down', x: 30, y: 25, side: 'left' }],
    })
    const result = parseDraft('back_squat', json, today)!
    expect(result.rejected).toBeUndefined()
    expect(result.draft.steps).toHaveLength(2)
    expect(result.draft.callouts?.[0].side).toBe('left')
  })

  it('digs the JSON out of whatever the model wrapped it in', () => {
    const wrapped = 'Sure! Here you go:\n```json\n{"steps":["Stand up."]}\n```\nHope that helps.'
    expect(parseDraft('back_squat', wrapped, today)!.draft.steps).toEqual(['Stand up.'])
  })

  it('rejects a draft that prescribes a dose, rather than storing it', () => {
    // The model is told not to. This is what happens when it does anyway —
    // a rejected draft is never written, because a stored one would sit
    // there waiting for somebody to skim-read and publish it.
    const json = JSON.stringify({ steps: ['Do 3 x 8 with two minutes rest.'] })
    const result = parseDraft('back_squat', json, today)!
    expect(result.rejected).toMatch(/dose_not_allowed/)
  })

  it('rejects medical and evidence claims the same way', () => {
    expect(parseDraft('back_squat', JSON.stringify({ steps: ['This treats knee pain.'] }), today)!.rejected)
      .toMatch(/medical/)
    expect(parseDraft('back_squat', JSON.stringify({ steps: ['Studies show this is best.'] }), today)!.rejected)
      .toMatch(/evidence/)
  })

  it('survives junk without throwing', () => {
    expect(parseDraft('back_squat', 'I cannot help with that.', today)!.rejected).toMatch(/JSON/)
    expect(parseDraft('back_squat', '{', today)!.rejected).toMatch(/JSON/)
    expect(parseDraft('not_a_movement', '{}', today)).toBeNull()
  })

  it('clamps a callout that lands off the picture instead of binning the draft', () => {
    const json = JSON.stringify({ steps: ['Stand up.'], callouts: [{ label: 'Up', x: 140, y: -20, side: 'x' }] })
    const result = parseDraft('back_squat', json, today)!
    expect(result.rejected).toBeUndefined()
    expect(result.draft.callouts?.[0]).toMatchObject({ x: 100, y: 0, side: 'left' })
  })

  it('caps what the model returns rather than trusting the count', () => {
    const json = JSON.stringify({
      steps: Array(20).fill('Stand up.'),
      cues: Array(20).fill({ label: 'Up' }),
    })
    const result = parseDraft('back_squat', json, today)!
    expect(result.rejected).toBeUndefined()
    expect(result.draft.steps.length).toBeLessThanOrEqual(8)
    expect(result.draft.cues?.length).toBeLessThanOrEqual(4)
  })

  it('never lets the model name the reviewer', () => {
    // Whatever it returns, the draft carries no signature: the editor's
    // Publish button is the only thing that sets one.
    const json = JSON.stringify({ steps: ['Stand up.'], reviewedBy: 'Dr AI, PhD' })
    const result = parseDraft('back_squat', json, today)!
    expect((result.draft as Record<string, unknown>).reviewedBy).toBeUndefined()
  })

  it('tells the model the rules it will be judged by', () => {
    // If the prompt and the validator drift apart, the model wastes calls
    // producing drafts that are thrown away.
    expect(DRAFT_SYSTEM_PROMPT).toMatch(/No sets, reps, weights/i)
    expect(DRAFT_SYSTEM_PROMPT).toMatch(/No medical language/i)
    expect(DRAFT_SYSTEM_PROMPT).toMatch(/research|studies/i)
    expect(DRAFT_SYSTEM_PROMPT).toMatch(/never shown to anyone until a named person/i)
  })

  it('tells the model what movement it is drafting, and refuses an unknown one', () => {
    const prompt = draftUserPrompt('back_squat')!
    expect(prompt).toMatch(/Back squat/)
    expect(prompt).toMatch(/barbell/)
    expect(draftUserPrompt('not_a_movement')).toBeNull()
  })
})

describe('the stutter the model makes', () => {
  it('drops a detail that just repeats its label', () => {
    // Seen in the wild: {"label":"Bar on upper traps","detail":"Bar on upper
    // traps"}. On screen that reads as a stutter, and a reviewer should not
    // have to delete it by hand on seventy-nine movements.
    const json = JSON.stringify({
      steps: ['Stand up.'],
      cues: [{ label: 'Bar on upper traps', detail: 'Bar on upper traps' }],
      callouts: [{ label: 'Chest up', detail: 'Chest up.', x: 30, y: 25, side: 'left' }],
    })
    const result = parseDraft('back_squat', json, '2026-09-21')!
    expect(result.draft.cues?.[0]).toEqual({ label: 'Bar on upper traps' })
    expect(result.draft.callouts?.[0].detail).toBeUndefined()
  })

  it('keeps a detail that actually says something more', () => {
    const json = JSON.stringify({
      steps: ['Stand up.'],
      cues: [{ label: 'Chest up', detail: 'Ribs down, eyes forward.' }],
    })
    const result = parseDraft('back_squat', json, '2026-09-21')!
    expect(result.draft.cues?.[0].detail).toBe('Ribs down, eyes forward.')
  })
})
