import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST - Mark routine as completed
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const existing = await prisma.routine.findFirst({ where: { id, user_id: user.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await prisma.routine.update({
      where: { id },
      data: {
        times_completed: { increment: 1 },
        last_completed: new Date(),
      },
    })

    return NextResponse.json({
      routine: updated,
      xp: 30,
    })
  } catch (error) {
    console.error('Complete routine error:', error)
    return NextResponse.json({ error: 'Failed to complete routine' }, { status: 500 })
  }
}
