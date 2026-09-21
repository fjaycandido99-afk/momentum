import {
  MOVEMENTS,
  MOVEMENTS_BY_ID,
  type Equipment,
  type Movement,
  type MovementLevel,
} from './library'

/**
 * "What can I do instead?"
 *
 * The one genuinely useful thing a movement library does in the moment: the
 * bench is taken, the gym is shut, your shoulder is unhappy — here is
 * something that trains the same pattern with what you have.
 *
 * All of this is mapping between named movements. No instruction, no
 * judgement about the person, and no claim that one option is better: the
 * reason attached to each is about the CHOICE (what it needs, how much
 * skill it asks for), which is a fact the reader can check.
 *
 * Pure. No clock, no storage.
 */

/** A constraint someone hits mid-session. */
export type SwapReason =
  /** The equipment is taken or missing. */
  | 'no_equipment'
  /** Not at the gym — dumbbells or nothing. */
  | 'home'
  /** Nothing but their own body. */
  | 'bodyweight'
  /** It hurts, or feels wrong. NOT a diagnosis — see the note below. */
  | 'hurts'
  /** They want the simpler version of the same pattern. */
  | 'simpler'

export const SWAP_REASONS: { key: SwapReason; label: string }[] = [
  { key: 'no_equipment', label: 'Equipment’s taken' },
  { key: 'home', label: 'Not at the gym' },
  { key: 'bodyweight', label: 'Nothing but me' },
  { key: 'simpler', label: 'Want it simpler' },
  { key: 'hurts', label: 'This hurts' },
]

/** Equipment you can reasonably have at home. */
const HOME_EQUIPMENT: Equipment[] = ['dumbbell', 'kettlebell', 'band', 'bodyweight', 'bench']

const LEVEL_ORDER: Record<MovementLevel, number> = { simplest: 0, standard: 1, advanced: 2 }

/** Normalise a typed row so "BB Bench Press" finds the bench press. */
export function normaliseName(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * The movement a typed row refers to, or null.
 *
 * Exact match on the name or an alias only. No fuzzy scoring on purpose: a
 * wrong match would offer swaps for the wrong exercise, which is worse than
 * offering none — and "row" meaning three different things is exactly where
 * a scoring function would guess.
 */
export function matchMovement(text: string): Movement | null {
  const needle = normaliseName(text)
  if (!needle) return null
  for (const movement of MOVEMENTS) {
    if (normaliseName(movement.name) === needle) return movement
    if (movement.aliases?.some(alias => normaliseName(alias) === needle)) return movement
  }
  return null
}

/** Everything that trains the same pattern, minus the movement itself. */
export function samePattern(movement: Movement): Movement[] {
  return MOVEMENTS.filter(m => m.pattern === movement.pattern && m.id !== movement.id)
}

/**
 * What to do instead, for a given constraint.
 *
 * Ordered by how well it fits the constraint, then by how little skill it
 * asks for — on a day when the plan has already fallen apart, the simpler
 * option is the one more likely to happen.
 */
export function swapsFor(movementId: string, reason: SwapReason): Movement[] {
  const movement = MOVEMENTS_BY_ID.get(movementId)
  if (!movement) return []
  const options = samePattern(movement)

  const matches = (m: Movement): boolean => {
    switch (reason) {
      case 'bodyweight':
        return m.equipment.includes('bodyweight')
      case 'home':
        return m.equipment.every(e => HOME_EQUIPMENT.includes(e))
      case 'no_equipment':
        // Anything that doesn't need what this one needs.
        return !m.equipment.some(e => movement.equipment.includes(e))
      case 'simpler':
        return LEVEL_ORDER[m.level] < LEVEL_ORDER[movement.level]
      case 'hurts':
        // Everything in the pattern, simplest first. Choosing is theirs —
        // the app has no idea what hurts or why.
        return true
    }
  }

  return options
    .filter(matches)
    .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level])
}

/**
 * What the app says when someone taps "this hurts".
 *
 * Deliberately not a recommendation. Voxu cannot see them, cannot examine
 * anything and must not imply that swapping an exercise is a treatment for
 * pain. It offers the same pattern, says skipping is fine, and points at
 * somebody qualified.
 */
export const HURTS_NOTE =
  'Voxu can’t tell you why something hurts, and swapping an exercise isn’t treatment. Pick something that feels controllable, or skip the movement entirely today — neither costs you the session. If it keeps hurting, see someone qualified.'

/** The one-line reason a swap list is what it is. */
export function swapIntro(reason: SwapReason, movement: Movement): string {
  switch (reason) {
    case 'no_equipment':
      return `Other ways to train the same pattern without the ${movement.equipment[0]}.`
    case 'home':
      return 'The same pattern with what you’d have at home.'
    case 'bodyweight':
      return 'The same pattern with nothing but you.'
    case 'simpler':
      return 'The same pattern, asking less skill.'
    case 'hurts':
      return 'Same pattern, simplest first.'
  }
}
