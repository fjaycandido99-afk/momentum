import { MOVEMENTS_BY_ID, type MovementTechnique } from './library'

/**
 * Accepting reviewed technique guidance.
 *
 * The app refuses to write form cues. This is how somebody qualified gets
 * them in instead — and the rules here are what stop that door being a way
 * for unreviewed content to walk through it.
 *
 * Three hard rules:
 *
 * 1. A REAL NAME. `reviewedBy` must look like a person, not "Voxu", not
 *    "the team", not a company. The screen prints that name, and a reader
 *    deciding whether to trust a cue is entitled to know whose it is.
 * 2. A DATE. Guidance ages. The screen shows how old it is.
 * 3. NO DOSE. Sets, reps, loads, rest and percentages are a prescription
 *    for a body nobody in this system has examined. A reviewer can say how
 *    to move; how much is between the person and their own coach.
 *
 * Pure. No database, no clock — the API layer calls this and stores what
 * comes back.
 */

export const TECHNIQUE_LIMITS = {
  steps: { max: 8, maxLength: 200 },
  cues: { max: 4, maxLength: 60, maxDetail: 120 },
  mistakes: { max: 4, maxLength: 60, maxDetail: 120 },
  callouts: { max: 4, maxLength: 40, maxDetail: 80 },
  reviewedBy: { maxLength: 80 },
} as const

/** Names that are not a person. */
const NOT_A_PERSON = /^(voxu|the team|admin|staff|support|editor|ai|chatgpt|claude|system)\b/i

/** A dose: a number attached to a training parameter. */
const DOSE = /\b\d+\s*(x\s*\d+|sets?|reps?|kg|lbs?|%|bpm|seconds?|secs?|minutes?|mins?)\b|\b(sets?|reps?) of \d|\brir\b|\b1rm\b/i

/** Claims about evidence that nobody here can stand behind. */
const EVIDENCE = /\b(studies show|research shows|scientifically|clinically proven|proven to)\b/i

/** Medical territory. A cue is not a diagnosis or a treatment. */
const MEDICAL = /\b(cures?|treats?|heals?|diagnos|rehab protocol|physical therapy plan)\b/i

export interface TechniqueDraft {
  movementId: string
  reviewedBy: string
  /** YYYY-MM-DD. */
  reviewedOn: string
  steps: string[]
  cues?: { label: string; detail?: string }[]
  mistakes?: { label: string; detail?: string }[]
  callouts?: { label: string; detail?: string; x: number; y: number; side: 'left' | 'right' }[]
}

export type TechniqueError =
  | 'unknown_movement'
  | 'reviewer_required'
  | 'reviewer_not_a_person'
  | 'date_required'
  | 'steps_required'
  | 'too_many_steps'
  | 'step_too_long'
  | 'dose_not_allowed'
  | 'evidence_claim_not_allowed'
  | 'medical_claim_not_allowed'
  | 'callout_off_image'
  | 'too_many'

export const TECHNIQUE_ERRORS: Record<TechniqueError, string> = {
  unknown_movement: 'That movement is not in the library.',
  reviewer_required: 'Who reviewed this? The screen shows the name, so it cannot be blank.',
  reviewer_not_a_person:
    'That needs to be a person’s name. Not Voxu, not a company — whoever is standing behind these words.',
  date_required: 'When was this reviewed? Guidance ages, and the screen says how old it is.',
  steps_required: 'Add at least one step.',
  too_many_steps: `That is more than ${TECHNIQUE_LIMITS.steps.max} steps. Nobody reads past that mid-session.`,
  step_too_long: 'One of those steps is too long to read while you are standing at a rack.',
  dose_not_allowed:
    'No sets, reps, loads or times. How to move is yours to write; how much belongs to the person and their own coach.',
  evidence_claim_not_allowed:
    'Voxu does not claim what the research says. Say what to do, not what a study found.',
  medical_claim_not_allowed: 'This cannot treat, cure or diagnose anything. A cue is not a treatment.',
  callout_off_image: 'A callout sits on the picture, so x and y have to be between 0 and 100.',
  too_many: 'That is more than the screen can show.',
}

/** Everything a reviewer typed, in one string, for the content checks. */
function allText(draft: TechniqueDraft): string {
  return [
    ...draft.steps,
    ...(draft.cues ?? []).flatMap(c => [c.label, c.detail ?? '']),
    ...(draft.mistakes ?? []).flatMap(m => [m.label, m.detail ?? '']),
    ...(draft.callouts ?? []).flatMap(c => [c.label, c.detail ?? '']),
  ].join(' \n ')
}

/**
 * Check a draft, or say why not.
 *
 * Returns the first problem rather than a list: this is one person filling
 * one form, and a wall of errors is harder to act on than the next thing to
 * fix.
 */
export function validateTechnique(draft: TechniqueDraft): TechniqueError | null {
  if (!MOVEMENTS_BY_ID.has(draft.movementId)) return 'unknown_movement'

  const reviewer = draft.reviewedBy.trim()
  if (!reviewer) return 'reviewer_required'
  if (NOT_A_PERSON.test(reviewer)) return 'reviewer_not_a_person'
  // A single word can be a name ("Fran"), but it needs to read like one.
  if (reviewer.length < 2 || reviewer.length > TECHNIQUE_LIMITS.reviewedBy.maxLength) {
    return 'reviewer_not_a_person'
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.reviewedOn)) return 'date_required'

  const steps = draft.steps.map(s => s.trim()).filter(Boolean)
  if (steps.length === 0) return 'steps_required'
  if (steps.length > TECHNIQUE_LIMITS.steps.max) return 'too_many_steps'
  if (steps.some(s => s.length > TECHNIQUE_LIMITS.steps.maxLength)) return 'step_too_long'

  if ((draft.cues?.length ?? 0) > TECHNIQUE_LIMITS.cues.max) return 'too_many'
  if ((draft.mistakes?.length ?? 0) > TECHNIQUE_LIMITS.mistakes.max) return 'too_many'
  if ((draft.callouts?.length ?? 0) > TECHNIQUE_LIMITS.callouts.max) return 'too_many'

  for (const callout of draft.callouts ?? []) {
    if (callout.x < 0 || callout.x > 100 || callout.y < 0 || callout.y > 100) {
      return 'callout_off_image'
    }
  }

  const text = allText(draft)
  if (DOSE.test(text)) return 'dose_not_allowed'
  if (EVIDENCE.test(text)) return 'evidence_claim_not_allowed'
  if (MEDICAL.test(text)) return 'medical_claim_not_allowed'

  return null
}

/** A validated draft as the movement screen wants it. */
export function toTechnique(draft: TechniqueDraft): MovementTechnique {
  const trim = (v: string) => v.trim()
  const pair = (item: { label: string; detail?: string }) => {
    const detail = item.detail?.trim()
    return detail ? { label: trim(item.label), detail } : { label: trim(item.label) }
  }

  return {
    reviewedBy: draft.reviewedBy.trim(),
    reviewedOn: draft.reviewedOn,
    steps: draft.steps.map(trim).filter(Boolean),
    cues: (draft.cues ?? []).filter(c => c.label.trim()).map(pair),
    mistakes: (draft.mistakes ?? []).filter(m => m.label.trim()).map(pair),
    callouts: (draft.callouts ?? [])
      .filter(c => c.label.trim())
      .map(c => ({ ...pair(c), x: c.x, y: c.y, side: c.side })),
  }
}

/**
 * One line per callout, for the editor's textarea.
 *
 * `label | detail | x | y | side`. A text format rather than a drag-and-drop
 * canvas because this is an internal tool used a handful of times per
 * movement, and a canvas is a week of work to save somebody thirty seconds.
 */
export function parseCalloutLines(text: string): TechniqueDraft['callouts'] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [label = '', detail = '', x = '', y = '', side = ''] = line.split('|').map(p => p.trim())
      return {
        label,
        detail: detail || undefined,
        x: Number(x) || 0,
        y: Number(y) || 0,
        side: side === 'right' ? ('right' as const) : ('left' as const),
      }
    })
}

export function calloutLines(callouts: TechniqueDraft['callouts']): string {
  return (callouts ?? [])
    .map(c => [c.label, c.detail ?? '', c.x, c.y, c.side].join(' | '))
    .join('\n')
}

/** Where a callout label can sit, as a percentage of the image height. */
export const CALLOUT_BAND = { top: 5, bottom: 62, gap: 13 } as const

/**
 * Move labels so they don't land on each other, or under the caption.
 *
 * The point each label refers to stays exactly where the reviewer put it —
 * only the LABEL slides. The bottom of the hero carries a gradient and a
 * line of text, and in the first real draft two labels sat on top of it and
 * were unreadable.
 *
 * Deliberately not clever: sort by the point's height, then push each label
 * down far enough to clear the one above. With four labels maximum there is
 * always room.
 */
export function layoutCallouts<T extends { x: number; y: number }>(
  callouts: T[],
): (T & { labelY: number })[] {
  const sorted = [...callouts].sort((a, b) => a.y - b.y)
  let previous = -Infinity

  return sorted.map(callout => {
    const wanted = Math.min(Math.max(callout.y, CALLOUT_BAND.top), CALLOUT_BAND.bottom)
    const labelY = Math.max(wanted, previous + CALLOUT_BAND.gap)
    previous = labelY
    return { ...callout, labelY }
  })
}

/** `label | detail` per line, for cues and mistakes. */
export function parsePairLines(text: string): { label: string; detail?: string }[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [label = '', detail = ''] = line.split('|').map(p => p.trim())
      return detail ? { label, detail } : { label }
    })
}

export function pairLines(pairs: { label: string; detail?: string }[] | undefined): string {
  return (pairs ?? []).map(p => (p.detail ? `${p.label} | ${p.detail}` : p.label)).join('\n')
}
