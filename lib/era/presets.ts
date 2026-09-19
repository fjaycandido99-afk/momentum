/**
 * The eras a user can pick from, plus "custom".
 *
 * An era is WHAT someone is working on; the mindset (lib/mindset) is HOW the
 * coach talks to them. They are deliberately separate lists — a Hustler coach
 * can run someone's Study Era — so an era never carries its own voice or
 * personality. Adding a third identity system is what the Daily Read had to
 * undo; keep this one about the goal.
 *
 * Keys are stored on Era rows and will key trending counts later, so never
 * rename one. Retire it by removing it from ERA_PRESETS; old rows keep their
 * own `title`, so they still render.
 */

export interface EraPreset {
  key: string
  title: string
  /** One line under the title on the picker. */
  tagline: string
  /** Placeholder for the day-1 "what are you trying to change" question. */
  changeHint: string
  /** Placeholder for the daily promise — an example, never pre-filled. */
  promiseHint: string
}

export const CUSTOM_ERA_KEY = 'custom'

export const ERA_PRESETS: EraPreset[] = [
  {
    key: 'locked_in',
    title: 'Locked In',
    tagline: 'Stop drifting. Do the work that matters.',
    changeHint: 'I keep putting off the one thing that would change everything.',
    promiseHint: "I'll finish the thing I've been avoiding before lunch.",
  },
  {
    key: 'discipline',
    title: 'Discipline Era',
    tagline: "Do it when you don't feel like it.",
    changeHint: 'I only follow through when I feel motivated.',
    promiseHint: "I'll do my workout even if I'm tired.",
  },
  {
    key: 'comeback',
    title: 'Comeback Season',
    tagline: 'Rebuild after a hard stretch.',
    changeHint: "I lost my rhythm and I want it back.",
    promiseHint: "I'll take one real step back toward where I was.",
  },
  {
    key: 'gym_arc',
    title: 'Gym Arc',
    tagline: 'Show up for your body, every day.',
    changeHint: 'I keep starting and stopping at the gym.',
    promiseHint: "I'll train today, even if it's a short session.",
  },
  {
    key: 'stoic_mode',
    title: 'Stoic Mode',
    tagline: 'Control what you can. Let go of the rest.',
    changeHint: "I let things I can't control ruin my day.",
    promiseHint: "I won't react to something I can't control.",
  },
  {
    key: 'confidence',
    title: 'Confidence Mode',
    tagline: 'Speak up. Take up space.',
    changeHint: 'I hold back when I should speak up.',
    promiseHint: "I'll say the thing I'd usually keep to myself.",
  },
  {
    key: 'study',
    title: 'Study Era',
    tagline: 'Deep work, every single day.',
    changeHint: 'I study in distracted bursts and forget it all.',
    promiseHint: "I'll do two focused hours before I check my phone.",
  },
  {
    key: 'five_am',
    title: '5AM Era',
    tagline: 'Own the morning before the world wakes up.',
    changeHint: 'I waste my mornings and start every day behind.',
    promiseHint: "I'll be up at 5 and off my phone for the first 30 minutes.",
  },
]

export const ERA_PRESETS_BY_KEY = new Map(ERA_PRESETS.map(p => [p.key, p]))

export const DEFAULT_ERA_LENGTH_DAYS = 30

/** Text limits, shared by the API validation and the inputs' maxLength. */
export const ERA_LIMITS = {
  title: 40,
  change: 280,
  why: 280,
  promise: 240,
} as const

/**
 * "Locked In" → "Locked In era", but "Study Era" stays "Study Era" — three
 * presets already end in Era, and "my Study Era era" read like a typo on
 * the share card, the join page and home.
 */
export function eraName(title: string): string {
  const t = title.trim()
  return /(^|\s)era$/i.test(t) ? t : `${t} era`
}
