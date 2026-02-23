import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Paginated alert history (cursor-based)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const cursor = searchParams.get('cursor')
    const status = searchParams.get('status')
    const alertTypeId = searchParams.get('alert_type_id')

    const history = await prisma.alertHistory.findMany({
      where: {
        user_id: user.id,
        ...(status && { status: status as any }),
        ...(alertTypeId && { alert_type_id: alertTypeId }),
      },
      include: {
        alert_type: {
          select: { label: true, category: true },
        },
      },
      orderBy: { sent_at: 'desc' },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    })

    const hasMore = history.length > limit
    const items = hasMore ? history.slice(0, limit) : history
    const nextCursor = hasMore ? items[items.length - 1].id : null

    return NextResponse.json({
      history: items,
      nextCursor,
      hasMore,
    })
  } catch (error) {
    console.error('Get alert history error:', error)
    return NextResponse.json({ error: 'Failed to get alert history' }, { status: 500 })
  }
}
