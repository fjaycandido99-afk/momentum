import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const VALID_PRIORITIES = ['urgent', 'high', 'normal', 'low']
const VALID_CHANNELS = ['push', 'in_app', 'email']
const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

// GET - Fetch user preferences merged with alert type defaults
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all enabled alert types with user preferences
    const alertTypes = await prisma.alertType.findMany({
      where: { enabled: true },
      include: {
        userPreferences: {
          where: { user_id: user.id },
          take: 1,
        },
      },
      orderBy: [{ category: 'asc' }, { label: 'asc' }],
    })

    const preferences = alertTypes.map((at) => {
      const userPref = at.userPreferences[0] || null
      return {
        alert_type_id: at.id,
        label: at.label,
        description: at.description,
        category: at.category,
        premium_only: at.premium_only,
        enabled: userPref?.enabled ?? true,
        priority: userPref?.priority ?? at.default_priority,
        channel: userPref?.channel ?? at.default_channel,
        quiet_start: userPref?.quiet_start ?? null,
        quiet_end: userPref?.quiet_end ?? null,
        is_default: !userPref,
      }
    })

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Get alert preferences error:', error)
    return NextResponse.json({ error: 'Failed to get preferences' }, { status: 500 })
  }
}

// PUT - Batch upsert preferences
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { preferences } = await request.json()

    if (!Array.isArray(preferences) || preferences.length === 0) {
      return NextResponse.json({ error: 'preferences array required' }, { status: 400 })
    }

    // Validate each preference
    for (const pref of preferences) {
      if (!pref.alert_type_id) {
        return NextResponse.json({ error: 'alert_type_id required for each preference' }, { status: 400 })
      }
      if (pref.priority && !VALID_PRIORITIES.includes(pref.priority)) {
        return NextResponse.json({ error: `Invalid priority: ${pref.priority}` }, { status: 400 })
      }
      if (pref.channel && !VALID_CHANNELS.includes(pref.channel)) {
        return NextResponse.json({ error: `Invalid channel: ${pref.channel}` }, { status: 400 })
      }
      if (pref.quiet_start && !HHMM_REGEX.test(pref.quiet_start)) {
        return NextResponse.json({ error: `Invalid quiet_start format: ${pref.quiet_start}. Use HH:MM` }, { status: 400 })
      }
      if (pref.quiet_end && !HHMM_REGEX.test(pref.quiet_end)) {
        return NextResponse.json({ error: `Invalid quiet_end format: ${pref.quiet_end}. Use HH:MM` }, { status: 400 })
      }
    }

    // Verify all alert types exist
    const typeIds = preferences.map((p: any) => p.alert_type_id)
    const existingTypes = await prisma.alertType.findMany({
      where: { id: { in: typeIds } },
      select: { id: true },
    })
    const existingIds = new Set(existingTypes.map((t) => t.id))
    const missing = typeIds.filter((id: string) => !existingIds.has(id))
    if (missing.length > 0) {
      return NextResponse.json({ error: `Unknown alert_type_id(s): ${missing.join(', ')}` }, { status: 400 })
    }

    // Batch upsert in a transaction
    const result = await prisma.$transaction(
      preferences.map((pref: any) =>
        prisma.userAlertPreference.upsert({
          where: {
            user_id_alert_type_id: {
              user_id: user.id,
              alert_type_id: pref.alert_type_id,
            },
          },
          update: {
            ...(pref.enabled !== undefined && { enabled: pref.enabled }),
            ...(pref.priority !== undefined && { priority: pref.priority || null }),
            ...(pref.channel !== undefined && { channel: pref.channel || null }),
            ...(pref.quiet_start !== undefined && { quiet_start: pref.quiet_start || null }),
            ...(pref.quiet_end !== undefined && { quiet_end: pref.quiet_end || null }),
          },
          create: {
            user_id: user.id,
            alert_type_id: pref.alert_type_id,
            enabled: pref.enabled ?? true,
            priority: pref.priority || null,
            channel: pref.channel || null,
            quiet_start: pref.quiet_start || null,
            quiet_end: pref.quiet_end || null,
          },
        })
      )
    )

    return NextResponse.json({ success: true, updated: result.length })
  } catch (error) {
    console.error('Update alert preferences error:', error)
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
  }
}
