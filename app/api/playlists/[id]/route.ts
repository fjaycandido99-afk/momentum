import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Get single playlist with items
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const playlist = await prisma.playlist.findFirst({
      where: { id, user_id: user.id },
      include: { items: { orderBy: { position: 'asc' } } },
    })

    if (!playlist) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ playlist })
  } catch (error) {
    console.error('Get playlist error:', error)
    return NextResponse.json({ error: 'Failed to get playlist' }, { status: 500 })
  }
}

// PATCH - Rename or reorder
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const existing = await prisma.playlist.findFirst({ where: { id, user_id: user.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await prisma.playlist.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
      },
    })

    // Reorder items if provided
    if (body.itemOrder && Array.isArray(body.itemOrder)) {
      const playlistItems = await prisma.playlistItem.findMany({
        where: { playlist_id: id },
        select: { id: true }
      })
      const validIds = new Set(playlistItems.map(i => i.id))
      const allValid = body.itemOrder.every((itemId: string) => validIds.has(itemId))
      if (!allValid) return NextResponse.json({ error: 'Invalid item IDs' }, { status: 400 })

      const updates = body.itemOrder.map((itemId: string, index: number) =>
        prisma.playlistItem.update({ where: { id: itemId }, data: { position: index } })
      )
      await prisma.$transaction(updates)
    }

    return NextResponse.json({ playlist: updated })
  } catch (error) {
    console.error('Update playlist error:', error)
    return NextResponse.json({ error: 'Failed to update playlist' }, { status: 500 })
  }
}

// DELETE - Delete playlist
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const existing = await prisma.playlist.findFirst({ where: { id, user_id: user.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.playlist.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete playlist error:', error)
    return NextResponse.json({ error: 'Failed to delete playlist' }, { status: 500 })
  }
}
