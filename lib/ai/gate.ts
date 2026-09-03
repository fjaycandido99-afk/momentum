/**
 * One gate for every AI route.
 *
 * Before this existed, all eleven AI routes carried the same four lines:
 * fetch the tier, and 403 with "Premium required" if it wasn't premium.
 * That shape can only say yes or no, which is why the free tier converted
 * badly — a locked door teaches a user nothing about what's behind it.
 *
 * This replaces it with a metered check that also returns the numbers the
 * paywall needs, so the client can say "that's your 5 for today" instead
 * of "upgrade". Denials carry `reason` so the UI can tell the two apart:
 *
 *   locked    → this tier never had it (free allowance is 0)
 *   exhausted → they had some, they used them, they reset tomorrow
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isPremiumUser } from '@/lib/subscription-check'
import { consumeAiQuota, type QuotaVerdict } from '@/lib/ai/quota'
import type { AiFeatureKey } from '@/lib/subscription-constants'

export type AiGateResult =
  | { ok: true; isPremium: boolean; quota: QuotaVerdict }
  | { ok: false; response: NextResponse }

export async function aiGate(userId: string, feature: AiFeatureKey): Promise<AiGateResult> {
  const isPremium = await isPremiumUser(userId)

  const prefs = await prisma.userPreferences.findUnique({
    where: { user_id: userId },
    select: { timezone: true },
  })

  const quota = await consumeAiQuota(userId, feature, isPremium, prefs?.timezone)

  if (!quota.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: quota.reason === 'locked' ? 'Premium required' : 'Daily limit reached',
          reason: quota.reason,
          limit: quota.limit,
          label: quota.label,
          feature,
          upgrade: true,
        },
        { status: 403 }
      ),
    }
  }

  return { ok: true, isPremium, quota }
}
