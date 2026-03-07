import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { sendPushToUser } from '@/lib/push-service'
import { isAPNsConfigured } from '@/lib/apns'

export const dynamic = 'force-dynamic'

// GET - Check push notification status for current user
export async function GET() {
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

    return NextResponse.json({
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
    })
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
