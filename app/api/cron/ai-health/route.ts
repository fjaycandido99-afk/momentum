/**
 * GET /api/cron/ai-health — watches the AI and tells you when it breaks.
 *
 * The seventeen-day outage was not a monitoring gap in the usual sense.
 * AiCallLog recorded every single failure, correctly, the whole time. What
 * was missing was anything that READ it. This is that.
 *
 * Fires once per incident, not once per hour, and announces recovery once.
 * An alert that repeats every hour gets filtered, and a filtered alert is
 * the same as no alert.
 *
 * Also safe to hit by hand — it returns the current health report, so
 * "is the AI up?" is answerable without a database client.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { assessHealth, isAlerting } from '@/lib/ai/health'
import { sendAlertEmail, isAlertEmailConfigured } from '@/lib/ai/alert-email'

export const dynamic = 'force-dynamic'

const WINDOW_MINUTES = Number(process.env.AI_HEALTH_WINDOW_MINUTES ?? 90)
const KIND = 'ai_failure'

export async function GET(request: NextRequest) {
  // Vercel cron sends this header. A bare GET is still allowed so the
  // owner can check health from a browser.
  const isCron = request.headers.get('user-agent')?.includes('vercel-cron')
  const secret = request.nextUrl.searchParams.get('secret')
  const authorised = isCron || !process.env.CRON_SECRET || secret === process.env.CRON_SECRET

  try {
    const since = new Date(Date.now() - WINDOW_MINUTES * 60_000)

    const rows = await prisma.aiCallLog.findMany({
      where: { created_at: { gte: since } },
      select: { outcome: true, error: true },
      orderBy: { created_at: 'desc' },
      take: 500,
    })

    const report = assessHealth(rows, `the last ${WINDOW_MINUTES} minutes`)

    // Reading health is harmless; only SENDING is gated.
    if (!authorised) {
      return NextResponse.json({ ...report, alerted: false, note: 'read-only' })
    }

    const last = await prisma.systemAlert.findFirst({
      where: { kind: KIND },
      orderBy: { created_at: 'desc' },
      select: { state: true },
    })
    const alreadyFiring = last?.state === 'firing'

    let alerted = false
    let emailError: string | undefined

    if (isAlerting(report.verdict) && !alreadyFiring) {
      // New incident.
      const body = [
        report.summary,
        '',
        report.errors.length ? `Errors seen:\n${report.errors.map(e => `  - ${e}`).join('\n')}` : 'No error text recorded.',
        '',
        'Check: https://console.groq.com/settings/billing',
        'Models can be repointed without a deploy via the GROQ_MODELS env var.',
      ].join('\n')

      const sent = await sendAlertEmail({ subject: `[Voxu] ${report.summary}`, body })
      if (!sent.ok) emailError = sent.error

      // Record the incident even if the email failed, so the console error
      // below is the only thing that repeats — not a mail attempt per hour.
      await prisma.systemAlert.create({
        data: { kind: KIND, state: 'firing', detail: report.summary.slice(0, 500) },
      })
      alerted = true

      console.error(`[ai-health] ALERT: ${report.summary}`, { errors: report.errors, emailError })
    } else if (report.verdict === 'healthy' && alreadyFiring) {
      // Recovered. Say so once, then go quiet.
      await sendAlertEmail({
        subject: '[Voxu] AI recovered',
        body: `${report.summary}\n\nThe previous incident is resolved.`,
      })
      await prisma.systemAlert.create({
        data: { kind: KIND, state: 'resolved', detail: report.summary.slice(0, 500) },
      })
      alerted = true
      console.log(`[ai-health] RECOVERED: ${report.summary}`)
    }

    return NextResponse.json({
      ...report,
      alerted,
      emailConfigured: isAlertEmailConfigured(),
      emailError,
    })
  } catch (error) {
    console.error('[ai-health] check failed:', error)
    return NextResponse.json({ error: 'health check failed' }, { status: 500 })
  }
}
