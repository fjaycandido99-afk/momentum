import { NextRequest, NextResponse } from 'next/server'
import { currentAdmin } from '@/lib/auth/admin'
import { loadGrowth } from '@/lib/analytics/growth-server'

export const dynamic = 'force-dynamic'

/**
 * GET — Growth & patterns for the founder (lib/analytics/growth). Totals
 * across everyone only; a line with fewer than 5 people behind it is null.
 * The same two doors as /api/analytics/stats: a signed-in admin, or
 * CRON_SECRET as a bearer header / ?key=.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const keyParam = request.nextUrl.searchParams.get('key')
  const hasKey = !!cronSecret && (authHeader === `Bearer ${cronSecret}` || keyParam === cronSecret)
  if (!hasKey && !(await currentAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    return NextResponse.json(await loadGrowth())
  } catch (error) {
    console.error('[analytics growth] error:', error)
    return NextResponse.json({ error: 'Could not load growth' }, { status: 500 })
  }
}
