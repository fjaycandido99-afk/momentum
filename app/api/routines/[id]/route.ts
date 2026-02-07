import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Get single routine with steps
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const routine = await prisma.routine.findFirst({
      where: { id, user_id: user.id },
      include: { steps: { orderBy: { position: 'asc' } } },
    })

    if (!routine) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ routine })
  } catch (error) {
    console.error('Get routine error:', error)
    return NextResponse.json({ error: 'Failed to get routine' }, { status: 500 })
  }
}

// PATCH - Update routine
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const existing = await prisma.routine.findFirst({ where: { id, user_id: user.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()

    const updated = await prisma.routine.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.icon !== undefined && { icon: body.icon }),
      },
    })

    return NextResponse.json({ routine: updated })
  } catch (error) {
    console.error('Update routine error:', error)
    return NextResponse.json({ error: 'Failed to update routine' }, { status: 500 })
  }
}

// DELETE - Delete routine
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const existing = await prisma.routine.findFirst({ where: { id, user_id: user.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.routine.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete routine error:', error)
    return NextResponse.json({ error: 'Failed to delete routine' }, { status: 500 })
  }
}
