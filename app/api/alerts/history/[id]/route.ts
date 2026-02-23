import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const VALID_ACTIONS = ['delivered', 'read', 'clicked', 'dismissed'] as const
type TrackingAction = (typeof VALID_ACTIONS)[number]

// PATCH - Update delivery tracking
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action } = await request.json()

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Use: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify ownership
    const entry = await prisma.alertHistory.findFirst({
      where: { id, user_id: user.id },
    })

    if (!entry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Build update — upstream timestamps auto-fill
    const now = new Date()
    const updates: Record<string, Date> = {}

    const act = action as TrackingAction

    if (act === 'clicked') {
      // Clicking implies delivered + read
      if (!entry.delivered_at) updates.delivered_at = now
      if (!entry.read_at) updates.read_at = now
      if (!entry.clicked_at) updates.clicked_at = now
    } else if (act === 'read') {
      // Reading implies delivered
      if (!entry.delivered_at) updates.delivered_at = now
      if (!entry.read_at) updates.read_at = now
    } else if (act === 'delivered') {
      if (!entry.delivered_at) updates.delivered_at = now
    } else if (act === 'dismissed') {
      if (!entry.delivered_at) updates.delivered_at = now
      if (!entry.dismissed_at) updates.dismissed_at = now
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true, message: 'Already tracked' })
    }

    // Also mark status as delivered if currently sent
    const statusUpdate = entry.status === 'sent' && updates.delivered_at
      ? { status: 'delivered' as const }
      : {}

    const updated = await prisma.alertHistory.update({
      where: { id },
      data: { ...updates, ...statusUpdate },
    })

    return NextResponse.json({ success: true, history: updated })
  } catch (error) {
    console.error('Update alert history error:', error)
    return NextResponse.json({ error: 'Failed to update history' }, { status: 500 })
  }
}
