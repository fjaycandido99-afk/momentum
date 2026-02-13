import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getPathRank, type PathStatus } from '@/lib/path-journey'
import type { MindsetId } from '@/lib/mindset/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [guide, totalDaysResult, prefs] = await Promise.all([
      prisma.dailyGuide.findUnique({
        where: { user_id_date: { user_id: user.id, date: today } },
        select: {
          path_reflection_done: true,
          path_exercise_done: true,
          path_quote_viewed: true,
          path_soundscape_played: true,
          path_streak: true,
        },
      }),
      prisma.dailyGuide.count({
        where: {
          user_id: user.id,
          OR: [
            { path_reflection_done: true },
            { path_exercise_done: true },
            { path_quote_viewed: true },
            { path_soundscape_played: true },
          ],
        },
      }),
      prisma.userPreferences.findUnique({
        where: { user_id: user.id },
        select: { mindset: true },
      }),
    ])

    const mindsetId = (prefs?.mindset || 'stoic') as Exclude<MindsetId, 'scholar'>
    const reflection = guide?.path_reflection_done ?? false
    const exercise = guide?.path_exercise_done ?? false
    const quote = guide?.path_quote_viewed ?? false
    const soundscape = guide?.path_soundscape_played ?? false
    const completedCount = [reflection, exercise, quote, soundscape].filter(Boolean).length

    const status: PathStatus = {
      reflection,
      exercise,
      quote,
      soundscape,
      completedCount,
      streak: guide?.path_streak ?? 0,
      totalDays: totalDaysResult,
      rank: getPathRank(mindsetId, totalDaysResult),
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('Path status error:', error)
    return NextResponse.json({ error: 'Failed to get path status' }, { status: 500 })
  }
}
