/**
 * AI health, computed from AiCallLog.
 *
 * This exists because the chat was completely dead for seventeen days and
 * nothing said so. The telemetry was there the whole time — 52 rows all
 * saying 404 model_not_found — and nobody was reading it. Perfect data,
 * zero attention.
 *
 * The judgement is deliberately conservative. A false alarm trains you to
 * ignore the alert, which is exactly how you end up back where we started.
 */

export interface HealthWindow {
  total: number
  failed: number
  ok: number
  /** 0–1. Meaningless when total is small; see `verdict`. */
  failureRate: number
}

export type HealthVerdict = 'healthy' | 'degraded' | 'down' | 'idle'

export interface HealthReport extends HealthWindow {
  verdict: HealthVerdict
  /** Human-readable, used as the alert body. */
  summary: string
  /** Distinct error strings seen, most recent first, capped. */
  errors: string[]
}

/** Below this many calls, a failure rate is noise rather than signal. */
export const MIN_VOLUME = 5

/** Above this share of failures, something is actually wrong. */
export const DEGRADED_RATE = 0.25

export function assessHealth(
  rows: Array<{ outcome: string; error?: string | null }>,
  windowLabel: string
): HealthReport {
  const total = rows.length
  const failed = rows.filter(r => r.outcome === 'failed').length
  const ok = total - failed
  const failureRate = total ? failed / total : 0

  const errors = Array.from(
    new Set(rows.filter(r => r.outcome === 'failed' && r.error).map(r => String(r.error).slice(0, 200)))
  ).slice(0, 3)

  // Nobody used the AI in this window. Not health information either way —
  // alerting on silence would page you every night.
  if (total === 0) {
    return { total, failed, ok, failureRate, verdict: 'idle', summary: `No AI calls in ${windowLabel}.`, errors }
  }

  // EVERY call failed, with enough volume to mean it. This is the shape the
  // seventeen-day outage had from its first hour.
  if (ok === 0 && total >= MIN_VOLUME) {
    return {
      total, failed, ok, failureRate, verdict: 'down',
      summary: `AI is DOWN: all ${total} calls failed in ${windowLabel}.`,
      errors,
    }
  }

  if (total >= MIN_VOLUME && failureRate >= DEGRADED_RATE) {
    return {
      total, failed, ok, failureRate, verdict: 'degraded',
      summary: `AI degraded: ${failed}/${total} calls failed (${Math.round(failureRate * 100)}%) in ${windowLabel}.`,
      errors,
    }
  }

  return {
    total, failed, ok, failureRate, verdict: 'healthy',
    summary: `AI healthy: ${ok}/${total} calls succeeded in ${windowLabel}.`,
    errors,
  }
}

export function isAlerting(v: HealthVerdict): boolean {
  return v === 'down' || v === 'degraded'
}
