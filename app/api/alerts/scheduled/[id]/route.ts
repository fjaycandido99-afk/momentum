import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// DELETE - Cancel a scheduled alert
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find and verify ownership
    const alert = await prisma.scheduledAlert.findFirst({
      where: { id, user_id: user.id },
    })

    if (!alert) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Can't cancel already-sent alerts
    if (alert.status === 'sent') {
      return NextResponse.json({ error: 'Cannot cancel an already-sent alert' }, { status: 400 })
    }

    await prisma.scheduledAlert.update({
      where: { id },
      data: { status: 'cancelled' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cancel scheduled alert error:', error)
    return NextResponse.json({ error: 'Failed to cancel alert' }, { status: 500 })
  }
}
