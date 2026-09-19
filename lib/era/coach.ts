import { getGroq } from '@/lib/groq'
import { buildMindsetSystemPrompt } from '@/lib/mindset/prompt-builder'
import { applyVoiceTone } from '@/lib/ai/voice-tone'
import type { MindsetId } from '@/lib/mindset/types'
import type { EraStats } from './logic'

/**
 * The coach's answer to a morning promise.
 *
 * The one thing it must do that generic motivation can't: remember. The
 * user's own day-1 words ("what are you trying to change") are handed back to
 * them on the days it lands hardest — day 1, every seventh day, the last day,
 * and the morning after a broken promise. On other days it stays short and
 * about today, because quoting someone to themselves daily turns a callback
 * into a tic.
 *
 * Everything numeric in the prompt comes from the DB. The model is told to
 * use only those numbers; an invented "you've kept 9 of 10" would be exactly
 * the fabricated progress that makes people stop trusting the app.
 */

export interface PromiseReplyInput {
  eraTitle: string
  day: number
  lengthDays: number
  change: string
  why: string | null
  promise: string
  stats: EraStats
  /** Yesterday's outcome, if there was a promise yesterday. */
  yesterday: 'kept' | 'broken' | 'unanswered' | null
  /** The era's own focus (lib/era/programs.ts). */
  coachFocus: string
  /** The stage's note on pitch (lib/era/logic.ts eraStage). */
  stageNote: string
  /** Today's mission, if the era has one. */
  mission: string | null
  /**
   * Premium memory. Without it the coach still remembers on day 1 and day 7
   * — enough to feel what being remembered is like — but on the other
   * callback days it answers today's promise only.
   */
  fullMemory: boolean
}

/** The days the coach should quote their day-1 words back to them. */
export function isCallbackDay(day: number, lengthDays: number, yesterday: PromiseReplyInput['yesterday']): boolean {
  return day === 1 || day % 7 === 0 || day === lengthDays || yesterday === 'broken'
}

/** The callback days a free user still gets: the first, and one week in. */
export const FREE_CALLBACK_DAYS = [1, 7] as const

/** Whether today's reply may quote day 1 back, given the tier. */
export function callbackAllowed(
  day: number,
  lengthDays: number,
  yesterday: PromiseReplyInput['yesterday'],
  fullMemory: boolean,
): boolean {
  if (!isCallbackDay(day, lengthDays, yesterday)) return false
  return fullMemory || (FREE_CALLBACK_DAYS as readonly number[]).includes(day)
}

/** A callback premium would have given today, withheld on free — the upsell moment. */
export function isMemoryLockedToday(
  day: number,
  lengthDays: number,
  yesterday: PromiseReplyInput['yesterday'],
  fullMemory: boolean,
): boolean {
  return isCallbackDay(day, lengthDays, yesterday) && !callbackAllowed(day, lengthDays, yesterday, fullMemory)
}

export function buildPromiseReplyMessages(
  input: PromiseReplyInput,
  mindset: MindsetId,
  tone: string | null,
): { system: string; user: string } {
  const callback = callbackAllowed(input.day, input.lengthDays, input.yesterday, input.fullMemory)
  // Free users' day-1 words only reach the model on the days it may use
  // them, so it can't quote them anyway on a day premium would have.
  const showDayOne = callback || input.fullMemory

  const base = `You are the user's coach in Voxu. They are in the middle of a ${input.lengthDays}-day commitment they named "${input.eraTitle}". Each morning they make one promise to themselves, and you answer it.

Rules:
- One or two sentences. At most 40 words.
- Second person. Talk to them, not about them.
- No "Great promise!", no emoji, no hashtags, no question at the end.
- Use ONLY the facts below. Never invent a number, a streak, or something they said.
- If the promise is vague, make it concrete for them in a few words rather than asking.
${callback
    ? '- Today, tie the promise back to what they told you on day 1, in their own words where it fits.'
    : "- Keep it about today's promise. Don't quote day 1 today."}
${input.yesterday === 'broken'
    ? "- They didn't keep yesterday's promise. Don't scold and don't excuse it. Today is the answer to yesterday."
    : ''}
- Output ONLY the reply text.

${input.coachFocus}
${input.stageNote}`

  const facts = [
    `Day ${input.day} of ${input.lengthDays}.`,
    input.mission ? `Today's suggested mission for this era: "${input.mission}"` : null,
    showDayOne ? `On day 1 they said they want to change: "${input.change}"` : null,
    showDayOne && input.why ? `And why it matters to them: "${input.why}"` : null,
    input.stats.answered > 0
      ? `Promises kept so far: ${input.stats.kept} of ${input.stats.answered} answered.`
      : 'No promises answered yet in this era.',
    input.yesterday === 'kept' ? 'They kept yesterday\'s promise.' : null,
    input.yesterday === 'broken' ? 'They did not keep yesterday\'s promise.' : null,
    `Today's promise: "${input.promise}"`,
  ].filter(Boolean).join('\n')

  return {
    system: applyVoiceTone(buildMindsetSystemPrompt(base, mindset), tone),
    user: facts,
  }
}

/**
 * The era, as the coach CHAT sees it — so "Talk to your coach" knows it's
 * talking to someone on day 9 of Locked In who promised X this morning.
 *
 * Not gated on the AI-memory consent: that consent is about the coach reading
 * the user's journal. The era and the promise were said TO the coach, for
 * coaching, so knowing them is the point rather than a privacy reach.
 */
export function formatEraChatBlock(input: {
  eraTitle: string
  day: number
  lengthDays: number
  change: string
  why: string | null
  stats: EraStats
  todayPromise: { text: string; kept: boolean | null } | null
  stageLabel?: string
  mission?: string | null
  coachFocus?: string
  /** Premium memory: the chat also knows their day-1 words. Defaults on. */
  fullMemory?: boolean
  /** One line on whether their Daily Read is moving with the era, if it can say. */
  alignment?: string | null
}): string {
  const dayOne = input.fullMemory !== false
  const lines = [
    `THE USER'S CURRENT ERA — a ${input.lengthDays}-day commitment they chose, called "${input.eraTitle}". Today is day ${input.day}${input.stageLabel ? ` (stage: ${input.stageLabel})` : ''}.`,
    input.coachFocus ?? null,
    input.mission ? `Today's mission for this era: "${input.mission}"` : null,
    dayOne ? `On day 1 they said they want to change: "${input.change}"` : null,
    dayOne && input.why ? `Why it matters to them: "${input.why}"` : null,
    input.stats.answered > 0
      ? `Promises kept so far: ${input.stats.kept} of ${input.stats.answered} answered.`
      : null,
    input.todayPromise
      ? `Today's promise: "${input.todayPromise.text}" — ${
          input.todayPromise.kept === null ? 'not checked in yet' : input.todayPromise.kept ? 'they kept it' : "they didn't keep it"
        }.`
      : 'They have not made a promise yet today.',
    input.alignment ? `Their Daily Read (self-reported, one question a day): ${input.alignment}` : null,
    'Bring this up only when it is relevant to what they are saying — not in every reply. Use only these facts; never invent a number.',
  ]
  return lines.filter(Boolean).join('\n')
}

export function fallbackPromiseReply(day: number): string {
  return day === 1
    ? "Day 1. You said it out loud — now it's real. Go keep it."
    : `Day ${day}. You made the promise. Now go keep it.`
}

export async function generatePromiseReply(
  input: PromiseReplyInput,
  mindset: MindsetId,
  tone: string | null,
  userId: string,
): Promise<string> {
  const { system, user } = buildPromiseReplyMessages(input, mindset, tone)
  try {
    const completion = await getGroq('era-promise', userId).chat.completions.create({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.7,
      max_tokens: 120,
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const cleaned = raw.replace(/^["“'`]+|["”'`]+$/g, '').trim()
    return cleaned || fallbackPromiseReply(input.day)
  } catch (err) {
    console.warn('[era] promise reply failed:', err)
    return fallbackPromiseReply(input.day)
  }
}

// ─── Era Recap ───────────────────────────────────────────────────────────────

export interface RecapInput {
  eraTitle: string
  lengthDays: number
  change: string
  why: string | null
  stats: EraStats
  /** Every promise in order: day number, text, outcome. */
  promises: { day: number; text: string; kept: boolean | null }[]
  /** Whether their Daily Read moved with the era, if there was enough to say. */
  alignment?: string | null
}

/**
 * The Era Recap: a letter from the coach about the finished era (premium).
 * It's the peak-and-end moment of the whole loop, so it has to be specific —
 * quoting real promises by day — and honest about the misses.
 */
export function buildRecapMessages(input: RecapInput, mindset: MindsetId, tone: string | null): { system: string; user: string } {
  const base = `You are the user's coach in Voxu. They just finished a ${input.lengthDays}-day era they named "${input.eraTitle}". Write them a short letter about it.

Rules:
- 130 to 180 words. Plain paragraphs, no headings, no lists, no emoji.
- Second person. Warm, direct, specific — this is about THEM, not about habits in general.
- Quote two or three of their actual promises by day ("On day 4 you promised…").
- Be honest about the days they didn't keep, without scolding. Name the pattern if there is one.
- Use ONLY the facts below. Never invent a promise, a number or a feeling they didn't state.
- End with one line about who they are now, and one about what comes next.
- Output ONLY the letter.`

  const lines = input.promises.map(p =>
    `Day ${p.day}: "${p.text.slice(0, 140)}" — ${p.kept === null ? 'not checked in' : p.kept ? 'kept' : 'not kept'}`,
  )
  const facts = [
    `On day 1 they said they wanted to change: "${input.change}"`,
    input.why ? `Why it mattered: "${input.why}"` : null,
    `Promises made: ${input.stats.made}. Answered: ${input.stats.answered}. Kept: ${input.stats.kept}.`,
    input.alignment ? `Their Daily Read over the era (self-reported, one question a day): ${input.alignment}` : null,
    'Their promises:',
    ...lines,
  ].filter(Boolean).join('\n')

  return { system: applyVoiceTone(buildMindsetSystemPrompt(base, mindset), tone), user: facts }
}

export async function generateRecap(input: RecapInput, mindset: MindsetId, tone: string | null, userId: string): Promise<string | null> {
  const { system, user } = buildRecapMessages(input, mindset, tone)
  try {
    const completion = await getGroq('era-recap', userId).chat.completions.create({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.7,
      max_tokens: 420,
    })
    const text = completion.choices[0]?.message?.content?.trim() || ''
    return text || null
  } catch (err) {
    console.warn('[era] recap failed:', err)
    return null
  }
}
