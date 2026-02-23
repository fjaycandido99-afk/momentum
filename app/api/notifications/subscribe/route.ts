import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// POST - Subscribe to push notifications
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { subscription, nativeToken, platform = 'web' } = body

    // Handle native app subscription (iOS/Android)
    if (nativeToken) {
      const endpoint = `native://${platform}/${user.id}`

      const savedSubscription = await prisma.pushSubscription.upsert({
        where: {
          endpoint,
        },
        update: {
          user_id: user.id,
          native_token: nativeToken,
          platform,
          updated_at: new Date(),
        },
        create: {
          user_id: user.id,
          endpoint,
          native_token: nativeToken,
          platform,
          p256dh: '',
          auth: '',
        },
      })

      return NextResponse.json({
        success: true,
        id: savedSubscription.id,
        platform,
      })
    }

    // Handle web push subscription
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    // Extract keys from subscription
    const p256dh = subscription.keys?.p256dh || ''
    const auth = subscription.keys?.auth || ''

    // Upsert the subscription
    const savedSubscription = await prisma.pushSubscription.upsert({
      where: {
        endpoint: subscription.endpoint,
      },
      update: {
        user_id: user.id,
        p256dh,
        auth,
        platform: platform || 'web',
        updated_at: new Date(),
      },
      create: {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        platform: platform || 'web',
      },
    })

    return NextResponse.json({
      success: true,
      id: savedSubscription.id,
    })
  } catch (error) {
    console.error('Subscribe error:', error)
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    )
  }
}

// GET - Get current subscription status
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { user_id: user.id },
      select: {
        id: true,
        endpoint: true,
        morning_reminder: true,
        checkpoint_alerts: true,
        evening_reminder: true,
        streak_alerts: true,
        weekly_review: true,
        insight_alerts: true,
        daily_quote_alerts: true,
        daily_affirmation_alerts: true,
        motivational_nudge_alerts: true,
        daily_motivation_alerts: true,
        featured_music_alerts: true,
        coach_checkin_alerts: true,
        coach_accountability_alerts: true,
        created_at: true,
      },
    })

    return NextResponse.json({
      subscribed: subscriptions.length > 0,
      subscriptions,
    })
  } catch (error) {
    console.error('Get subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    )
  }
}

// PATCH - Update notification preferences
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      morning_reminder,
      checkpoint_alerts,
      evening_reminder,
      streak_alerts,
      weekly_review,
      daily_quote_alerts,
      daily_affirmation_alerts,
      motivational_nudge_alerts,
      daily_motivation_alerts,
      featured_music_alerts,
      coach_checkin_alerts,
      coach_accountability_alerts,
    } = body

    // Update all user's subscriptions
    await prisma.pushSubscription.updateMany({
      where: { user_id: user.id },
      data: {
        ...(morning_reminder !== undefined && { morning_reminder }),
        ...(checkpoint_alerts !== undefined && { checkpoint_alerts }),
        ...(evening_reminder !== undefined && { evening_reminder }),
        ...(streak_alerts !== undefined && { streak_alerts }),
        ...(weekly_review !== undefined && { weekly_review }),
        ...(daily_quote_alerts !== undefined && { daily_quote_alerts }),
        ...(daily_affirmation_alerts !== undefined && { daily_affirmation_alerts }),
        ...(motivational_nudge_alerts !== undefined && { motivational_nudge_alerts }),
        ...(daily_motivation_alerts !== undefined && { daily_motivation_alerts }),
        ...(featured_music_alerts !== undefined && { featured_music_alerts }),
        ...(coach_checkin_alerts !== undefined && { coach_checkin_alerts }),
        ...(coach_accountability_alerts !== undefined && { coach_accountability_alerts }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update preferences error:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
