import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import type { FeatureName, FeatureAction } from '@/lib/analytics/track'

export const dynamic = 'force-dynamic'

const VALID_FEATURES = new Set<FeatureName>([
  'focus_timer', 'soundscapes', 'music', 'motivation', 'guided',
  'journal', 'coach', 'daily_guide', 'saved_content', 'settings',
  'dream_interpretation', 'meditation_gen', 'smart_session',
  'morning_briefing', 'letter_to_self', 'wellness_score',
])

const VALID_ACTIONS = new Set<FeatureAction>(['open', 'use', 'complete'])

interface IncomingEvent {
  feature: string
  action: string
  metadata?: string
  ts?: number
}

export async function POST(request: NextRequest) {
  try {
    // Auth — silent fail for guests
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id ?? 'anonymous'

    // Rate limit: 60 events/min per user
    const { allowed } = rateLimit(`analytics:${userId}`, { limit: 60, windowSeconds: 60 })
    if (!allowed) {
      return NextResponse.json({ ok: true }) // silent drop
    }

    const body = await request.json()
    const events: IncomingEvent[] = Array.isArray(body.events) ? body.events : []

    // Validate and filter
    const valid = events
      .filter(e => VALID_FEATURES.has(e.feature as FeatureName) && VALID_ACTIONS.has(e.action as FeatureAction))
      .slice(0, 50) // cap per request

    if (valid.length > 0) {
      await prisma.featureEvent.createMany({
        data: valid.map(e => ({
          user_id: userId,
          feature: e.feature,
          action: e.action,
          metadata: e.metadata || null,
        })),
      })
    }

    return NextResponse.json({ ok: true })
  } catch {
    // Always return ok — never fail the client
    return NextResponse.json({ ok: true })
  }
}
