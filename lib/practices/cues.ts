import type { PracticeDomain } from './presets'

/**
 * What to actually do today, per practice — as far as Voxu can honestly say.
 *
 * There are three different answers here, and conflating them is how a
 * mindset app ends up giving bad advice:
 *
 * 1. WHICH SESSION OF YOUR OWN SPLIT IT IS. "Today is Pull" is arithmetic on
 *    a rotation the user picked, not programming: Push/Pull/Legs is the
 *    preset's own name. Safe, useful, and it's what the preset promised.
 *
 * 2. A VOXU SESSION THAT FITS. For the mind and focus practices, the app has
 *    the content — a 60-second reset, a 20-minute sprint — so it can name a
 *    specific one and run it. Also safe: it's ours.
 *
 * 3. SETS, REPS, WEIGHTS, BOOK TITLES. Not here, and not planned. Telling
 *    someone what to lift without knowing their injuries, equipment or
 *    experience is how people get hurt, and it is a different product with
 *    apps built for it. Recommending books nobody asked about is noise.
 *
 * So: the rotation and the Voxu session. Nothing invented.
 */

/**
 * Rotations that come from the preset's own name. Nothing is added here
 * that the user didn't already choose by picking that split — a five-day
 * split and a powerlifting week have no single agreed rotation, so they
 * get no cue rather than a guess.
 */
export const SPLIT_ROTATIONS: Record<string, string[]> = {
  gym_ppl: ['Push', 'Pull', 'Legs'],
  gym_upper_lower: ['Upper', 'Lower'],
  gym_full_body_3: ['Full body'],
}

/**
 * Which session of the split comes next.
 *
 * Counted in SESSIONS KEPT, not calendar days: miss Monday's push and
 * Wednesday is still push. That is how anyone actually runs a split, and
 * advancing the rotation on a day they didn't train would punish the miss
 * twice.
 */
export function rotationCue(presetKey: string, sessionsKept: number): string | null {
  const rotation = SPLIT_ROTATIONS[presetKey]
  if (!rotation || rotation.length === 0) return null
  const index = Math.max(0, Math.floor(sessionsKept)) % rotation.length
  return rotation[index]
}

/**
 * A Voxu session that fits the practice — by domain, because this is about
 * what the app has, not about the specific preset.
 *
 * Reading and training get nothing: Voxu has no books and does not write
 * training programmes, and a suggestion it can't stand behind is worse than
 * silence.
 */
export const DOMAIN_SESSION: Partial<Record<PracticeDomain, string>> = {
  mind: 'breathing_reset_60',
  study: 'focus_reset_5',
  work: 'sprint_20',
}

export function sessionForDomain(domain: PracticeDomain | string): string | null {
  return DOMAIN_SESSION[domain as PracticeDomain] ?? null
}
