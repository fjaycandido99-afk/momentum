/**
 * What you can put in a routine, as a list of real things.
 *
 * The kind dropdown works and says "A discipline" — which is the app's word
 * for it, not the person's. They have a discipline called Push Pull Legs and
 * a book called Atomic Habits, and a builder that makes them pick "A
 * discipline" and then pick again from a second dropdown is a builder that
 * knows less about their day than they do.
 *
 * So the picker offers: the app's own moments, THEIR disciplines by name,
 * their current book when nothing else covers it, and a few plain ideas for
 * the things Voxu has no screen for.
 *
 * Two rules:
 *
 * It never invents a discipline, a book or a number. Everything under "yours"
 * came from a row they made. The ideas are the only written-here strings, and
 * they are editable the moment they land — the same standing as the era
 * hints, which have always been examples rather than content.
 *
 * It never offers the same thing twice. Somebody with a reading discipline
 * already has their book inside it: offering "Read Atomic Habits" as well
 * would put the same reading in the day in two places, and then remind them
 * about both.
 *
 * Pure.
 */

import { PRESETS_BY_KEY, type PracticeDomain } from '@/lib/practices/presets'
import { ROUTINE_LIMITS, ROUTINE_STEP_KINDS, STEP_KINDS, type RoutineStepKind } from './steps'

export type StepGroup = 'app' | 'yours' | 'ideas'

export interface StepOption {
  /** Stable key for the list. */
  id: string
  group: StepGroup
  /** What the picker shows. Their words wherever there are any. */
  label: string
  /** One short line under it, or nothing. */
  hint?: string
  /** What gets inserted. */
  kind: RoutineStepKind
  ref: string | null
  /** Pre-filled words for a step of their own. */
  text: string
}

export const GROUP_LABELS: Record<StepGroup, string> = {
  app: 'In Voxu',
  yours: 'Yours',
  ideas: 'Something else',
}

/**
 * Plain steps Voxu has no screen for.
 *
 * Four, deliberately: this is a list of examples to argue with, not a habit
 * library. Anything longer starts to read as the app having opinions about
 * what a morning should contain.
 */
export const STEP_IDEAS = [
  'Phone in another room',
  'Make the bed',
  'Walk, no headphones',
  'Lights off, phone down',
] as const

export interface PickerPractice {
  id: string
  label: string
  preset_key: string
}

export interface PickerBook {
  title: string
  author?: string | null
}

export interface PickerInput {
  /** Their active disciplines, in the order they made them. */
  practices?: readonly PickerPractice[]
  /** The book they are reading now, if there is one. */
  book?: PickerBook | null
}

const domainOf = (preset_key: string): PracticeDomain | undefined =>
  PRESETS_BY_KEY.get(preset_key)?.domain

/** "Read Atomic Habits", trimmed at a word to fit a step's name. */
export function readingLabel(title: string, max = ROUTINE_LIMITS.stepLabel): string {
  const clean = `Read ${title.trim().replace(/\s+/g, ' ')}`
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const space = cut.lastIndexOf(' ')
  return (space > max * 0.5 ? cut.slice(0, space) : cut).trim()
}

export function stepOptions(input: PickerInput = {}): StepOption[] {
  const practices = input.practices ?? []
  const options: StepOption[] = []

  // The app's own moments. Everything except 'practice', which needs to know
  // WHICH one and is listed by name below, and 'own', which is the ideas.
  for (const kind of ROUTINE_STEP_KINDS) {
    if (kind === 'practice' || kind === 'own') continue
    options.push({
      id: `kind:${kind}`,
      group: 'app',
      label: STEP_KINDS[kind].label,
      hint: STEP_KINDS[kind].cue || undefined,
      kind,
      ref: null,
      text: '',
    })
  }

  // Their disciplines, by the name THEY gave them.
  for (const practice of practices) {
    options.push({
      id: `practice:${practice.id}`,
      group: 'yours',
      label: practice.label,
      hint: 'Your discipline — it keeps its own record',
      kind: 'practice',
      ref: practice.id,
      text: '',
    })
  }

  // The book, only when no reading discipline already carries it.
  const hasReading = practices.some(p => domainOf(p.preset_key) === 'read')
  if (input.book?.title?.trim() && !hasReading) {
    options.push({
      id: 'book',
      group: 'yours',
      label: readingLabel(input.book.title),
      hint: input.book.author?.trim() || 'The book you are on',
      kind: 'own',
      ref: null,
      text: readingLabel(input.book.title),
    })
  }

  for (const idea of STEP_IDEAS) {
    options.push({
      id: `idea:${idea}`,
      group: 'ideas',
      label: idea,
      kind: 'own',
      ref: null,
      text: idea,
    })
  }

  // And always the blank one. Somebody whose step is "call my mum" should not
  // have to pick an idea and delete it first.
  options.push({
    id: 'blank',
    group: 'ideas',
    label: 'Something of my own',
    hint: 'You write it',
    kind: 'own',
    ref: null,
    text: '',
  })

  return options
}

/** The options, grouped in display order, with empty groups dropped. */
export function groupedStepOptions(
  input: PickerInput = {},
): { group: StepGroup; label: string; options: StepOption[] }[] {
  const all = stepOptions(input)
  return (['app', 'yours', 'ideas'] as StepGroup[])
    .map(group => ({ group, label: GROUP_LABELS[group], options: all.filter(o => o.group === group) }))
    .filter(section => section.options.length > 0)
}
