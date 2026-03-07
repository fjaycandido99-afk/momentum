import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { revenuecatUserId } = await request.json()

    if (!revenuecatUserId) {
      return NextResponse.json({ error: 'Missing revenuecatUserId' }, { status: 400 })
    }

    // Upsert subscription with revenuecat_user_id
    await prisma.subscription.upsert({
      where: { user_id: user.id },
      update: { revenuecat_user_id: revenuecatUserId },
      create: {
        user_id: user.id,
        revenuecat_user_id: revenuecatUserId,
        tier: 'free',
        status: 'active',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Link RevenueCat error:', error)
    return NextResponse.json({ error: 'Failed to link' }, { status: 500 })
  }
}
