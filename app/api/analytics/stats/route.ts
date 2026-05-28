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

    // ──────────────── Funnel (period-aligned) ────────────────
    // Of users active in this window, how many have hit each life-stage milestone?
    const activeUsersCount = Number(totalUsersResult[0]?.count ?? 0)

    const mindsetCountResult = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM "UserPreferences" up
      INNER JOIN (SELECT DISTINCT user_id FROM "FeatureEvent" WHERE created_at >= ${since}) ae
        ON ae.user_id = up.user_id
      WHERE up.mindset_selected_at IS NOT NULL
    `
    const journalCompleters = await prisma.featureEvent.findMany({
      where: { feature: 'journal', action: 'complete', created_at: { gte: since } },
      select: { user_id: true }, distinct: ['user_id'],
    })
    const coachUsers = await prisma.featureEvent.findMany({
      where: { feature: 'coach', created_at: { gte: since } },
      select: { user_id: true }, distinct: ['user_id'],
    })

    const funnel = {
      active: activeUsersCount,
      mindsetSelected: Number(mindsetCountResult[0]?.count ?? 0),
      journalCompleted: journalCompleters.length,
      talkedToCoach: coachUsers.length,
    }

    // ──────────────── Retention (D1 / D7 for new users last 30 days) ────────────────
    const since30 = new Date(); since30.setDate(since30.getDate() - 30)
    const retentionResult = await prisma.$queryRaw<{ cohort: bigint; d1: bigint; d7: bigint }[]>`
      WITH first_seen AS (
        SELECT user_id, MIN(created_at)::date AS first_day
        FROM "FeatureEvent"
        GROUP BY user_id
      ),
      cohort AS (
        SELECT user_id, first_day FROM first_seen
        WHERE first_day >= ${since30}::date AND first_day <= (CURRENT_DATE - INTERVAL '1 day')::date
      ),
      activity AS (
        SELECT DISTINCT user_id, created_at::date AS day
        FROM "FeatureEvent"
        WHERE created_at >= ${since30}::date
      )
      SELECT
        COUNT(DISTINCT c.user_id) AS cohort,
        COUNT(DISTINCT CASE WHEN a.day = c.first_day + INTERVAL '1 day' THEN c.user_id END) AS d1,
        COUNT(DISTINCT CASE WHEN a.day BETWEEN c.first_day + INTERVAL '6 days' AND c.first_day + INTERVAL '8 days' THEN c.user_id END) AS d7
      FROM cohort c LEFT JOIN activity a ON a.user_id = c.user_id
    `
    const retention = {
      cohort: Number(retentionResult[0]?.cohort ?? 0),
      d1: Number(retentionResult[0]?.d1 ?? 0),
      d7: Number(retentionResult[0]?.d7 ?? 0),
    }

    // ──────────────── Notifications ────────────────
    const notifTotal = await prisma.notificationSendLog.count({ where: { sent_at: { gte: since } } })
    const notifByType = await prisma.notificationSendLog.groupBy({
      by: ['type'], _count: { id: true },
      where: { sent_at: { gte: since } },
      orderBy: { _count: { id: 'desc' } }, take: 8,
    })

    // ──────────────── AI cost ────────────────
    const aiAgg = await prisma.aiCallLog.aggregate({
      _count: { id: true },
      _sum: { prompt_tokens: true, completion_tokens: true },
      where: { created_at: { gte: since } },
    })
    const aiFailures = await prisma.aiCallLog.count({ where: { created_at: { gte: since }, outcome: 'failed' } })
    const aiByEndpoint = await prisma.aiCallLog.groupBy({
      by: ['endpoint'], _count: { id: true },
      _sum: { prompt_tokens: true, completion_tokens: true },
      where: { created_at: { gte: since } },
      orderBy: { _count: { id: 'desc' } }, take: 8,
    })
    const aiCost = {
      calls: aiAgg._count.id,
      promptTokens: aiAgg._sum.prompt_tokens ?? 0,
      completionTokens: aiAgg._sum.completion_tokens ?? 0,
      failures: aiFailures,
      byEndpoint: aiByEndpoint.map(r => ({
        endpoint: r.endpoint,
        calls: r._count.id,
        tokens: (r._sum.prompt_tokens ?? 0) + (r._sum.completion_tokens ?? 0),
      })),
    }

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
      funnel,
      retention,
      notifications: {
        total: notifTotal,
        byType: notifByType.map(r => ({ type: r.type, count: r._count.id })),
      },
      aiCost,
    })
  } catch (error) {
    console.error('[analytics/stats] error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
