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

/** Art for a whole family, used by every movement in it without its own. */
export const PATTERN_IMAGES: Partial<Record<MovementPattern, string>> = {
  // e.g. squat: '/movements/pattern-squat.webp'
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
