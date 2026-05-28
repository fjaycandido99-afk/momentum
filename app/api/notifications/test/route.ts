import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { sendPushToUser } from '@/lib/push-service'
import { isAPNsConfigured, sendAPNsNotification } from '@/lib/apns'

export const dynamic = 'force-dynamic'

// GET - Check push notification status for current user.
// Append `?send=1` to ALSO fire a test push end-to-end (custom type, bypasses
// the cron filter + send gate) and report the raw APNs status — so we can tell
// the difference between an APNs delivery failure and a cron/gate suppression.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { user_id: user.id },
      select: {
        id: true,
        endpoint: true,
        platform: true,
        native_token: true,
        created_at: true,
        updated_at: true,
      },
    })

    const baseInfo = {
      userId: user.id,
      apnsConfigured: isAPNsConfigured(),
      apnsProduction: process.env.APNS_PRODUCTION === 'true',
      bundleId: process.env.APNS_BUNDLE_ID || 'NOT SET',
      subscriptionCount: subscriptions.length,
      subscriptions: subscriptions.map(s => ({
        id: s.id,
        platform: s.platform,
        endpoint: s.endpoint,
        hasNativeToken: !!s.native_token,
        tokenPrefix: s.native_token ? s.native_token.substring(0, 8) + '...' : null,
        created: s.created_at,
        updated: s.updated_at,
      })),
    }

    const send = request.nextUrl.searchParams.get('send')
    if (send !== '1') return NextResponse.json(baseInfo)

    // Fire a real test push, both via the high-level sendPushToUser AND a
    // direct APNs call — that way we get BOTH counts (the gate-aware path) AND
    // the raw APNs status code/reason (what Apple actually said about the token).
    const high = await sendPushToUser(user.id, 'custom', {
      title: 'Voxu — Test push',
      body: 'If you see this on your home screen, server push works end-to-end.',
      data: { type: 'custom', url: '/' },
    })

    let direct: unknown = null
    const nativeSub = subscriptions.find(s => s.native_token)
    if (nativeSub?.native_token) {
      try {
        direct = await sendAPNsNotification(nativeSub.native_token, {
          title: 'Voxu — Direct APNs',
          body: 'Direct test bypassing sendPushToUser.',
        })
      } catch (e) {
        direct = { error: (e as Error).message }
      }
    }

    return NextResponse.json({ ...baseInfo, testSend: { high, direct } })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// POST - Send a test notification to yourself
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const result = await sendPushToUser(user.id, 'custom', {
      title: 'Voxu Test',
      body: 'Push notifications are working!',
      data: { type: 'custom', url: '/' },
    })

    return NextResponse.json({
      ...result,
      apnsConfigured: isAPNsConfigured(),
      apnsProduction: process.env.APNS_PRODUCTION === 'true',
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
