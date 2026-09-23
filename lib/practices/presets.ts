/**
 * Practices — the disciplines someone already cares about, which Voxu keeps
 * them consistent with.
 *
 * The point is that Voxu does NOT become a gym app, a reading app and a
 * study app. It never stores a set, a rep, a page number or a route: it
 * stores the cadence (which days) and the MINIMUM acceptable session, then
 * asks whether that happened. The minimum is the whole mechanism — "you said
 * thirty minutes, so don't negotiate, just start the thirty" is what stops a
 * tired day becoming a skipped one.
 *
 * What is deliberately not here: anything that implies a programme we don't
 * provide. No Couch-to-5K, no marathon plan, no exam schedule, no "1 book a
 * month" — offering those would promise structure Voxu has not written. A
 * preset is a schedule and a floor, nothing more.
 *
 * KEYS are stored on Practice rows. Never rename one.
 */

export type PracticeDomain = 'gym' | 'run' | 'read' | 'study' | 'work' | 'mind' | 'custom'

export interface PracticePreset {
  key: string
  domain: PracticeDomain
  /** What the practice is called, before they rename it. */
  label: string
  /** Weekdays it's expected, 0 = Sunday. Empty means every day. */
  days: number[]
  /** The default floor, in their language. Always editable. */
  minimum: string
  /** One line under the option in the picker. */
  hint: string
}

export const DOMAINS: { id: PracticeDomain; label: string }[] = [
  { id: 'gym', label: 'Training' },
  { id: 'run', label: 'Running' },
  { id: 'read', label: 'Reading' },
  { id: 'study', label: 'Study' },
  { id: 'work', label: 'Work' },
  { id: 'mind', label: 'Mind' },
  { id: 'custom', label: 'Something else' },
]

const MON_TUE_THU_FRI = [1, 2, 4, 5]
const WEEKDAYS = [1, 2, 3, 4, 5]
const EVERY_DAY: number[] = []

export const PRACTICE_PRESETS: PracticePreset[] = [
  // Training
  {
    key: 'gym_ppl',
    domain: 'gym',
    label: 'Gym — Push / Pull / Legs',
    days: MON_TUE_THU_FRI,
    minimum: '30 minutes',
    hint: 'Four days, rotating. Voxu tells you which day it is.',
  },
  {
    key: 'gym_upper_lower',
    domain: 'gym',
    label: 'Gym — Upper / Lower',
    days: MON_TUE_THU_FRI,
    minimum: '30 minutes',
    hint: 'Four days, alternating upper and lower.',
  },
  {
    key: 'gym_full_body_3',
    domain: 'gym',
    label: 'Gym — Full body, 3×',
    days: [1, 3, 5],
    minimum: '40 minutes',
    hint: 'Monday, Wednesday, Friday.',
  },
  {
    key: 'gym_five_day',
    domain: 'gym',
    label: 'Gym — 5 days',
    days: WEEKDAYS,
    minimum: '45 minutes',
    hint: 'Weekdays in, weekends off.',
  },
  {
    key: 'gym_powerlifting',
    domain: 'gym',
    label: 'Lifting — 4 days',
    days: MON_TUE_THU_FRI,
    minimum: 'the main lift',
    hint: 'If nothing else happens, the main lift happens.',
  },
  {
    key: 'gym_calisthenics',
    domain: 'gym',
    label: 'Calisthenics',
    days: [1, 3, 5, 6],
    minimum: '20 minutes',
    hint: 'Bodyweight, four days a week.',
  },
  // Running
  {
    key: 'run_three',
    domain: 'run',
    label: 'Run 3× a week',
    days: [2, 4, 6],
    minimum: '15 minutes',
    hint: 'Tuesday, Thursday, Saturday.',
  },
  {
    key: 'run_most_days',
    domain: 'run',
    label: 'Run most days',
    days: [1, 2, 3, 4, 5, 6],
    minimum: '10 minutes',
    hint: 'Six days, one rest day.',
  },
  {
    key: 'run_long_weekly',
    domain: 'run',
    label: 'One long run a week',
    days: [0],
    minimum: '40 minutes',
    hint: 'Sundays. The one that matters.',
  },
  // Reading
  {
    key: 'read_pages',
    domain: 'read',
    label: 'Read 10 pages a day',
    days: EVERY_DAY,
    minimum: '10 pages',
    hint: 'Every day, however short.',
  },
  {
    key: 'read_minutes',
    domain: 'read',
    label: 'Read 30 minutes a day',
    days: EVERY_DAY,
    minimum: '30 minutes',
    hint: 'Time instead of pages.',
  },
  {
    key: 'read_weekdays',
    domain: 'read',
    label: 'Read on weekdays',
    days: WEEKDAYS,
    minimum: '15 minutes',
    hint: 'Weekends off, no guilt.',
  },
  // Study
  {
    key: 'study_hour',
    domain: 'study',
    label: 'One focused hour',
    days: WEEKDAYS,
    minimum: '25 minutes',
    hint: 'An hour is the aim; 25 minutes still counts.',
  },
  {
    key: 'study_before_phone',
    domain: 'study',
    label: 'Two hours before the phone',
    days: WEEKDAYS,
    minimum: '45 minutes',
    hint: 'Study first, phone after.',
  },
  {
    key: 'study_weekend',
    domain: 'study',
    label: 'Weekend catch-up',
    days: [0, 6],
    minimum: '1 hour',
    hint: 'Saturday and Sunday only.',
  },
  // Work
  {
    key: 'work_deep',
    domain: 'work',
    label: 'Two hours of deep work',
    days: WEEKDAYS,
    minimum: '45 minutes',
    hint: 'Uninterrupted, on the thing that matters.',
  },
  {
    key: 'work_post',
    domain: 'work',
    label: 'Post 3× a week',
    days: [1, 3, 5],
    minimum: 'one post',
    hint: 'Published, not drafted.',
  },
  {
    key: 'work_outreach',
    domain: 'work',
    label: 'One outreach a day',
    days: WEEKDAYS,
    minimum: 'one message',
    hint: 'One real message to one real person.',
  },
  {
    key: 'work_ship_weekly',
    domain: 'work',
    label: 'Ship something weekly',
    days: [5],
    minimum: 'one thing shipped',
    hint: 'Fridays. Out the door, not nearly done.',
  },
  // Mind
  {
    key: 'mind_five',
    domain: 'mind',
    label: '5 minutes a day',
    days: EVERY_DAY,
    minimum: '5 minutes',
    hint: 'Sitting still, every day.',
  },
  {
    key: 'mind_morning_ten',
    domain: 'mind',
    label: '10 minutes each morning',
    days: EVERY_DAY,
    minimum: '5 minutes',
    hint: 'Before the day starts.',
  },
  // Custom
  {
    key: 'custom',
    domain: 'custom',
    label: 'Something else',
    days: EVERY_DAY,
    minimum: '',
    hint: 'Name it yourself, and say what the minimum is.',
  },
  /**
   * "Something else" INSIDE each domain.
   *
   * There was only the one above, and it belongs to the `custom` domain — so
   * somebody who reads but wanted their own wording had to pick "Something
   * else" at the first step and lost the domain entirely. The cost was not
   * just the missing "Find this book": the domain drives the plan wording
   * (PLAN_COPY asks "What are you reading?") and the how-to guide, so a
   * custom reading habit was asked the generic question and offered the
   * generic advice.
   *
   * Generated rather than written out six times. The keys are stable and,
   * like every key here, never renamed.
   */
  ...(['gym', 'run', 'read', 'study', 'work', 'mind'] as const).map(domain => ({
    key: `${domain}_custom`,
    domain,
    label: 'Something else',
    days: EVERY_DAY,
    minimum: '',
    hint: 'Name it yourself, and say what the minimum is.',
  })),
]

export const PRESETS_BY_KEY = new Map(PRACTICE_PRESETS.map(p => [p.key, p]))

export const CUSTOM_PRACTICE_KEY = 'custom'

/**
 * Is this the "Something else" preset, whichever domain's it is?
 *
 * Callers used to test `key === 'custom'` to decide whether to blank the
 * label and show a "name it yourself" placeholder. With a custom preset per
 * domain, that check would silently stop working for five of the seven —
 * prefilling "Something else" as somebody's habit name.
 */
export function isCustomPreset(key: string): boolean {
  return key === CUSTOM_PRACTICE_KEY || key.endsWith('_custom')
}

export function presetsForDomain(domain: PracticeDomain): PracticePreset[] {
  return PRACTICE_PRESETS.filter(p => p.domain === domain)
}

/**
 * Three at once, and no more.
 *
 * Two reasons, and both matter: three things to keep in a day is already a
 * lot, and thin data says nothing — the cross-practice patterns everyone
 * wants ("you read less after late training") need enough days per case to
 * clear a significance test, and five practices splits a month into
 * nothing.
 */
export const MAX_PRACTICES = 3

/** Field limits, shared by the API validation and the inputs. */
export const PRACTICE_LIMITS = {
  label: 40,
  minimum: 40,
} as const
