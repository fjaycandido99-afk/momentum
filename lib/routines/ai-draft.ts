/**
 * "I'm up at six, gym after work, I want to read before bed."
 *
 * The era templates cover eight days. This covers everybody else's, and it is
 * the difference between a builder that feels coached and a form that happens
 * to be pre-filled.
 *
 * The model's job is narrow on purpose: turn what somebody said into steps
 * Voxu already has. It does not invent disciplines, floors, page counts or
 * "optimal" times, and it cannot — every field is rebuilt here from a closed
 * list before it reaches the editor:
 *
 *   kind   must be one of ROUTINE_STEP_KINDS, or the step is dropped.
 *   ref    must be the id of one of THEIR active disciplines, or dropped.
 *   time   must be a real HH:MM, or the step is dropped in timed mode.
 *   label  their words, capped, and only kept for a step of their own.
 *   weight must be one of STEP_WEIGHTS, defaulting to required.
 *
 * And then the whole thing goes through `validateSteps` — the same function
 * the editor and the API use — so a draft that could not have been built by
 * hand can never arrive from a model.
 *
 * It never saves. The draft opens in the editor, unsaved, and somebody looks
 * at their own day before Voxu starts sending notifications about it.
 *
 * Pure. The call lives in app/api/routines/draft.
 */

import {
  MAX_ROUTINE_STEPS,
  ROUTINE_LIMITS,
  ROUTINE_STEP_KINDS,
  STEP_KINDS,
  isRoutineMode,
  isRoutineStepKind,
  isValidTime,
  sortSteps,
  stepWeight,
  validateSteps,
  type RoutineMode,
} from './steps'
import type { SeededStep } from './templates'

/** What a person may type. Long enough for a day, short enough to be one. */
export const DRAFT_LIMITS = { description: 600 } as const

export interface DraftRequest {
  /** What they said about their day. */
  description: string
  /** Their active disciplines, so a step can point at a real one. */
  practices: readonly { id: string; label: string }[]
  /** Their era, for the routine's name. Never for its content. */
  eraTitle?: string | null
}

export interface DraftedRoutine {
  label: string
  mode: RoutineMode
  startTime: string | null
  days: number[]
  steps: SeededStep[]
}

/** What the model is asked to return, before any of it is believed. */
export interface DraftResponse {
  label?: unknown
  mode?: unknown
  startTime?: unknown
  days?: unknown
  steps?: unknown
}

export const DRAFT_SYSTEM_PROMPT = [
  'You turn a description of somebody’s day into a Voxu routine.',
  '',
  'Return ONLY JSON, in this shape:',
  '{"label":"Training day","mode":"timed","startTime":null,"days":[],',
  ' "steps":[{"kind":"promise","time":"07:00","ref":null,"label":"","weight":"required"}]}',
  '',
  'Rules, and a step that breaks one is thrown away:',
  `- kind is one of: ${ROUTINE_STEP_KINDS.join(', ')}.`,
  '- Use "practice" ONLY for a discipline listed under THEIR DISCIPLINES, and',
  '  put that discipline’s exact id in "ref". Never invent a discipline.',
  '- Use "own" for anything Voxu has no screen for (cold shower, phone in',
  '  another room, walk the dog) and put their own words in "label".',
  '- mode "timed" when they mention clock times, "sequence" when they',
  '  describe an order without times. In sequence mode every time is null',
  '  and "startTime" may be the time they begin.',
  '- time is 24-hour "HH:MM". Only times THEY implied. Do not invent a time',
  '  for a step they gave no time for: leave it out of the routine instead.',
  '- days is a list of weekdays, 0 = Sunday. Empty means every day.',
  '- weight: "required" by default, "optional" for something they said they',
  '  would do if the day allows it, "minimum_only" for a smaller version they',
  '  do on bad days instead.',
  `- At most ${MAX_ROUTINE_STEPS} steps. Fewer is better than padded.`,
  '',
  'Never write a number they did not say: no page counts, no minutes, no sets.',
  'Never add a step they did not mention because it would be good for them.',
].join('\n')

export function buildDraftPrompt(input: DraftRequest): string {
  const lines = [`THEIR DAY: ${input.description.trim().slice(0, DRAFT_LIMITS.description)}`]

  if (input.practices.length > 0) {
    lines.push('', 'THEIR DISCIPLINES (use the id in "ref"):')
    for (const p of input.practices) lines.push(`- ${p.label} — id: ${p.id}`)
  } else {
    lines.push('', 'THEIR DISCIPLINES: none. Do not use kind "practice" at all.')
  }

  // The era names the routine and nothing else. What goes IN the day is what
  // they said, not what the era implies.
  if (input.eraTitle) {
    lines.push('', `THEIR ERA: ${input.eraTitle}. You may name the routine after it.`)
  }

  lines.push('', 'Return the JSON only.')
  return lines.join('\n')
}

/** What a draft was refused for, in a word the route can log. */
export type DraftProblem = 'NO_STEPS' | 'INVALID'

/**
 * Rebuild the model's answer from what is actually allowed.
 *
 * Nothing here trusts a field. Every value is checked against a closed list
 * or dropped, and a step that loses a required field is dropped whole rather
 * than patched — a step with a guessed time is worse than one fewer step.
 */
export function toDraft(
  response: DraftResponse,
  input: DraftRequest,
): { draft: DraftedRoutine } | { problem: DraftProblem } {
  const mode: RoutineMode = isRoutineMode(response.mode) ? response.mode : 'timed'
  const ownIds = new Set(input.practices.map(p => p.id))

  const rawSteps = Array.isArray(response.steps) ? response.steps : []
  const steps: SeededStep[] = []

  for (const raw of rawSteps) {
    if (steps.length >= MAX_ROUTINE_STEPS) break
    const s = (raw ?? {}) as Record<string, unknown>

    if (!isRoutineStepKind(s.kind)) continue

    // A discipline step must point at one of THEIRS. Anything else — an
    // invented id, a label where an id should be — is dropped, because a
    // step aimed at nothing cannot be saved and reads as the app
    // half-finishing its own suggestion.
    let ref: string | null = null
    if (s.kind === 'practice') {
      const candidate = typeof s.ref === 'string' ? s.ref.trim() : ''
      if (!ownIds.has(candidate)) continue
      ref = candidate
    }

    const label = typeof s.label === 'string'
      ? s.label.trim().replace(/\s+/g, ' ').slice(0, ROUTINE_LIMITS.stepLabel)
      : ''

    // Only a step of their own carries words. Letting a model rename
    // "Today's promise" would make the app's own moments unrecognisable.
    const text = s.kind === 'own' ? label : ''
    if (s.kind === 'own' && !text) continue

    // In timed mode a step with no real time is dropped rather than given
    // one. There is no honest hour to pick.
    const time = mode === 'timed' ? (isValidTime(s.time) ? s.time : null) : null
    if (mode === 'timed' && !time) continue

    steps.push({
      kind: s.kind,
      ref,
      label: text,
      // Floors are the person's. A model writing "5 pages" would be
      // inventing the number this whole app refuses to invent.
      minimum: '',
      time,
      weight: stepWeight(s.weight),
      inMinimum: stepWeight(s.weight) === 'minimum_only',
    })
  }

  if (steps.length === 0) return { problem: 'NO_STEPS' }

  const label = typeof response.label === 'string' && response.label.trim()
    ? response.label.trim().replace(/\s+/g, ' ').slice(0, ROUTINE_LIMITS.label)
    : input.eraTitle?.trim()
      ? `${input.eraTitle.trim()} day`.slice(0, ROUTINE_LIMITS.label)
      : 'My routine'

  const days = Array.isArray(response.days)
    ? [...new Set(
        (response.days as unknown[]).filter(
          (d): d is number => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6,
        ),
      )].sort((a, b) => a - b)
    : []

  const startTime = mode === 'sequence' && isValidTime(response.startTime)
    ? response.startTime
    : null

  const ordered = sortSteps(steps, mode)

  // The last gate, and the important one: the same function the editor and
  // the API use. A draft that could not have been built by hand must never
  // arrive from a model.
  if (validateSteps(ordered, mode)) return { problem: 'INVALID' }

  return { draft: { label, mode, startTime, days, steps: ordered } }
}

/**
 * One line describing what came back, for the editor to show above the day.
 *
 * Counts, as everywhere else. It says what it made, not how good it is.
 */
export function draftSummary(draft: DraftedRoutine): string {
  const named = draft.steps
    .map(s => s.label.trim() || STEP_KINDS[s.kind].label)
    .slice(0, 3)
    .join(', ')
  const more = draft.steps.length > 3 ? `, and ${draft.steps.length - 3} more` : ''
  return `${draft.steps.length} steps from what you said: ${named}${more}. Change anything.`
}
