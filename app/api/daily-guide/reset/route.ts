import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDateString } from '@/lib/daily-guide/day-type'

export const dynamic = 'force-dynamic'

// DELETE today's guide to force regeneration
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    const dateKey = getDateString(today)

    console.log('[reset] Deleting guide for user:', user.id, 'date:', dateKey)

    // Delete today's guide
    const deleted = await prisma.dailyGuide.deleteMany({
      where: {
        user_id: user.id,
        date: new Date(dateKey),
      },
    })

    console.log('[reset] Deleted guides:', deleted.count)

    return NextResponse.json({
      success: true,
      deleted: deleted.count,
      message: 'Guide reset. Refresh the page to generate a new guide.',
    })
  } catch (error) {
    console.error('[reset] Error:', error)
    return NextResponse.json(
      { error: 'Failed to reset guide', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
