import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayStr = todayStart.toISOString().split('T')[0]

    // Check idempotency — already claimed today?
    const existing = await prisma.xPEvent.findFirst({
      where: {
        user_id: user.id,
        event_type: 'freezeEarned',
        created_at: { gte: todayStart },
      },
    })
    if (existing) {
      return NextResponse.json({ error: 'Already claimed today' }, { status: 409 })
    }

    // Verify all 3 daily challenges are done
    const todayGuide = await prisma.dailyGuide.findFirst({
      where: { user_id: user.id, date: new Date(todayStr) },
    })

    // Import challenge logic inline — check if all 3 challenges completed
    const { getDailyChallenges, checkChallengeCondition } = await import('@/lib/daily-challenges')
    const todaysEvents = await prisma.xPEvent.findMany({
      where: { user_id: user.id, created_at: { gte: todayStart } },
      select: { xp_amount: true, event_type: true },
    })
    const todaysXP = todaysEvents.reduce((sum, e) => sum + e.xp_amount, 0)

    const challenges = getDailyChallenges(todayStr)
    const allDone = challenges.every(c =>
      checkChallengeCondition(
        c.condition,
        todayGuide,
        todaysXP,
        todaysEvents.map(e => ({ event_type: e.event_type }))
      )
    )

    if (!allDone) {
      return NextResponse.json({ error: 'Not all challenges completed' }, { status: 400 })
    }

    // Award freeze + log event
    await prisma.$transaction([
      prisma.userPreferences.update({
        where: { user_id: user.id },
        data: { streak_freezes: { increment: 1 } },
      }),
      prisma.xPEvent.create({
        data: {
          user_id: user.id,
          event_type: 'freezeEarned',
          xp_amount: 0,
          source: 'daily_challenges_complete',
        },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Claim freeze error:', error)
    return NextResponse.json({ error: 'Failed to claim freeze' }, { status: 500 })
  }
}
