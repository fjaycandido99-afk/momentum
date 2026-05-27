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

// Fire-and-forget per-call Groq telemetry. NEVER throws and NEVER blocks
// the response — a failed insert (e.g. the ai_call_logs table not pushed
// yet) is swallowed, so this is safe to ship before `npm run db:push`.
// This is the single signal that tells you when AI silently degraded to
// canned content: watch `outcome=failed` and `fell_back=true`.
export function logAiCall(input: AiCallLogInput): void {
  prisma.aiCallLog
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
    .catch(() => {})
}
