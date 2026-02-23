import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isPremiumUser } from '@/lib/subscription-check'
import { getEffectiveSettings, calculateNextRun } from '@/lib/alert-service'

export const dynamic = 'force-dynamic'

const VALID_RECURRENCES = ['daily', 'weekly', 'custom']
const MAX_PENDING_PER_USER = 50

// POST - Schedule a future alert
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      alert_type_id,
      scheduled_at,
      expires_at,
      recurrence,
      recurrence_rule,
      title,
      body: alertBody,
      data,
    } = body

    if (!alert_type_id) {
      return NextResponse.json({ error: 'alert_type_id required' }, { status: 400 })
    }
    if (!scheduled_at) {
      return NextResponse.json({ error: 'scheduled_at required' }, { status: 400 })
    }
    if (!title || !alertBody) {
      return NextResponse.json({ error: 'title and body required' }, { status: 400 })
    }

    // Validate scheduled_at is in the future
    const scheduledDate = new Date(scheduled_at)
    if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      return NextResponse.json({ error: 'scheduled_at must be a valid future date' }, { status: 400 })
    }

    // Validate recurrence
    if (recurrence && !VALID_RECURRENCES.includes(recurrence)) {
      return NextResponse.json({ error: `Invalid recurrence. Use: ${VALID_RECURRENCES.join(', ')}` }, { status: 400 })
    }
    if (recurrence === 'custom' && !recurrence_rule) {
      return NextResponse.json({ error: 'recurrence_rule required for custom recurrence' }, { status: 400 })
    }

    // Validate alert type exists
    const settings = await getEffectiveSettings(user.id, alert_type_id)
    if (!settings) {
      return NextResponse.json({ error: 'Unknown alert type' }, { status: 404 })
    }

    // Check premium
    if (settings.premiumOnly) {
      const premium = await isPremiumUser(user.id)
      if (!premium) {
        return NextResponse.json({ error: 'Premium subscription required' }, { status: 403 })
      }
    }

    // Check max pending alerts
    const pendingCount = await prisma.scheduledAlert.count({
      where: {
        user_id: user.id,
        status: { in: ['pending', 'queued'] },
      },
    })
    if (pendingCount >= MAX_PENDING_PER_USER) {
      return NextResponse.json(
        { error: `Maximum ${MAX_PENDING_PER_USER} pending alerts allowed` },
        { status: 400 }
      )
    }

    // Calculate next_run_at for recurring alerts
    const nextRun = recurrence
      ? calculateNextRun(recurrence, recurrence_rule || null, scheduledDate)
      : null

    const scheduled = await prisma.scheduledAlert.create({
      data: {
        user_id: user.id,
        alert_type_id,
        priority: settings.priority,
        channel: settings.channel,
        scheduled_at: scheduledDate,
        expires_at: expires_at ? new Date(expires_at) : null,
        recurrence: recurrence || null,
        recurrence_rule: recurrence_rule || null,
        next_run_at: nextRun,
        title,
        body: alertBody,
        data: data || {},
      },
    })

    return NextResponse.json({ scheduled })
  } catch (error) {
    console.error('Schedule alert error:', error)
    return NextResponse.json({ error: 'Failed to schedule alert' }, { status: 500 })
  }
}
