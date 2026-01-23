import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { FREE_TIER_LIMITS, hasPremiumAccess } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // For guest users, just return success (no tracking)
    if (!user) {
      return NextResponse.json({
        success: true,
        data: {
          sessionsToday: 0,
          canStartMoreSessions: true,
        },
      })
    }

    // Get subscription
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

    const isPremium = hasPremiumAccess(
      subscription.tier as 'free' | 'premium',
      subscription.status as 'active' | 'trialing' | 'canceled' | 'expired'
    )

    // Reset sessions count if it's a new day
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let sessionsToday = subscription.sessions_today

    if (subscription.last_session_date) {
      const lastSessionDate = new Date(subscription.last_session_date)
      lastSessionDate.setHours(0, 0, 0, 0)

      if (lastSessionDate < today) {
        sessionsToday = 0
      }
    }

    // For free users, check if they can start another session
    if (!isPremium && sessionsToday >= FREE_TIER_LIMITS.sessions_per_day) {
      return NextResponse.json(
        {
          error: 'Daily session limit reached',
          data: {
            sessionsToday,
            canStartMoreSessions: false,
          }
        },
        { status: 403 }
      )
    }

    // Increment session count
    const newSessionCount = sessionsToday + 1

    subscription = await prisma.subscription.update({
      where: { user_id: user.id },
      data: {
        sessions_today: newSessionCount,
        last_session_date: today,
      },
    })

    const canStartMoreSessions = isPremium ||
      newSessionCount < FREE_TIER_LIMITS.sessions_per_day

    return NextResponse.json({
      success: true,
      data: {
        sessionsToday: newSessionCount,
        canStartMoreSessions,
      },
    })
  } catch (error) {
    console.error('Record session error:', error)
    return NextResponse.json(
      { error: 'Failed to record session' },
      { status: 500 }
    )
  }
}
