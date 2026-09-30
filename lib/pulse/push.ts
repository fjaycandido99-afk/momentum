/**
 * "Talk me into it" — the short spoken push for a discipline you don't feel
 * like starting.
 *
 * ── WHY FIXED LINES, NOT AI-WRITTEN ─────────────────────────────────
 *
 * Every spoken line costs ElevenLabs characters. These scripts are fixed
 * per kind of discipline, filled with the day's minimum, and carry NO name
 * or anything personal — so the same words ("…Your minimum today is 30
 * minutes…") are identical for everyone who has that minimum, and
 * /api/ai/chat-voice caches audio by its text. The first person pays;
 * everyone after plays the cache, which also doesn't count against their
 * daily spoken-reply allowance. Written once, spoken in Voxu's voice.
 *
 * ── RULES FOR THE WORDS ─────────────────────────────────────────────
 *
 * - The ask is the MINIMUM, never the full session. Starting is the goal.
 * - One physical first step. Then "decide after that" — permission to stop
 *   is what makes starting possible.
 * - No guilt, no streak talk, no "you missed". Under ~350 characters.
 *
 * Pure.
 */

export type PushDomain = 'gym' | 'run' | 'read' | 'study' | 'work' | 'mind' | 'custom'

const FIRST_STEP: Record<PushDomain, string> = {
  gym: 'Get dressed, get there, and do the first movement.',
  run: 'Shoes on. Out the door. The first minute is the whole fight.',
  read: 'Open the book to where you stopped. Read the first page.',
  study: 'One subject, one timer. Start with the easiest part.',
  work: 'Close everything else. Start the smallest piece of it.',
  mind: 'Sit down. Close your eyes. Just the first breath.',
  custom: 'Do the smallest first step of it. Nothing more yet.',
}

export function isPushDomain(d: unknown): d is PushDomain {
  return typeof d === 'string' && d in FIRST_STEP
}

/**
 * The script. `minimum` is the day's floor as the person wrote it
 * ("30 minutes", "10 pages"); empty means they never set one.
 */
export function startScript(domain: string | null | undefined, minimum: string | null | undefined): string {
  const d: PushDomain = isPushDomain(domain) ? domain : 'custom'
  const floor = (minimum ?? '').trim().replace(/[.\s]+$/, '')
  const ask = floor ? `Your minimum today is ${floor}. That's all this is.` : 'The smallest version counts.'
  return `You don't need to want it. ${ask} ${FIRST_STEP[d]} Decide after that.`
}
