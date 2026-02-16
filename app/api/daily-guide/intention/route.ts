import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { intention } = body as { intention: string }

    if (!intention || intention.trim().length === 0) {
      return NextResponse.json({ error: 'Intention is required' }, { status: 400 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.dailyGuide.upsert({
      where: {
        user_id_date: {
          user_id: user.id,
          date: today,
        },
      },
      update: {
        daily_intention: intention.trim(),
      },
      create: {
        user_id: user.id,
        date: today,
        day_type: 'work',
        daily_intention: intention.trim(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Set intention error:', error)
    return NextResponse.json({ error: 'Failed to set intention' }, { status: 500 })
  }
}
