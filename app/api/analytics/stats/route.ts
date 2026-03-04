import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // CRON_SECRET bearer auth
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const keyParam = request.nextUrl.searchParams.get('key')

  if (!cronSecret || (authHeader !== `Bearer ${cronSecret}` && keyParam !== cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const period = request.nextUrl.searchParams.get('period') || '7d'
  const days = period === '30d' ? 30 : period === '14d' ? 14 : 7
  const since = new Date()
  since.setDate(since.getDate() - days)

  try {
    // Feature ranking — total events per feature
    const featureRanking = await prisma.featureEvent.groupBy({
      by: ['feature'],
      _count: { id: true },
      where: { created_at: { gte: since } },
      orderBy: { _count: { id: 'desc' } },
    })

    // Action breakdown per feature
    const actionBreakdown = await prisma.featureEvent.groupBy({
      by: ['feature', 'action'],
      _count: { id: true },
      where: { created_at: { gte: since } },
      orderBy: { _count: { id: 'desc' } },
    })

    // Unique users per feature
    const userCounts = await prisma.$queryRaw<{ feature: string; users: bigint }[]>`
      SELECT feature, COUNT(DISTINCT user_id) as users
      FROM "FeatureEvent"
      WHERE created_at >= ${since}
      GROUP BY feature
      ORDER BY users DESC
    `

    // Daily trend — events + unique users per day
    const dailyTrend = await prisma.$queryRaw<{ day: string; events: bigint; users: bigint }[]>`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM-DD') as day,
        COUNT(*) as events,
        COUNT(DISTINCT user_id) as users
      FROM "FeatureEvent"
      WHERE created_at >= ${since}
      GROUP BY day
      ORDER BY day ASC
    `

    // Totals
    const totalEvents = await prisma.featureEvent.count({
      where: { created_at: { gte: since } },
    })

    const totalUsersResult = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT user_id) as count
      FROM "FeatureEvent"
      WHERE created_at >= ${since}
    `

    return NextResponse.json({
      period,
      days,
      totalEvents,
      totalUsers: Number(totalUsersResult[0]?.count ?? 0),
      featureRanking: featureRanking.map(r => ({
        feature: r.feature,
        count: r._count.id,
      })),
      actionBreakdown: actionBreakdown.map(r => ({
        feature: r.feature,
        action: r.action,
        count: r._count.id,
      })),
      userCounts: userCounts.map(r => ({
        feature: r.feature,
        users: Number(r.users),
      })),
      dailyTrend: dailyTrend.map(r => ({
        day: r.day,
        events: Number(r.events),
        users: Number(r.users),
      })),
    })
  } catch (error) {
    console.error('[analytics/stats] error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
