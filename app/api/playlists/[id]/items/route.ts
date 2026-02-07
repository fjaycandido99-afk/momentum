import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST - Add item to playlist
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const playlist = await prisma.playlist.findFirst({ where: { id, user_id: user.id } })
    if (!playlist) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { content_type, content_id, title, subtitle, genre_id, thumbnail } = await request.json()
    if (!content_type || !content_id || !title) {
      return NextResponse.json({ error: 'content_type, content_id, and title required' }, { status: 400 })
    }

    // Get max position
    const maxItem = await prisma.playlistItem.findFirst({
      where: { playlist_id: id },
      orderBy: { position: 'desc' },
    })
    const nextPos = (maxItem?.position ?? -1) + 1

    const item = await prisma.playlistItem.create({
      data: {
        playlist_id: id,
        content_type,
        content_id,
        title,
        subtitle,
        genre_id,
        thumbnail,
        position: nextPos,
      },
    })

    return NextResponse.json({ item })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Item already in playlist' }, { status: 409 })
    }
    console.error('Add playlist item error:', error)
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 })
  }
}

// DELETE - Remove item from playlist
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const playlist = await prisma.playlist.findFirst({ where: { id, user_id: user.id } })
    if (!playlist) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { itemId } = await request.json()
    if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 })

    await prisma.playlistItem.delete({ where: { id: itemId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove playlist item error:', error)
    return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 })
  }
}
