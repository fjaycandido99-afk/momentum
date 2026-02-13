import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { PATH_FIELD_MAP, getPathRank, type PathActivity, type PathStatus } from '@/lib/path-journey'
import { XP_REWARDS } from '@/lib/gamification'
import type { MindsetId } from '@/lib/mindset/types'

export const dynamic = 'force-dynamic'

const VALID_ACTIVITIES: PathActivity[] = ['reflection', 'exercise', 'quote', 'soundscape']

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { activity } = body as { activity: string }

    if (!activity || !VALID_ACTIVITIES.includes(activity as PathActivity)) {
      return NextResponse.json({ error: 'Invalid activity' }, { status: 400 })
    }

    const fieldName = PATH_FIELD_MAP[activity as PathActivity]
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Upsert today's guide with the activity boolean set to true
    const guide = await prisma.dailyGuide.upsert({
      where: { user_id_date: { user_id: user.id, date: today } },
      update: { [fieldName]: true },
      create: {
        user_id: user.id,
        date: today,
        day_type: 'work',
        [fieldName]: true,
      },
    })

    // Check if this is the first path activity today (for XP award)
    const hadAnyBefore = (
      (fieldName !== 'path_reflection_done' && guide.path_reflection_done) ||
      (fieldName !== 'path_exercise_done' && guide.path_exercise_done) ||
      (fieldName !== 'path_quote_viewed' && guide.path_quote_viewed) ||
      (fieldName !== 'path_soundscape_played' && guide.path_soundscape_played)
    )

    if (!hadAnyBefore) {
      // First path activity today — award XP
      await prisma.$transaction([
        prisma.xPEvent.create({
          data: {
            user_id: user.id,
            event_type: 'pathActivity',
            xp_amount: XP_REWARDS.pathActivity,
            source: activity,
          },
        }),
        prisma.userPreferences.upsert({
          where: { user_id: user.id },
          update: { total_xp: { increment: XP_REWARDS.pathActivity } },
          create: { user_id: user.id, total_xp: XP_REWARDS.pathActivity },
        }),
      ])
    }

    // Recalculate streak: walk backwards counting consecutive days with any path activity
    let streak = 1 // today counts
    const yesterday = new Date(today)
    for (let i = 0; i < 365; i++) {
      yesterday.setDate(yesterday.getDate() - 1)
      const prevGuide = await prisma.dailyGuide.findUnique({
        where: { user_id_date: { user_id: user.id, date: new Date(yesterday) } },
        select: {
          path_reflection_done: true,
          path_exercise_done: true,
          path_quote_viewed: true,
          path_soundscape_played: true,
        },
      })

      if (!prevGuide) break
      const hadActivity = prevGuide.path_reflection_done || prevGuide.path_exercise_done ||
        prevGuide.path_quote_viewed || prevGuide.path_soundscape_played
      if (!hadActivity) break
      streak++
    }

    // Update streak on today's guide
    await prisma.dailyGuide.update({
      where: { user_id_date: { user_id: user.id, date: today } },
      data: { path_streak: streak },
    })

    // Build response
    const totalDays = await prisma.dailyGuide.count({
      where: {
        user_id: user.id,
        OR: [
          { path_reflection_done: true },
          { path_exercise_done: true },
          { path_quote_viewed: true },
          { path_soundscape_played: true },
        ],
      },
    })

    const prefs = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
      select: { mindset: true },
    })
    const mindsetId = (prefs?.mindset || 'stoic') as Exclude<MindsetId, 'scholar'>

    // Re-read the guide for current state
    const updatedGuide = await prisma.dailyGuide.findUnique({
      where: { user_id_date: { user_id: user.id, date: today } },
      select: {
        path_reflection_done: true,
        path_exercise_done: true,
        path_quote_viewed: true,
        path_soundscape_played: true,
      },
    })

    const reflection = updatedGuide?.path_reflection_done ?? false
    const exercise = updatedGuide?.path_exercise_done ?? false
    const quote = updatedGuide?.path_quote_viewed ?? false
    const soundscape = updatedGuide?.path_soundscape_played ?? false

    const status: PathStatus = {
      reflection,
      exercise,
      quote,
      soundscape,
      completedCount: [reflection, exercise, quote, soundscape].filter(Boolean).length,
      streak,
      totalDays,
      rank: getPathRank(mindsetId, totalDays),
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('Path track error:', error)
    return NextResponse.json({ error: 'Failed to track activity' }, { status: 500 })
  }
}
