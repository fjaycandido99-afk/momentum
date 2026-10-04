/**
 * Settings › Mindset & Coaching — how Voxu coaches THIS person. Pure.
 *
 * Every choice is one instruction in the coach's prompts:
 *   - Talk + the journal (app/api/ai/journal-conversation) get all of it
 *   - the daily promise reply (lib/era/coach) gets intensity, length,
 *     callout and the two situations it can see: a missed day, a kept one
 * Crisis handling is appended AFTER these everywhere and always wins; no
 * setting here makes Voxu harsh with someone who is struggling.
 *
 * Replaces the four Voxu Voice switches (coach_prefs) — those carry over
 * through normalizeStyle, so nobody's choice is lost.
 */

export type Intensity = 'gentle' | 'balanced' | 'hard'
export type Length = 'short' | 'normal'

export const INTENSITIES: { key: Intensity; title: string; line: string; prompt: string }[] = [
  { key: 'gentle', title: 'Gentle', line: 'Supportive first', prompt: 'Lead with support. Encourage more than you push.' },
  { key: 'balanced', title: 'Balanced', line: 'Supportive, but direct', prompt: 'Be supportive, but say the true thing plainly when it matters.' },
  { key: 'hard', title: 'Hard', line: 'Challenge the excuses', prompt: 'Push them. Hold a high standard and challenge excuses — firm, never cruel.' },
]

export interface Situation {
  key: 'procrastinating' | 'overwhelmed' | 'missed' | 'doubting' | 'doing_well'
  title: string
  options: { key: string; label: string; prompt: string }[]
  fallback: string
}

export const SITUATIONS: Situation[] = [
  {
    key: 'procrastinating', title: 'I’m procrastinating', fallback: 'start_small',
    options: [
      { key: 'challenge', label: 'Challenge me', prompt: 'When they are putting off something that matters: name it plainly and ask for one step now.' },
      { key: 'start_small', label: 'Help me start small', prompt: 'When they are putting something off: shrink it to a first step of two minutes or less.' },
      { key: 'gentle', label: 'Go easy on me', prompt: 'When they are putting something off: be understanding, then offer one small way back in.' },
    ],
  },
  {
    key: 'overwhelmed', title: 'I’m overwhelmed', fallback: 'simplify',
    options: [
      { key: 'simplify', label: 'Help me simplify', prompt: 'When they are overwhelmed: help them pick the ONE thing that matters most today and set the rest aside.' },
      { key: 'steps', label: 'Break it into steps', prompt: 'When they are overwhelmed: break the biggest thing into three small, ordered steps.' },
      { key: 'listen', label: 'Just listen', prompt: 'When they are overwhelmed: listen first. Reflect what they said back; don’t fix it unless they ask.' },
    ],
  },
  {
    key: 'missed', title: 'I miss a day', fallback: 'moving',
    options: [
      { key: 'moving', label: 'Get me moving again', prompt: 'When they missed a day: don’t dwell on it. Point straight at today’s promise.' },
      { key: 'easy', label: 'Go easy on me', prompt: 'When they missed a day: be kind about it, then invite them back with a smaller promise.' },
      { key: 'why', label: 'Help me see why', prompt: 'When they missed a day: help them name what got in the way, briefly, so today goes differently.' },
    ],
  },
  {
    key: 'doubting', title: 'I’m doubting myself', fallback: 'proven',
    options: [
      { key: 'proven', label: 'Remind me what I’ve proven', prompt: 'When they doubt themselves: point to what their own record shows they have already done — only facts you were given.' },
      { key: 'encourage', label: 'Encourage me', prompt: 'When they doubt themselves: encourage them warmly and plainly.' },
      { key: 'straight', label: 'Be straight with me', prompt: 'When they doubt themselves: be honest and grounded — no hype, no false comfort.' },
    ],
  },
  {
    key: 'doing_well', title: 'I’m doing well', fallback: 'raise',
    options: [
      { key: 'raise', label: 'Raise the standard', prompt: 'When they are doing well: acknowledge it in a few words, then raise the bar a little.' },
      { key: 'celebrate', label: 'Celebrate it', prompt: 'When they are doing well: let them have it — name what they did and that it counts.' },
      { key: 'steady', label: 'Keep it steady', prompt: 'When they are doing well: keep it calm and consistent; protect the streak, don’t add pressure.' },
    ],
  },
]

export interface CoachStyle {
  intensity: Intensity
  length: Length
  callout: boolean
  responses: Record<Situation['key'], string>
}

export function defaultStyle(): CoachStyle {
  return {
    intensity: 'balanced',
    length: 'normal',
    callout: false,
    responses: Object.fromEntries(SITUATIONS.map(s => [s.key, s.fallback])) as CoachStyle['responses'],
  }
}

/** Whatever is stored (or nothing) → a complete, valid style. Legacy Voxu
 *  Voice switches (coach_prefs) seed it when no style was ever saved. */
export function normalizeStyle(raw: unknown, legacy?: readonly string[] | null): CoachStyle {
  const out = defaultStyle()
  const r = (raw && typeof raw === 'object' ? raw : null) as Partial<CoachStyle> | null
  if (!r) {
    if (legacy?.includes('concise')) out.length = 'short'
    if (legacy?.includes('challenge')) out.responses.procrastinating = 'challenge'
    if (legacy?.includes('encourage')) out.responses.doubting = 'encourage'
    if (legacy?.includes('simplify')) out.responses.overwhelmed = 'simplify'
    return out
  }
  if (INTENSITIES.some(i => i.key === r.intensity)) out.intensity = r.intensity as Intensity
  if (r.length === 'short' || r.length === 'normal') out.length = r.length
  if (typeof r.callout === 'boolean') out.callout = r.callout
  const resp = (r.responses && typeof r.responses === 'object' ? r.responses : {}) as Record<string, unknown>
  for (const s of SITUATIONS) {
    const v = resp[s.key]
    if (typeof v === 'string' && s.options.some(o => o.key === v)) out.responses[s.key] = v
  }
  return out
}

const pick = (s: Situation, style: CoachStyle) => s.options.find(o => o.key === style.responses[s.key]) ?? s.options[0]

const CALLOUT = 'When they make an excuse, call it out — kindly but plainly — and ask what they will do instead.'
const SHORT = 'Keep replies short: one or two sentences unless they ask for more.'

/** The full block for Talk + the journal. */
export function coachStylePrompt(style: CoachStyle): string {
  const lines = [
    INTENSITIES.find(i => i.key === style.intensity)!.prompt,
    style.length === 'short' ? SHORT : null,
    style.callout ? CALLOUT : null,
    ...SITUATIONS.map(s => pick(s, style).prompt),
    'If they are ever in real distress, set all of this aside and look after them.',
  ].filter(Boolean)
  return `HOW THEY ASKED TO BE COACHED (their own settings):\n${lines.map(l => `- ${l}`).join('\n')}`
}

/** The lines the daily promise reply can act on (it sees yesterday). */
export function promiseStyleNote(style: CoachStyle, yesterday: 'kept' | 'broken' | 'unanswered' | null): string {
  const lines = [
    INTENSITIES.find(i => i.key === style.intensity)!.prompt,
    style.callout ? CALLOUT : null,
    yesterday === 'broken' ? pick(SITUATIONS[2], style).prompt : null,
    yesterday === 'kept' ? pick(SITUATIONS[4], style).prompt : null,
  ].filter(Boolean)
  return `How they asked to be coached: ${lines.join(' ')}`
}
