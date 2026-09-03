import { logAiCall } from './ai/usage-log'
import { isOpenAiConfigured, tryOpenAi, OPENAI_MODEL, OPENAI_LOG_PREFIX } from './ai/openai-fallback'

// A LADDER, not a pair.
//
// From 2026-08-16, every AI call returned 404 model_not_found for
// SEVENTEEN DAYS and nobody noticed, because the AI routes degrade to
// plausible canned text on failure.
//
// Groq's docs list llama-3.1-8b-instant and llama-3.3-70b-versatile as
// current production models, yet this account gets
//   404 "does not exist OR YOU DO NOT HAVE ACCESS TO IT"
// on both — while a deliberately wrong key gets a clean 401. A valid key
// that cannot reach current production models is an ACCOUNT problem
// (plan, billing, project-scoped key), not a retirement.
//
// Order matters: every rung above a working model costs a real round trip
// on EVERY request. The Groq console's own model list (checked 2026-09-02)
// offers GPT-OSS and Qwen — no Llama at all — so the Llama ids that ran
// this app until 16 August are retired and now sit at the bottom, kept
// only so an old GROQ_MODEL override still resolves to something.
//
// Override the whole list with GROQ_MODELS (comma-separated), no deploy
// needed — which is the point, because this will happen again.
const DEFAULT_MODEL_LADDER = [
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'groq/compound-mini',
  // Retired on Groq. Harmless if they ever return, skipped in one 404 if not.
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
]

function resolveLadder(): string[] {
  // GROQ_MODELS wins: one comma-separated list, in preference order.
  const list = process.env.GROQ_MODELS?.split(',').map(m => m.trim()).filter(Boolean)
  if (list?.length) return list

  // Otherwise honour the older single-model vars if either is set.
  const pair = [process.env.GROQ_MODEL, process.env.GROQ_FALLBACK_MODEL].filter(Boolean) as string[]
  if (pair.length) return [...new Set(pair)]

  return DEFAULT_MODEL_LADDER
}

export const GROQ_MODELS: string[] = resolveLadder()

// Kept for the call sites that already import these names.
export const GROQ_MODEL = GROQ_MODELS[0]
export const GROQ_FALLBACK_MODEL = GROQ_MODELS[GROQ_MODELS.length - 1]

export const GROQ_DEFAULTS = {
  temperature: 0.7,
  max_tokens: 300,
} as const

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
// Hard ceiling per attempt so a hung Groq can't hang the whole request.
// Worst case the helper does 2 attempts → ≤2× this.
const TIMEOUT_MS = 15_000

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ResponseFormat {
  type: 'json_object' | 'text'
}

interface ChatCompletionOptions {
  model?: string
  messages: ChatMessage[]
  max_tokens?: number
  temperature?: number
  top_p?: number
  response_format?: ResponseFormat
}

interface Usage {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

interface ChatCompletionResponse {
  choices: { message: { content: string | null } }[]
  usage?: Usage
  model?: string
}

// Optional per-call telemetry context. Callers can pass an endpoint label
// (and user id) as a 2nd arg; it's optional so the 23 existing call sites
// keep working unchanged — they just log as "unknown" until labelled.
export interface GroqCallMeta {
  endpoint?: string
  userId?: string | null
}

// 408 timeout, 425 too-early, 429 rate-limit, and any 5xx are worth a
// second shot (a different model or a retry). Other 4xx (bad request,
// auth) won't fix themselves — fail fast.
const isTransientStatus = (s: number) =>
  s === 408 || s === 425 || s === 429 || (s >= 500 && s <= 599)

type AttemptResult =
  | { ok: true; data: ChatCompletionResponse }
  | { ok: false; transient: boolean; status: number; body: string }

// One raw call to Groq with a timeout. Never throws — returns a tagged
// result so the resilient wrapper can decide whether to retry/fall back.
async function attempt(model: string, options: ChatCompletionOptions): Promise<AttemptResult> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return { ok: false, transient: false, status: 0, body: 'GROQ_API_KEY is not set' }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: options.messages,
        max_tokens: options.max_tokens ?? GROQ_DEFAULTS.max_tokens,
        temperature: options.temperature ?? GROQ_DEFAULTS.temperature,
        ...(options.top_p !== undefined ? { top_p: options.top_p } : {}),
        ...(options.response_format ? { response_format: options.response_format } : {}),
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const body = await response.text().catch(() => 'unknown')
      return { ok: false, transient: isTransientStatus(response.status), status: response.status, body }
    }
    const data = (await response.json()) as ChatCompletionResponse
    return { ok: true, data }
  } catch (err) {
    // Network error / timeout / abort — always worth one more try.
    const body = err instanceof Error ? err.message : 'network error'
    return { ok: false, transient: true, status: 0, body }
  } finally {
    clearTimeout(timer)
  }
}

// Resilient Groq call — the single chokepoint every AI feature goes
// through. Flow: try the requested model → on a TRANSIENT failure, fall
// back to the fast/cheap model (or retry if already on it) → on success
// return; on total failure THROW so the caller's existing try/catch
// degrades to its pre-written fallback content. Every outcome (incl. the
// fallback flag + token usage) is logged, and the log is AWAITED — see
// usage-log.ts for why fire-and-forget lost rows on Vercel.
export async function createChatCompletion(
  options: ChatCompletionOptions,
  meta: GroqCallMeta = {},
): Promise<ChatCompletionResponse> {
  const start = Date.now()
  const requested = options.model || GROQ_MODEL
  const endpoint = meta.endpoint || 'unknown'
  const userId = meta.userId ?? null

  // Walk the ladder: the requested model first, then every other rung in
  // order. Stop at the first one that answers.
  const ladder = [requested, ...GROQ_MODELS.filter(m => m !== requested)]
  const failures: string[] = []

  for (const model of ladder) {
    const res = await attempt(model, options)

    if (res.ok) {
      await logAiCall({
        endpoint, userId, requestedModel: requested,
        model: res.data.model || model,
        fellBack: model !== requested,
        outcome: 'ok', usage: res.data.usage, latencyMs: Date.now() - start,
      })
      return res.data
    }

    failures.push(`${model}: ${res.status} ${res.body.slice(0, 100)}`)

    // A model that is gone, or that this account cannot reach, is
    // permanent for THAT model but says nothing about the next rung.
    const modelGone = res.status === 404 || /model_not_found|does not exist/i.test(res.body)

    // Anything else permanent — bad auth, missing key, malformed request —
    // will fail identically on every rung. Stop rather than hammer Groq
    // with the same doomed request five times.
    if (!res.transient && !modelGone) break
  }

  // Every Groq rung failed. Before giving the caller its canned text, try
  // the other provider — this is the case that ran for seventeen days.
  if (isOpenAiConfigured()) {
    const alt = await tryOpenAi(options.messages, {
      maxTokens: options.max_tokens ?? GROQ_DEFAULTS.max_tokens,
      temperature: options.temperature ?? GROQ_DEFAULTS.temperature,
    })

    if (alt.ok && alt.content) {
      // Loudly. A failover is a working app AND an incident — if this
      // line is in your logs, Groq is down and you are paying more per
      // token until someone looks.
      console.error(
        `[ai] GROQ UNAVAILABLE — served by ${OPENAI_LOG_PREFIX}${OPENAI_MODEL}. Groq said: ${failures.join(' | ').slice(0, 300)}`
      )
      await logAiCall({
        endpoint, userId, requestedModel: requested,
        model: `${OPENAI_LOG_PREFIX}${OPENAI_MODEL}`,
        fellBack: true, outcome: 'ok',
        usage: alt.usage, latencyMs: Date.now() - start,
        error: `groq unavailable: ${failures.join(' | ')}`,
      })
      return { choices: [{ message: { content: alt.content } }], usage: alt.usage }
    }

    failures.push(`${OPENAI_LOG_PREFIX}${OPENAI_MODEL}: ${alt.error}`)
  }

  await logAiCall({
    endpoint, userId, requestedModel: requested,
    model: ladder[ladder.length - 1], fellBack: ladder.length > 1,
    outcome: 'failed', latencyMs: Date.now() - start,
    error: failures.join(' | '),
  })
  throw new Error(`Groq failed on all ${ladder.length} models: ${failures[0] ?? 'no attempts'}`)
}

// Drop-in replacement: same .chat.completions.create() interface every
// caller already uses — now resilient + observable. The optional 2nd
// `meta` arg lets a caller label the call for telemetry.
export function getGroq(endpoint?: string, userId?: string | null) {
  // Pass a label — getGroq('journal-conversation') — and every row in
  // AiCallLog says which feature made the call. Without one they all log
  // as "unknown", which during the 17-day outage meant a successful call
  // and a failing one were indistinguishable in the only table that could
  // have told them apart.
  const meta: GroqCallMeta = { endpoint, userId }
  return {
    chat: {
      completions: {
        create: (options: ChatCompletionOptions, override?: GroqCallMeta) =>
          createChatCompletion(options, { ...meta, ...override }),
      },
    },
  }
}
