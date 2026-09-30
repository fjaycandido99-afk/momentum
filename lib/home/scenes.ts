import type { DayPhase, PhaseScene } from './time-of-day'

/**
 * Home's scene photographs — one per card, drawn behind its content and
 * faded into the card so text always reads against dark.
 *
 * Every path is optional in practice: <SceneImage> hides itself when a file
 * is missing, so a card with no photo yet looks exactly like the plain card.
 * Adding the file is the whole job — no code change.
 *
 * Art rules (lib/illustrations lessons): no text in the image, dark and
 * low-key, subject on the RIGHT (the left is where the words go), and never a
 * painted checkerboard — these are full-bleed photographs, not cut-outs.
 */
export const HOME_SCENES = {
  /** Today's mission: a desk, an open notebook, a lamp. */
  mission: '/scenes/home/mission.jpg',
  /** Today's promise: mountains at last light. */
  promise: '/scenes/home/promise.jpg',
  /** Today's audio / training: a desk clock and a cup in blue night light. */
  training: '/scenes/home/training.jpg',
  /** Your circle: silhouettes standing together on a ridge. */
  circle: '/scenes/home/circle.jpg',
} as const

/**
 * The Guided player's room: a shaft of light in a dark stone space, a lantern
 * glowing low on the right. Tall + wide, like every backdrop. null = not made
 * yet; the player falls back to plain black.
 */
export const GUIDED_SCENE: { tall: string | null; wide: string | null } = {
  tall: null,
  wide: null,
}

/**
 * The page backdrop and the greeting's figure, by time of day
 * (lib/home/time-of-day). Every backdrop needs a TALL photo (phones, iPad
 * portrait) and a WIDE one (iPad landscape — the tall one goes soft there).
 * null = not made yet; sceneFor() lends sunset's until it is.
 */
export const PHASE_SCENES: Record<DayPhase, PhaseScene> = {
  sunrise: {
    tall: '/scenes/home/sunrise-tall.jpg',
    wide: '/scenes/home/sunrise-wide.jpg',
    hero: '/scenes/home/sunrise-hero.jpg',
  },
  sunset: {
    tall: '/scenes/home/backdrop.jpg',
    wide: '/scenes/home/backdrop-wide.jpg',
    hero: '/scenes/home/hero.jpg',
  },
  night: {
    tall: '/scenes/home/night-tall.jpg',
    wide: '/scenes/home/night-wide.jpg',
    hero: '/scenes/home/night-hero.jpg',
  },
}

/**
 * Right now's four cards (app/(dashboard)/reset): one photograph each, faded
 * in from the right behind the words. Same art rules as Home's cards. A
 * missing file shows the plain card, so these light up as they're added.
 */
export const RESET_SCENES: Record<'overwhelmed' | 'unfocused' | 'wired' | 'sleepless', string> = {
  /** A storm cloud with red light breaking through it. */
  overwhelmed: '/scenes/reset/overwhelmed.jpg',
  /** A head in profile, lit by one cold shaft of light. */
  unfocused: '/scenes/reset/unfocused.jpg',
  /** A still lake under mountains at last light. */
  wired: '/scenes/reset/wired.jpg',
  /** Rumpled pillows in blue night light. */
  sleepless: '/scenes/reset/sleepless.jpg',
}
