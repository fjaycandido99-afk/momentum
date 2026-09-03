/**
 * GET /api/ai/quota?feature=chat — how much of an AI feature is left today.
 *
 * Read-only: peekAiQuota never increments, so opening a surface costs
 * nothing. This exists so the meter is visible BEFORE the user spends
 * one — a free user who has none left should see that on arrival, not
 * discover it by typing a message and having it bounce.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isPremiumUser } from '@/lib/subscription-check'
import { peekAiQuota } from '@/lib/ai/quota'
import { AI_FEATURE_LIMITS, type AiFeatureKey } from '@/lib/subscription-constants'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const feature = request.nextUrl.searchParams.get('feature') as AiFeatureKey | null
    if (!feature || !(feature in AI_FEATURE_LIMITS)) {
      return NextResponse.json({ error: 'Unknown feature' }, { status: 400 })
    }

    const [isPremium, prefs] = await Promise.all([
      isPremiumUser(user.id),
      prisma.userPreferences.findUnique({
        where: { user_id: user.id },
        select: { timezone: true, ai_memory_enabled: true },
      }),
    ])

    const quota = await peekAiQuota(user.id, feature, isPremium, prefs?.timezone)

    return NextResponse.json({
      feature,
      remaining: quota.remaining,
      limit: quota.limit,
      reason: quota.reason,
      label: quota.label,
      // Bundled so the chat can render its consent nudge on arrival too,
      // rather than waiting for the first reply to tell it.
      memoryConsented: !!prefs?.ai_memory_enabled,
    })
  } catch (error) {
    console.error('AI quota read error:', error)
    return NextResponse.json({ error: 'Failed to read quota' }, { status: 500 })
  }
}
