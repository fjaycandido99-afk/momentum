import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - List user's scheduled alerts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')

    const scheduled = await prisma.scheduledAlert.findMany({
      where: {
        user_id: user.id,
        ...(status
          ? { status: status as any }
          : { status: { in: ['pending', 'queued'] } }),
      },
      include: {
        alert_type: {
          select: { label: true, category: true },
        },
      },
      orderBy: { scheduled_at: 'asc' },
    })

    return NextResponse.json({ scheduled })
  } catch (error) {
    console.error('Get scheduled alerts error:', error)
    return NextResponse.json({ error: 'Failed to get scheduled alerts' }, { status: 500 })
  }
}
