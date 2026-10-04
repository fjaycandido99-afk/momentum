/**
 * How they asked Voxu to talk — Settings › Voxu Voice › Conversation.
 * Pure. Each preference becomes one instruction in the coach's prompt
 * (app/api/ai/journal-conversation). Crisis handling is appended after
 * these and always wins; "challenge me" never overrides kindness when
 * someone is struggling.
 */
export const COACH_PREFS = [
  { key: 'concise', title: 'Be more concise', line: 'Keep replies short — one or two sentences unless they ask for more.' },
  { key: 'challenge', title: 'Challenge me when I’m avoiding hard things', line: 'When they are avoiding something they said mattered, name it plainly and ask for one small step — direct, never harsh. If they are struggling, kindness comes first.' },
  { key: 'encourage', title: 'Encourage me when I’m struggling', line: 'When they are having a hard time, lead with encouragement from their own record before anything else.' },
  { key: 'simplify', title: 'Help me simplify and focus', line: 'When they list many things, help them choose the one that matters most today.' },
] as const

export type CoachPrefKey = (typeof COACH_PREFS)[number]['key']
const KEYS = new Set<string>(COACH_PREFS.map(p => p.key))

export function parseCoachPrefs(v: unknown): CoachPrefKey[] {
  if (!Array.isArray(v)) return []
  return [...new Set(v.filter((x): x is CoachPrefKey => typeof x === 'string' && KEYS.has(x)))]
}

/** The block added to the coach's system prompt, or '' with none chosen. */
export function coachPrefsPrompt(prefs: readonly string[] | null | undefined): string {
  const chosen = COACH_PREFS.filter(p => prefs?.includes(p.key))
  if (!chosen.length) return ''
  return `HOW THEY ASKED YOU TO TALK (their own settings):\n${chosen.map(p => `- ${p.line}`).join('\n')}`
}
