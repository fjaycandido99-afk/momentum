import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const prefs = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
      select: { last_active_date: true, current_streak: true },
    })

    if (!prefs?.last_active_date) {
      // First time user or no data — update and skip
      await prisma.userPreferences.upsert({
        where: { user_id: user.id },
        update: { last_active_date: new Date() },
        create: { user_id: user.id, last_active_date: new Date() },
      })
      return NextResponse.json({ shouldShow: false })
    }

    const now = new Date()
    const daysAway = Math.floor((now.getTime() - prefs.last_active_date.getTime()) / 86400000)
    const lastStreak = prefs.current_streak || 0

    // Update last_active_date to today
    await prisma.userPreferences.update({
      where: { user_id: user.id },
      data: { last_active_date: now },
    })

    return NextResponse.json({
      shouldShow: daysAway >= 2,
      daysAway,
      lastStreak,
    })
  } catch (error) {
    console.error('Welcome status error:', error)
    return NextResponse.json({ error: 'Failed to check welcome status' }, { status: 500 })
  }
}
