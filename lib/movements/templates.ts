import {
  MOVEMENTS,
  PATTERN_LABELS,
  type Equipment,
  type Movement,
  type MovementPattern,
} from './library'

/**
 * Session shapes: which patterns a day covers, and nothing else.
 *
 * This is the honest half of a "preset workout". A template says a full
 * body day covers a squat, a hinge, a push, a pull and the middle — that
 * is what those words MEAN, not a claim about what works better. It picks
 * concrete movements from the library by what equipment you have, and
 * stops there.
 *
 * What a template never carries: sets, reps, loads, rest, weeks, or a
 * promise about results. A dose is a prescription for a body the app has
 * never seen, and the numbers are the person's own — the row's "how much"
 * field stays empty for them to fill. A test enforces that.
 *
 * Pure. Same input, same session.
 */

/** What someone has to train with. */
export type Kit = 'gym' | 'home' | 'bodyweight'

export const KIT_LABELS: Record<Kit, string> = {
  gym: 'Full gym',
  home: 'Dumbbells at home',
  bodyweight: 'Nothing but me',
}

/** Equipment each kit can reach. */
const KIT_EQUIPMENT: Record<Kit, Equipment[]> = {
  gym: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band', 'bench', 'rack', 'kettlebell'],
  home: ['dumbbell', 'kettlebell', 'band', 'bodyweight', 'bench'],
  bodyweight: ['bodyweight'],
}

export interface TemplateDay {
  label: string
  patterns: MovementPattern[]
}

export interface WorkoutTemplate {
  key: string
  name: string
  /** What the shape is, factually. Never why it's better. */
  what: string
  days: TemplateDay[]
}

const FULL_BODY: MovementPattern[] = ['squat', 'hinge', 'horizontal_push', 'horizontal_pull', 'core']

export const TEMPLATES: WorkoutTemplate[] = [
  {
    key: 'full_body',
    name: 'Full body',
    what: 'Every day covers the same five patterns: a squat, a hinge, a push, a pull and the middle.',
    days: [
      { label: 'Full body', patterns: FULL_BODY },
    ],
  },
  {
    key: 'upper_lower',
    name: 'Upper / lower',
    what: 'Two kinds of day. Upper covers pushing and pulling in both directions; lower covers squatting, hinging and one leg at a time.',
    days: [
      { label: 'Upper', patterns: ['horizontal_push', 'horizontal_pull', 'vertical_push', 'vertical_pull', 'core'] },
      { label: 'Lower', patterns: ['squat', 'hinge', 'single_leg', 'core'] },
    ],
  },
  {
    key: 'push_pull_legs',
    name: 'Push / pull / legs',
    what: 'Three kinds of day: everything you push, everything you pull, then legs.',
    days: [
      { label: 'Push', patterns: ['horizontal_push', 'vertical_push', 'core'] },
      { label: 'Pull', patterns: ['horizontal_pull', 'vertical_pull', 'core'] },
      { label: 'Legs', patterns: ['squat', 'hinge', 'single_leg'] },
    ],
  },
  {
    key: 'minimum',
    name: 'Three movements',
    what: 'A squat, a push and a pull. The version for a day you nearly skipped.',
    days: [
      { label: 'Short session', patterns: ['squat', 'horizontal_push', 'horizontal_pull'] },
    ],
  },
]

export const TEMPLATES_BY_KEY = new Map(TEMPLATES.map(t => [t.key, t]))

const LEVEL_RANK = { simplest: 0, standard: 1, advanced: 2 } as const

/**
 * The movement a template uses for one pattern, given the kit.
 *
 * Picks the simplest option the kit can reach: on the day someone accepts
 * a suggested session they are usually not looking for the hardest
 * variation, and every alternative is one tap away on the movement screen.
 * Deterministic, so the same choice comes back tomorrow.
 */
export function movementFor(pattern: MovementPattern, kit: Kit): Movement | null {
  const reachable = KIT_EQUIPMENT[kit]
  const options = MOVEMENTS
    .filter(m => m.pattern === pattern && m.equipment.every(e => reachable.includes(e)))
    .sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || a.name.localeCompare(b.name))
  return options[0] ?? null
}

export interface TemplateSession {
  label: string
  /** The movements, in pattern order. Patterns the kit can't reach are dropped. */
  movements: Movement[]
  /** Patterns this kit has nothing for, so the UI can say so plainly. */
  missing: MovementPattern[]
}

/** One day of a template, resolved to real movements. */
export function sessionFor(template: WorkoutTemplate, dayIndex: number, kit: Kit): TemplateSession {
  const day = template.days[dayIndex % template.days.length]
  const movements: Movement[] = []
  const missing: MovementPattern[] = []
  for (const pattern of day.patterns) {
    const movement = movementFor(pattern, kit)
    if (movement) movements.push(movement)
    else missing.push(pattern)
  }
  return { label: day.label, movements, missing }
}

/**
 * A whole template laid across however many days someone trains.
 *
 * Cycles the template's days over the slots they actually have: a
 * push/pull/legs template on two days a week gives push and pull this
 * week, which is the honest answer rather than cramming three into two.
 */
export function sessionsFor(template: WorkoutTemplate, slotCount: number, kit: Kit): TemplateSession[] {
  return Array.from({ length: Math.max(0, slotCount) }, (_, i) => sessionFor(template, i, kit))
}

/** What a template can't cover with this kit, in words. */
export function missingNote(missing: MovementPattern[]): string | null {
  if (missing.length === 0) return null
  const names = missing.map(p => PATTERN_LABELS[p].toLowerCase())
  return `Nothing in the library covers ${names.join(' or ')} with that kit, so those days are shorter.`
}
