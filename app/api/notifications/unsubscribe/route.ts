import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// POST - Unsubscribe from push notifications
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint required' }, { status: 400 })
    }

    // Delete the subscription
    await prisma.pushSubscription.deleteMany({
      where: {
        user_id: user.id,
        endpoint,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    )
  }
}
