import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { FREE_TIER_LIMITS, hasPremiumAccess } from '@/lib/stripe'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

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

    // Use a transaction to prevent race conditions with concurrent requests
    const result = await prisma.$transaction(async (tx) => {
      let subscription = await tx.subscription.findUnique({
        where: { user_id: user.id },
      })

      if (!subscription) {
        subscription = await tx.subscription.create({
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
        return {
          error: true,
          sessionsToday,
          canStartMoreSessions: false,
        }
      }

      // Increment session count atomically
      const newSessionCount = sessionsToday + 1

      await tx.subscription.update({
        where: { user_id: user.id },
        data: {
          sessions_today: newSessionCount,
          last_session_date: today,
        },
      })

      return {
        error: false,
        sessionsToday: newSessionCount,
        canStartMoreSessions: isPremium || newSessionCount < FREE_TIER_LIMITS.sessions_per_day,
      }
    })

    if (result.error) {
      return NextResponse.json(
        {
          error: 'Daily session limit reached',
          data: {
            sessionsToday: result.sessionsToday,
            canStartMoreSessions: false,
          }
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionsToday: result.sessionsToday,
        canStartMoreSessions: result.canStartMoreSessions,
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
