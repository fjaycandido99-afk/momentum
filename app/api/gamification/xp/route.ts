import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { XP_REWARDS, SERVER_ONLY_XP_EVENTS, type XPEventType, getLevelFromXP } from '@/lib/gamification'
import { awardXP } from '@/lib/achievements-server'
import { getDailyBonusAmount } from '@/lib/daily-bonus'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { eventType, source } = body as { eventType: string; source?: string }

    if (!eventType || !(eventType in XP_REWARDS)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }
    // Era XP is awarded by the server when the promise is actually made or
    // kept (lib/era/service). Accepting it here would let a client farm it.
    if (SERVER_ONLY_XP_EVENTS.includes(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }

    // Log the event, then evaluate achievements (lib/achievements-server —
    // shared with the era routes so both unlock the same way).
    const award = await awardXP(user.id, eventType as XPEventType, source)
    const totalXP = award.totalXP - award.bonusXP
    const bonusXP = award.bonusXP
    const achievementResults = award.achievements

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todaysEvents = await prisma.xPEvent.findMany({
      where: { user_id: user.id, created_at: { gte: todayStart } },
      select: { xp_amount: true },
    })
    // Includes the achievement bonus just written, so don't add it again below.
    const todaysXP = todaysEvents.reduce((sum, e) => sum + e.xp_amount, 0) - bonusXP

    const finalTotalXP = totalXP + bonusXP
    const finalLevel = getLevelFromXP(finalTotalXP)

    // --- Daily Bonus XP (variable reward on first meaningful action) ---
    let dailyBonusResult: { amount: number; claimed: boolean } | null = null
    const BONUS_ELIGIBLE_EVENTS = ['moduleComplete', 'journalEntry', 'dailyGuideComplete', 'breathingSession', 'focusSession']
    if (BONUS_ELIGIBLE_EVENTS.includes(eventType)) {
      try {
        const todayStr = new Date().toISOString().split('T')[0]
        const todayDate = new Date(todayStr)
        const todayGuide = await prisma.dailyGuide.findUnique({
          where: { user_id_date: { user_id: user.id, date: todayDate } },
          select: { daily_bonus_claimed: true },
        })

        if (!todayGuide?.daily_bonus_claimed) {
          const bonusAmount = getDailyBonusAmount(todayStr)
          await prisma.$transaction([
            prisma.dailyGuide.upsert({
              where: { user_id_date: { user_id: user.id, date: todayDate } },
              update: { daily_bonus_claimed: true, daily_bonus_amount: bonusAmount },
              create: { user_id: user.id, date: todayDate, day_type: 'work', daily_bonus_claimed: true, daily_bonus_amount: bonusAmount },
            }),
            prisma.xPEvent.create({
              data: { user_id: user.id, event_type: 'dailyBonus', xp_amount: bonusAmount, source: 'daily_bonus' },
            }),
            prisma.userPreferences.update({
              where: { user_id: user.id },
              data: { total_xp: { increment: bonusAmount } },
            }),
          ])
          dailyBonusResult = { amount: bonusAmount, claimed: true }
        }
      } catch (bonusErr) {
        console.error('Daily bonus error (non-fatal):', bonusErr)
      }
    }

    return NextResponse.json({
      totalXP: finalTotalXP + (dailyBonusResult?.amount || 0),
      todaysXP: todaysXP + bonusXP + (dailyBonusResult?.amount || 0),
      level: finalLevel.current.level,
      newAchievements: achievementResults,
      ...(dailyBonusResult && { dailyBonus: dailyBonusResult }),
    })
  } catch (error) {
    console.error('XP logging error:', error)
    return NextResponse.json({ error: 'Failed to log XP' }, { status: 500 })
  }
}
