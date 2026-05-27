import { logAiCall } from './ai/usage-log'

export const GROQ_MODEL = 'llama-3.1-8b-instant'
// Cheap/fast model every request can safely fall back to when the
// requested (usually 70b) model is rate-limited or erroring. 8b-instant
// is the floor — there's nothing cheaper to fall back to, so requests
// already on it just retry once instead.
export const GROQ_FALLBACK_MODEL = 'llama-3.1-8b-instant'

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
// fallback flag + token usage) is logged fire-and-forget.
export async function createChatCompletion(
  options: ChatCompletionOptions,
  meta: GroqCallMeta = {},
): Promise<ChatCompletionResponse> {
  const start = Date.now()
  const requested = options.model || GROQ_MODEL
  const canFallback = requested !== GROQ_FALLBACK_MODEL
  const endpoint = meta.endpoint || 'unknown'
  const userId = meta.userId ?? null

  // Attempt 1 — the requested model.
  let res = await attempt(requested, options)
  if (res.ok) {
    logAiCall({ endpoint, userId, requestedModel: requested, model: res.data.model || requested, fellBack: false, outcome: 'ok', usage: res.data.usage, latencyMs: Date.now() - start })
    return res.data
  }

  // Permanent error (bad request, auth, missing key) — retrying or
  // swapping models won't help. Fail now so the caller falls back.
  if (!res.transient) {
    logAiCall({ endpoint, userId, requestedModel: requested, model: requested, fellBack: false, outcome: 'failed', latencyMs: Date.now() - start, error: `${res.status} ${res.body}` })
    throw new Error(`Groq error ${res.status}: ${res.body.slice(0, 200)}`)
  }

  // Attempt 2 — fall back to the floor model (or retry the same model if
  // we were already on it).
  const secondModel = canFallback ? GROQ_FALLBACK_MODEL : requested
  res = await attempt(secondModel, options)
  if (res.ok) {
    const fellBack = secondModel !== requested
    logAiCall({ endpoint, userId, requestedModel: requested, model: res.data.model || secondModel, fellBack, outcome: 'ok', usage: res.data.usage, latencyMs: Date.now() - start })
    return res.data
  }

  logAiCall({ endpoint, userId, requestedModel: requested, model: secondModel, fellBack: secondModel !== requested, outcome: 'failed', latencyMs: Date.now() - start, error: `${res.status} ${res.body}` })
  throw new Error(`Groq failed after retry (${res.status}): ${res.body.slice(0, 200)}`)
}

// Drop-in replacement: same .chat.completions.create() interface every
// caller already uses — now resilient + observable. The optional 2nd
// `meta` arg lets a caller label the call for telemetry.
export function getGroq() {
  return {
    chat: {
      completions: {
        create: createChatCompletion,
      },
    },
  }
}
