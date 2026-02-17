import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Monday-based week start
    const now = new Date()
    const dayOfWeek = now.getDay()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
    weekStart.setHours(0, 0, 0, 0)

    const guides = await prisma.dailyGuide.findMany({
      where: { user_id: user.id, date: { gte: weekStart } },
      select: {
        date: true,
        morning_prime_done: true,
        movement_done: true,
        micro_lesson_done: true,
        breath_done: true,
        day_close_done: true,
      },
      orderBy: { date: 'asc' },
    })

    // Build per-day data for Mon-Sun
    const days: { date: string; modules: number; total: number }[] = []
    let totalModules = 0
    let activeDays = 0

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      const guide = guides.find(g => g.date.toISOString().split('T')[0] === dateStr)

      let modules = 0
      if (guide) {
        if (guide.morning_prime_done) modules++
        if (guide.movement_done) modules++
        if (guide.micro_lesson_done) modules++
        if (guide.breath_done) modules++
        if (guide.day_close_done) modules++
      }

      if (modules > 0) activeDays++
      totalModules += modules
      days.push({ date: dateStr, modules, total: 5 })
    }

    const completionRate = Math.round((activeDays / 7) * 100)

    return NextResponse.json({
      activeDays,
      totalModules,
      completionRate,
      days,
    })
  } catch (error) {
    console.error('Weekly stats error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
