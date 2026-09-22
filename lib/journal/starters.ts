import { MINDSET_DAILY_QUESTIONS } from '@/lib/mindset/daily-questions'
import type { MindsetId } from '@/lib/mindset/types'

/**
 * Today's questions, for whichever surface is asking.
 *
 * The same four questions appear on the Free tab, where tapping one starts a
 * written entry, and in Chat, where tapping one has the coach ask it. They
 * are picked here so the two surfaces can never show different questions on
 * the same day — which is exactly what would have happened if Chat had got
 * its own copy of this.
 *
 * Deterministic per day: the same person opening the app twice on a Tuesday
 * sees the same questions, because a prompt that reshuffles while you are
 * deciding whether to answer it is a prompt nobody answers.
 *
 * Pure.
 */

export const GENERIC_STARTERS = [
  '3 things I’m grateful for',
  'Today I noticed...',
  'A moment that mattered',
  'What’s on my mind right now',
] as const

/** Date-seeded index, so the pick is stable for a whole local day. */
export function dateSeedIndex(length: number, date = new Date()): number {
  if (length <= 0) return 0
  const seed =
    date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
  return seed % length
}

/**
 * Two of the mindset's own questions, then generic ones to fill to four.
 *
 * Mindset first because they are the ones that sound like this person's era
 * rather than like a journalling app.
 */
export function dailyStarters(
  mindsetId: MindsetId | undefined,
  date = new Date(),
): string[] {
  const questions = MINDSET_DAILY_QUESTIONS[mindsetId || 'stoic'] || []
  const picked: string[] = []

  if (questions.length >= 2) {
    const i = dateSeedIndex(questions.length, date)
    picked.push(questions[i])
    picked.push(questions[(i + 1) % questions.length])
  } else if (questions.length === 1) {
    picked.push(questions[0])
  }

  const g = dateSeedIndex(GENERIC_STARTERS.length, date)
  for (let i = 0; picked.length < 4 && i < GENERIC_STARTERS.length; i++) {
    const chip = GENERIC_STARTERS[(g + i) % GENERIC_STARTERS.length]
    if (!picked.includes(chip)) picked.push(chip)
  }

  return picked.slice(0, 4)
}

/**
 * The ones worth handing to the coach rather than to a blank page.
 *
 * A question can start a conversation. "3 things I'm grateful for" cannot —
 * it is a list, and a coach asking for one and then responding to it is a
 * form, not a conversation. So the openers are the questions: anything that
 * ends in a question mark, plus the era's own prompt when there is one.
 */
export function isConversational(starter: string): boolean {
  return starter.trim().endsWith('?')
}

export function chatStarters(
  mindsetId: MindsetId | undefined,
  eraPrompt?: string | null,
  date = new Date(),
): string[] {
  const questions = dailyStarters(mindsetId, date).filter(isConversational)
  // The era prompt leads: it is the only one that knows what day of what
  // era this is, so it is the most specific thing anyone could be asked.
  return eraPrompt ? [eraPrompt, ...questions] : questions
}
