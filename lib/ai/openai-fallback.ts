/**
 * OpenAI as a last resort when Groq cannot serve at all.
 *
 * Groq was a single point of failure for every intelligent thing in this
 * app — all 12 AI features plus Whisper transcription — and when the
 * account lost model access on 2026-08-16 the whole lot degraded to
 * canned text for seventeen days. One provider, no second opinion.
 *
 * IMPORTANT, because it is a common and expensive misunderstanding:
 * a ChatGPT Plus/Pro subscription does NOT pay for this. chatgpt.com and
 * platform.openai.com are separate products with separate balances. A key
 * from an account with no API credit returns 429 insufficient_quota, and
 * this file will simply stay dormant — which is the correct behaviour,
 * not a bug.
 *
 * COST. OpenAI is far more expensive per token than Groq, so this is
 * insurance, not a second home. Two guards:
 *   - it only runs after every Groq rung has failed;
 *   - a daily ceiling counted from AiCallLog, so an unnoticed Groq outage
 *     cannot quietly become an unbounded bill. Today's whole lesson is
 *     that silent degradation is what costs you.
 */

import { prisma } from '@/lib/prisma'

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

/** Calls per day across ALL users before the fallback stops firing. */
const DAILY_MAX = Number(process.env.OPENAI_FALLBACK_DAILY_MAX ?? 200)

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const TIMEOUT_MS = 20_000

/** Marks a row in AiCallLog so the ceiling can be counted and spotted. */
export const OPENAI_LOG_PREFIX = 'openai:'

export interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenAiResult {
  ok: boolean
  content?: string
  usage?: { prompt_tokens?: number; completion_tokens?: number }
  error?: string
}

export function isOpenAiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY
}

/**
 * How many fallback calls have already gone out today. Counted from the
 * telemetry we already write, so this needs no extra table.
 */
async function usedToday(): Promise<number> {
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  try {
    return await prisma.aiCallLog.count({
      where: { created_at: { gte: since }, model: { startsWith: OPENAI_LOG_PREFIX } },
    })
  } catch {
    // If we cannot read the counter, assume the ceiling is reached. Failing
    // closed on a spend guard is the only safe direction.
    return DAILY_MAX
  }
}

export async function tryOpenAi(
  messages: OpenAiMessage[],
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<OpenAiResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { ok: false, error: 'OPENAI_API_KEY is not set' }

  const used = await usedToday()
  if (used >= DAILY_MAX) {
    return { ok: false, error: `OpenAI fallback daily ceiling reached (${used}/${DAILY_MAX})` }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        max_tokens: opts.maxTokens ?? 300,
        temperature: opts.temperature ?? 0.7,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const body = await res.text().catch(() => 'unknown')
      return { ok: false, error: `${res.status} ${body.slice(0, 200)}` }
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content?.trim()
    if (!content) return { ok: false, error: 'empty completion' }

    return { ok: true, content, usage: data?.usage }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network error' }
  } finally {
    clearTimeout(timer)
  }
}
