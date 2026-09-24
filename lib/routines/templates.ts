/**
 * A routine that arrives already written.
 *
 * The thing that kills a builder is opening blank. "The day" with one empty
 * row asks somebody to design their morning from nothing, at the exact moment
 * they were looking for Voxu to tell them what a good one looks like. So
 * every era has a routine already in it, and the editor opens on that — a
 * draft to argue with rather than a form to fill.
 *
 * Two rules these templates keep, both learned elsewhere in the app:
 *
 * A template never guesses a DISCIPLINE. Only `gym_arc` and `study` carry a
 * discipline step, and only because lib/era/keep.ts already established that
 * those two are the only eras that map onto a domain — the other six describe
 * how you behave, and "stop drifting" has no room to put a habit in. A step
 * wanting a domain the person has no active discipline for is dropped, never
 * seeded blank: a discipline step with no discipline is a step that cannot be
 * saved and reads as the app half-finishing its own suggestion.
 *
 * A template never invents a NUMBER. "30 minutes" appears where Francis's own
 * era hints already say things like that in his words; nothing here counts
 * reps, sets, pages or minutes on the person's behalf.
 *
 * Pure. The times are suggestions in HH:MM, sorted by the same function the
 * editor uses, so a template can never produce a list the builder would
 * reorder the moment it opened.
 */

import type { PracticeDomain } from '@/lib/practices/presets'
import { PRESETS_BY_KEY } from '@/lib/practices/presets'
import { MAX_ROUTINE_STEPS, sortSteps, type RoutineMode, type RoutineStepKind } from './steps'

export interface TemplateStep {
  kind: RoutineStepKind
  /** Their words, for a step of their own. Empty means the kind's own label. */
  label?: string
  /** A suggestion, HH:MM. Dropped in sequence mode. */
  time: string
  /** Does it survive a bad day? */
  inMinimum?: boolean
  /**
   * A discipline step wants one of THEIR disciplines in this domain. The step
   * is dropped when they have none.
   */
  domain?: PracticeDomain
}

export interface RoutineTemplate {
  /** What the routine is called. Editable the second it opens. */
  label: string
  mode: RoutineMode
  /** The one nudge to begin, for a sequence routine. */
  start: string
  steps: TemplateStep[]
}

/**
 * What a seeded step looks like — the editor's draft shape, minus the editor.
 * lib never imports a component.
 */
export interface SeededStep {
  kind: RoutineStepKind
  ref: string | null
  label: string
  minimum: string
  time: string | null
  inMinimum: boolean
}

/**
 * The routine for somebody who has not said what theirs is.
 *
 * Sequence mode on purpose: a person with no era and no times of their own is
 * exactly who wants to press Start and be walked through it, rather than be
 * asked to invent five clock times first.
 */
export const DEFAULT_TEMPLATE: RoutineTemplate = {
  label: 'My routine',
  mode: 'sequence',
  start: '07:00',
  steps: [
    { kind: 'promise', time: '07:00', inMinimum: true },
    { kind: 'audio', time: '07:10' },
    { kind: 'exercise', time: '07:20' },
    { kind: 'journal', time: '21:30' },
  ],
}

export const ERA_TEMPLATES: Record<string, RoutineTemplate> = {
  locked_in: {
    label: 'Locked In day',
    mode: 'timed',
    start: '07:00',
    steps: [
      { kind: 'promise', time: '07:00', inMinimum: true },
      { kind: 'audio', time: '07:10' },
      { kind: 'own', label: 'The thing I keep avoiding, first', time: '09:00', inMinimum: true },
      { kind: 'journal', time: '21:30' },
    ],
  },
  discipline: {
    label: 'Discipline day',
    mode: 'timed',
    start: '06:30',
    steps: [
      { kind: 'promise', time: '06:30', inMinimum: true },
      { kind: 'own', label: 'Out of bed, no negotiating', time: '06:35', inMinimum: true },
      { kind: 'exercise', time: '07:00' },
      { kind: 'journal', time: '21:30' },
    ],
  },
  comeback: {
    label: 'Comeback day',
    mode: 'timed',
    start: '07:30',
    steps: [
      { kind: 'audio', time: '07:30', inMinimum: true },
      { kind: 'promise', time: '07:45', inMinimum: true },
      { kind: 'exercise', time: '08:00' },
      { kind: 'reset', time: '22:00' },
    ],
  },
  gym_arc: {
    label: 'Training day',
    mode: 'timed',
    start: '07:00',
    steps: [
      { kind: 'promise', time: '07:00', inMinimum: true },
      { kind: 'audio', time: '07:10' },
      { kind: 'practice', domain: 'gym', time: '18:00', inMinimum: true },
      { kind: 'journal', time: '21:30' },
    ],
  },
  stoic_mode: {
    label: 'Stoic day',
    mode: 'timed',
    start: '06:45',
    steps: [
      { kind: 'audio', time: '06:45' },
      { kind: 'promise', time: '07:00', inMinimum: true },
      { kind: 'exercise', time: '12:30' },
      { kind: 'journal', time: '21:30', inMinimum: true },
      { kind: 'reset', time: '22:15' },
    ],
  },
  confidence: {
    label: 'Confidence day',
    mode: 'timed',
    start: '07:30',
    steps: [
      { kind: 'promise', time: '07:30', inMinimum: true },
      { kind: 'audio', time: '07:45' },
      { kind: 'own', label: "Say the thing I'd usually keep in", time: '12:00', inMinimum: true },
      { kind: 'journal', time: '21:30' },
    ],
  },
  study: {
    label: 'Study day',
    mode: 'timed',
    start: '08:00',
    steps: [
      { kind: 'promise', time: '08:00', inMinimum: true },
      { kind: 'own', label: 'Phone in another room', time: '08:55' },
      { kind: 'practice', domain: 'study', time: '09:00', inMinimum: true },
      { kind: 'journal', time: '21:00' },
    ],
  },
  five_am: {
    label: '5AM',
    mode: 'timed',
    start: '05:00',
    steps: [
      { kind: 'own', label: 'Up. Feet on the floor.', time: '05:00', inMinimum: true },
      { kind: 'audio', time: '05:10' },
      { kind: 'promise', time: '05:25', inMinimum: true },
      { kind: 'exercise', time: '05:40' },
      { kind: 'reset', time: '21:30' },
    ],
  },
}

/** The template for an era, or the one for nobody in particular. */
export function templateFor(eraKey: string | null | undefined): RoutineTemplate {
  if (!eraKey) return DEFAULT_TEMPLATE
  return ERA_TEMPLATES[eraKey] ?? DEFAULT_TEMPLATE
}

/** A discipline, as much of one as this needs to know. */
export interface PracticeRef {
  id: string
  preset_key: string
}

/**
 * The template, turned into a draft this person can actually save.
 *
 * Discipline steps are matched to one of their own active disciplines by the
 * preset's domain, first match wins, and dropped when there is none. Times
 * survive in timed mode and are dropped in sequence mode, where a step
 * happens when the one before it is done.
 */
export function seedTemplate(
  template: RoutineTemplate,
  practices: readonly PracticeRef[] = [],
): SeededStep[] {
  const domainOf = (p: PracticeRef): PracticeDomain | undefined =>
    PRESETS_BY_KEY.get(p.preset_key)?.domain

  const seeded: SeededStep[] = []

  for (const step of template.steps) {
    let ref: string | null = null

    if (step.domain) {
      const match = practices.find(p => domainOf(p) === step.domain)
      // No discipline in that domain: the step goes. Better a shorter
      // routine than one holding a step it cannot fill.
      if (!match) continue
      ref = match.id
    }

    seeded.push({
      kind: step.kind,
      ref,
      label: step.label ?? '',
      // Floors belong to the person. A discipline step reads its own from
      // the discipline; a step of their own starts without one rather than
      // with Voxu's idea of what "the smallest version" is.
      minimum: '',
      time: template.mode === 'timed' ? step.time : null,
      inMinimum: step.inMinimum === true,
    })
  }

  return sortSteps(seeded, template.mode).slice(0, MAX_ROUTINE_STEPS)
}
