import type { Movement, MovementPattern } from './library'

/**
 * Art for the movement screen.
 *
 * Two rules, both deliberate.
 *
 * 1. No image here shows a person performing the movement. Generated
 *    imagery of a body mid-lift is a form demonstration that nobody
 *    checked, and image models get joints, bar paths and load positions
 *    wrong in ways that look confident. A picture is copied more faithfully
 *    than a sentence, so a wrong one is worse than none. Equipment and
 *    setting carry the screen; a human demonstration waits for footage a
 *    qualified reviewer has approved.
 *
 * 2. A missing image is not a broken screen. Anything without art falls
 *    back to its pattern's art, and anything without that falls back to the
 *    pattern mark, which always exists.
 *
 * Files live in `public/movements/`. Keys are movement ids and pattern
 * names so the filename and the data can't drift apart silently — a test
 * checks every path here is present on disk.
 */

/** Art for a specific movement, keyed by movement id. */
export const MOVEMENT_IMAGES: Record<string, string> = {
  // Filled as art arrives, e.g. back_squat: '/movements/back-squat.webp'
}

/**
 * Art for a whole family, used by every movement in it without its own.
 *
 * Rim-lit and near-dark by design. Each one is a hold or a start position
 * rather than a rep at its extreme, so there is no joint angle on screen
 * for anyone to copy — which is what keeps a picture from becoming form
 * instruction. Hinge uses its kit shot until a figure exists for it.
 */
export const PATTERN_IMAGES: Partial<Record<MovementPattern, string>> = {
  squat: '/movements/figure-squat.webp',
  hinge: '/movements/kit-hinge.webp',
  single_leg: '/movements/figure-single-leg.webp',
  horizontal_push: '/movements/figure-horizontal-push.webp',
  vertical_push: '/movements/figure-vertical-push.webp',
  horizontal_pull: '/movements/figure-horizontal-pull.webp',
  vertical_pull: '/movements/figure-vertical-pull.webp',
  core: '/movements/figure-core.webp',
}

/**
 * The kit each family needs, for browsing.
 *
 * A quieter second set: no body at all, just what's waiting on the floor.
 * Used where someone is choosing rather than reading, so a list of eight
 * patterns doesn't turn into eight photographs of people.
 */
export const KIT_IMAGES: Partial<Record<MovementPattern, string>> = {
  squat: '/movements/kit-squat.webp',
  hinge: '/movements/kit-hinge.webp',
  single_leg: '/movements/kit-single-leg.webp',
  horizontal_push: '/movements/kit-horizontal-push.webp',
  horizontal_pull: '/movements/kit-horizontal-pull.webp',
  vertical_pull: '/movements/kit-vertical-pull.webp',
  core: '/movements/kit-core.webp',
  // vertical_push: still to generate — the picker falls back to the mark.
}

export interface MovementArt {
  src: string
  /** Whether this is the movement's own art or its family's. */
  scope: 'movement' | 'pattern'
}

export function artFor(movement: Movement): MovementArt | null {
  const own = MOVEMENT_IMAGES[movement.id]
  if (own) return { src: own, scope: 'movement' }
  const family = PATTERN_IMAGES[movement.pattern]
  if (family) return { src: family, scope: 'pattern' }
  return null
}

/**
 * What the picture is, said plainly.
 *
 * Alt text and caption both avoid the words "demonstration", "form" and
 * "how to" — because the picture is a still of the kit, and describing it
 * as a demonstration would be the app claiming to teach.
 */
export function artAlt(movement: Movement, art: MovementArt): string {
  return art.scope === 'movement'
    ? `${movement.name} — the equipment it uses`
    : `Equipment used for ${movement.equipment.join(', ')} work`
}
