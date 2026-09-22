import type { Movement, MovementPattern, Region } from './library'

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

/**
 * Art for a specific movement, keyed by movement id.
 *
 * These are the movements a template can actually put in front of someone
 * — the short list from scripts/movement-art-todo.ts — which is why they're
 * the ones worth shooting. Anything else falls back to its family.
 */
export const MOVEMENT_IMAGES: Record<string, string> = {
  bodyweight_squat: '/movements/bodyweight-squat.webp',
  dumbbell_rdl: '/movements/dumbbell-rdl.webp',
  back_extension: '/movements/back-extension.webp',
  glute_bridge: '/movements/glute-bridge.webp',
  reverse_lunge: '/movements/reverse-lunge.webp',
  floor_press: '/movements/floor-press.webp',
  dip: '/movements/dip.webp',
  band_row: '/movements/band-row.webp',
  inverted_row: '/movements/inverted-row.webp',
  band_pulldown: '/movements/band-pulldown.webp',
  chin_up: '/movements/chin-up.webp',
  dumbbell_shoulder_press: '/movements/dumbbell-shoulder-press.webp',
  machine_shoulder_press: '/movements/machine-shoulder-press.webp',
  pike_push_up: '/movements/pike-push-up.webp',
  push_up: '/movements/push-up.webp',
  dead_bug: '/movements/dead-bug.webp',
  barbell_row: '/movements/barbell-row.webp',
  dumbbell_row: '/movements/dumbbell-row.webp',
  cable_row: '/movements/cable-row.webp',
  chest_supported_row: '/movements/chest-supported-row.webp',
  machine_chest_press: '/movements/machine-chest-press.webp',
  landmine_press: '/movements/landmine-press.webp',
  overhead_press: '/movements/overhead-press.webp',
  pull_up: '/movements/pull-up.webp',
  lat_pulldown: '/movements/lat-pulldown.webp',
  assisted_pull_up: '/movements/assisted-pull-up.webp',
  split_squat: '/movements/split-squat.webp',
  walking_lunge: '/movements/walking-lunge.webp',
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
  vertical_push: '/movements/kit-vertical-push.webp',
  vertical_pull: '/movements/kit-vertical-pull.webp',
  core: '/movements/kit-core.webp',
  carry: '/movements/kit-carry.webp',
  lateral_raise: '/movements/kit-lateral-raise.webp',
  elbow_flexion: '/movements/kit-elbow-flexion.webp',
  elbow_extension: '/movements/kit-elbow-extension.webp',
  knee_extension: '/movements/kit-knee-extension.webp',
  knee_flexion: '/movements/kit-knee-flexion.webp',
  calf: '/movements/kit-calf.webp',
}

/**
 * A figure with one region lit, for the "works" panel.
 *
 * The first attempt at this was hand-drawn SVG and looked like a broken
 * icon beside a photograph, so it's art like everything else here —
 * silhouette with the region glowing, front or back as the region needs.
 *
 * Still only a LOCATION. No percentages, no primary-versus-secondary, no
 * heat map: every region is lit the same way, because how much each one
 * does varies by person and by load and the app knows neither. A region
 * without art falls back to its name in words, which is never wrong.
 */
export const REGION_IMAGES: Partial<Record<Region, string>> = {
  // e.g. quads: '/movements/region-quads.webp'
}

export function regionArt(region: Region): string | null {
  return REGION_IMAGES[region] ?? null
}

/** True when every region of a movement has art, so the panel is even. */
export function hasFullRegionArt(regions: Region[]): boolean {
  return regions.length > 0 && regions.every(r => REGION_IMAGES[r])
}

export interface MovementArt {
  src: string
  /** Whether this is the movement's own art or its family's. */
  scope: 'movement' | 'pattern'
}

/**
 * Only the movement's OWN art, never its family's.
 *
 * For anywhere several movements are shown side by side. The family
 * fallback is right for a hero — one screen, one picture — but in a grid of
 * six squat variations it renders the same photograph six times, which
 * reads as broken. A mark repeated is a pattern; a photograph repeated is
 * a mistake.
 */
export function ownArt(movement: Movement): MovementArt | null {
  const own = MOVEMENT_IMAGES[movement.id]
  return own ? { src: own, scope: 'movement' } : null
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
