import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

    const guides = await prisma.dailyGuide.findMany({
      where: {
        user_id: user.id,
        date: { gte: sevenDaysAgo, lte: today },
      },
      select: {
        date: true,
        virtue_focus: true,
        virtue_rating: true,
      },
      orderBy: { date: 'asc' },
    })

    // Build 7-day array
    const weekData: { date: string; virtue_focus: string | null; virtue_rating: number | null }[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo)
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      const guide = guides.find(g => new Date(g.date).toISOString().split('T')[0] === dateStr)
      weekData.push({
        date: dateStr,
        virtue_focus: guide?.virtue_focus ?? null,
        virtue_rating: guide?.virtue_rating ?? null,
      })
    }

    return NextResponse.json({ weekData })
  } catch (error) {
    console.error('Virtue GET error:', error)
    return NextResponse.json({ error: 'Failed to get virtue data' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { virtue, rating } = body as { virtue?: string; rating?: number }

    if (!virtue || typeof virtue !== 'string') {
      return NextResponse.json({ error: 'Virtue name is required' }, { status: 400 })
    }

    if (rating !== undefined && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const updateData: Record<string, unknown> = { virtue_focus: virtue }
    if (rating !== undefined) {
      updateData.virtue_rating = rating
    }

    const guide = await prisma.dailyGuide.upsert({
      where: { user_id_date: { user_id: user.id, date: today } },
      update: updateData,
      create: {
        user_id: user.id,
        date: today,
        day_type: 'work',
        virtue_focus: virtue,
        ...(rating !== undefined ? { virtue_rating: rating } : {}),
      },
      select: {
        date: true,
        virtue_focus: true,
        virtue_rating: true,
      },
    })

    return NextResponse.json(guide)
  } catch (error) {
    console.error('Virtue POST error:', error)
    return NextResponse.json({ error: 'Failed to save virtue' }, { status: 500 })
  }
}
