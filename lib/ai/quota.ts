/**
 * Durable per-day AI usage quota.
 *
 * Backs the free tier's metered taste of each AI feature. Deliberately
 * NOT built on lib/rate-limit.ts: that is an in-memory Map scoped to one
 * serverless instance, so a daily cap enforced there would reset on every
 * cold start and differ between concurrent instances. The two coexist —
 * the rate limiter stops bursts, this stops the day's tenth request.
 *
 * The day key is computed in the USER'S timezone. A cap that resets at
 * 2pm local because the server crossed midnight UTC reads as a bug, and
 * the paywall copy ("resets tomorrow") would be a lie.
 */

import { prisma } from '@/lib/prisma'
import {
  AI_FEATURE_LIMITS,
  aiFeatureAllowance,
  type AiFeatureKey,
} from '@/lib/subscription-constants'

/**
 * YYYY-MM-DD for "now" in the given IANA timezone. Falls back to UTC
 * when the timezone is absent or unparseable — en-CA gives us the ISO
 * ordering for free.
 */
export function dayKeyFor(timezone: string | null | undefined, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)
  } catch {
    return now.toISOString().slice(0, 10)
  }
}

export interface QuotaVerdict {
  allowed: boolean
  /** Calls left AFTER this one, when the allowance is finite. */
  remaining: number | null
  /** The tier's allowance: 0 locked, n per day, null unlimited. */
  limit: number | null
  /** Present when denied, for the paywall to render. */
  reason?: 'locked' | 'exhausted'
  label: string
}

/**
 * Check the allowance and, if there is room, consume one call.
 *
 * Consumption is a single atomic upsert-then-increment, so two requests
 * racing can at worst let one extra call through — acceptable for a
 * conversion meter, and far cheaper than serialising every AI request.
 * Unlimited tiers skip the write entirely: there is nothing to count,
 * and premium users are the ones making the most calls.
 */
export async function consumeAiQuota(
  userId: string,
  feature: AiFeatureKey,
  isPremium: boolean,
  timezone?: string | null
): Promise<QuotaVerdict> {
  const label = AI_FEATURE_LIMITS[feature]?.label ?? feature
  const limit = aiFeatureAllowance(feature, isPremium)

  if (limit === null) return { allowed: true, remaining: null, limit: null, label }
  if (limit <= 0) return { allowed: false, remaining: 0, limit: 0, reason: 'locked', label }

  const day = dayKeyFor(timezone)

  const row = await prisma.aiUsageDaily.upsert({
    where: { user_id_feature_day: { user_id: userId, feature, day } },
    create: { user_id: userId, feature, day, count: 0 },
    update: {},
    select: { count: true },
  })

  if (row.count >= limit) {
    return { allowed: false, remaining: 0, limit, reason: 'exhausted', label }
  }

  const updated = await prisma.aiUsageDaily.update({
    where: { user_id_feature_day: { user_id: userId, feature, day } },
    data: { count: { increment: 1 } },
    select: { count: true },
  })

  return {
    allowed: true,
    remaining: Math.max(0, limit - updated.count),
    limit,
    label,
  }
}

/**
 * Read the allowance without consuming it — for rendering "2 left today"
 * before the user commits to spending one.
 */
export async function peekAiQuota(
  userId: string,
  feature: AiFeatureKey,
  isPremium: boolean,
  timezone?: string | null
): Promise<QuotaVerdict> {
  const label = AI_FEATURE_LIMITS[feature]?.label ?? feature
  const limit = aiFeatureAllowance(feature, isPremium)

  if (limit === null) return { allowed: true, remaining: null, limit: null, label }
  if (limit <= 0) return { allowed: false, remaining: 0, limit: 0, reason: 'locked', label }

  const row = await prisma.aiUsageDaily.findUnique({
    where: { user_id_feature_day: { user_id: userId, feature, day: dayKeyFor(timezone) } },
    select: { count: true },
  })

  const used = row?.count ?? 0
  const remaining = Math.max(0, limit - used)
  return {
    allowed: remaining > 0,
    remaining,
    limit,
    reason: remaining > 0 ? undefined : 'exhausted',
    label,
  }
}

/**
 * Give a consumed call back.
 *
 * The allowance is spent before the model runs, because that is the only
 * point at which spending can be enforced. So when the call then fails for a
 * reason that is OURS — an unparseable response, an answer that broke a
 * content rule and was refused — the user has paid for nothing. On a feature
 * with an allowance of one a day, that means no summary until tomorrow
 * because of a bad roll on our side.
 *
 * Refund only for our failures. NOT for a model that answered honestly: a
 * summary that says "I don't know this book" is a correct, useful answer and
 * costs what any answer costs. Refunding that would also make the meter
 * gameable by anyone who could provoke it.
 *
 * Never throws and never goes below zero. A failed refund is a user keeping
 * a cost they should not have paid, which is bad; a failed REQUEST because
 * the refund threw is worse.
 */
export async function refundAiQuota(
  userId: string,
  feature: AiFeatureKey,
  isPremium: boolean,
  timezone?: string | null
): Promise<void> {
  // Unlimited tiers never had a row to decrement.
  if (aiFeatureAllowance(feature, isPremium) === null) return

  try {
    const where = { user_id_feature_day: { user_id: userId, feature, day: dayKeyFor(timezone) } }
    const row = await prisma.aiUsageDaily.findUnique({ where, select: { count: true } })
    if (!row || row.count <= 0) return
    await prisma.aiUsageDaily.update({ where, data: { count: { decrement: 1 } } })
  } catch (error) {
    console.error('[quota] refund failed', { feature, error })
  }
}
