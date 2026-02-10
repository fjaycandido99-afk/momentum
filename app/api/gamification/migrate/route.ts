import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Skip if user already has XP events
    const existingCount = await prisma.xPEvent.count({ where: { user_id: user.id } })
    if (existingCount > 0) {
      return NextResponse.json({ migrated: false, reason: 'already_migrated' })
    }

    const body = await req.json()
    const { entries } = body as { entries: { type: string; xp: number; timestamp: number }[] }

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ migrated: false, reason: 'no_entries' })
    }

    // Bulk insert XP events
    const totalXP = entries.reduce((sum, e) => sum + (e.xp || 0), 0)

    await prisma.$transaction([
      prisma.xPEvent.createMany({
        data: entries.map(e => ({
          user_id: user.id,
          event_type: e.type,
          xp_amount: e.xp || 0,
          source: 'localStorage_migration',
          created_at: new Date(e.timestamp),
        })),
      }),
      prisma.userPreferences.upsert({
        where: { user_id: user.id },
        update: { total_xp: { increment: totalXP } },
        create: { user_id: user.id, total_xp: totalXP },
      }),
    ])

    return NextResponse.json({ migrated: true, count: entries.length, totalXP })
  } catch (error) {
    console.error('XP migration error:', error)
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 })
  }
}
