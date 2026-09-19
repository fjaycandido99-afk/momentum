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
}

/** The days the coach should quote their day-1 words back to them. */
export function isCallbackDay(day: number, lengthDays: number, yesterday: PromiseReplyInput['yesterday']): boolean {
  return day === 1 || day % 7 === 0 || day === lengthDays || yesterday === 'broken'
}

export function buildPromiseReplyMessages(
  input: PromiseReplyInput,
  mindset: MindsetId,
  tone: string | null,
): { system: string; user: string } {
  const callback = isCallbackDay(input.day, input.lengthDays, input.yesterday)

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
- Output ONLY the reply text.`

  const facts = [
    `Day ${input.day} of ${input.lengthDays}.`,
    `On day 1 they said they want to change: "${input.change}"`,
    input.why ? `And why it matters to them: "${input.why}"` : null,
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
