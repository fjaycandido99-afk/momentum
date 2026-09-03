import { prisma } from '@/lib/prisma'

export interface AiCallLogInput {
  endpoint: string
  userId?: string | null
  requestedModel: string
  model: string
  fellBack: boolean
  outcome: 'ok' | 'failed'
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null
  latencyMs: number
  error?: string | null
}

// Per-call Groq telemetry. NEVER throws — a failed insert (e.g. the table
// not pushed yet) is swallowed, so this is safe to ship before db:push.
//
// AWAIT IT. This used to be fire-and-forget "so it never blocks the
// response", which sounds free and is not: on Vercel the function returns
// and is frozen, so the insert is routinely killed mid-flight and the row
// never lands. That was discovered the hard way — chasing a live AI
// outage, the failing calls left no trace at all, because the only signal
// that says "AI silently degraded to canned content" was itself dropping
// writes at exactly the moment it mattered.
//
// An insert costs tens of milliseconds against an AI call that takes
// seconds. Observability you cannot trust is worth less than the latency
// it saves.
export function logAiCall(input: AiCallLogInput): Promise<void> {
  return prisma.aiCallLog
    .create({
      data: {
        endpoint: input.endpoint,
        user_id: input.userId ?? null,
        requested_model: input.requestedModel,
        model: input.model,
        fell_back: input.fellBack,
        outcome: input.outcome,
        prompt_tokens: input.usage?.prompt_tokens ?? 0,
        completion_tokens: input.usage?.completion_tokens ?? 0,
        latency_ms: Math.round(input.latencyMs),
        error: input.error ? input.error.slice(0, 300) : null,
      },
    })
    .then(() => {})
    .catch(() => {})
}
