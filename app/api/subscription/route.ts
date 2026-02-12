import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { FREE_TIER_LIMITS, hasPremiumAccess } from '@/lib/stripe'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // For guest users, return free tier
    if (!user) {
      return NextResponse.json({
        success: true,
        data: {
          tier: 'free',
          status: 'active',
          isTrialing: false,
          trialDaysLeft: 0,
          sessionsToday: 0,
          canStartSession: true,
          isPremium: false,
          limits: FREE_TIER_LIMITS,
        },
      })
    }

    // Get or create subscription
    let subscription = await prisma.subscription.findUnique({
      where: { user_id: user.id },
    })

    if (!subscription) {
      // Create default free subscription
      subscription = await prisma.subscription.create({
        data: {
          user_id: user.id,
          tier: 'free',
          status: 'active',
        },
      })
    }

    // Reset sessions_today if it's a new day
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (subscription.last_session_date) {
      const lastSessionDate = new Date(subscription.last_session_date)
      lastSessionDate.setHours(0, 0, 0, 0)

      if (lastSessionDate < today) {
        subscription = await prisma.subscription.update({
          where: { user_id: user.id },
          data: {
            sessions_today: 0,
            last_session_date: today,
          },
        })
      }
    }

    const isPremium = hasPremiumAccess(
      subscription.tier as 'free' | 'premium',
      subscription.status as 'active' | 'trialing' | 'canceled' | 'expired'
    )

    const isTrialing = subscription.status === 'trialing'

    let trialDaysLeft = 0
    if (isTrialing && subscription.trial_end) {
      const now = new Date()
      const trialEnd = new Date(subscription.trial_end)
      const diffMs = trialEnd.getTime() - now.getTime()
      trialDaysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
    }

    const canStartSession = isPremium ||
      subscription.sessions_today < FREE_TIER_LIMITS.sessions_per_day

    return NextResponse.json({
      success: true,
      data: {
        tier: subscription.tier,
        status: subscription.status,
        isTrialing,
        trialDaysLeft,
        trialEnd: subscription.trial_end,
        sessionsToday: subscription.sessions_today,
        canStartSession,
        isPremium,
        billingPeriodEnd: subscription.billing_period_end,
        limits: isPremium ? null : FREE_TIER_LIMITS,
      },
    })
  } catch (error) {
    console.error('Get subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    )
  }
}
