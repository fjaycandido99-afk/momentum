import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - List user's playlists
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const playlists = await prisma.playlist.findMany({
      where: { user_id: user.id },
      include: { items: { orderBy: { position: 'asc' }, take: 4 } },
      orderBy: { updated_at: 'desc' },
    })

    return NextResponse.json({ playlists })
  } catch (error) {
    console.error('Get playlists error:', error)
    return NextResponse.json({ error: 'Failed to get playlists' }, { status: 500 })
  }
}

// POST - Create a new playlist
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, description } = await request.json()
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    // Check freemium limit
    const sub = await prisma.subscription.findUnique({ where: { user_id: user.id } })
    const isPremium = sub?.tier === 'premium' && (sub?.status === 'active' || sub?.status === 'trialing')

    if (!isPremium) {
      const count = await prisma.playlist.count({ where: { user_id: user.id } })
      if (count >= 1) {
        return NextResponse.json({ error: 'Free users can create 1 playlist. Upgrade for unlimited.' }, { status: 403 })
      }
    }

    const playlist = await prisma.playlist.create({
      data: { user_id: user.id, name, description },
    })

    return NextResponse.json({ playlist })
  } catch (error) {
    console.error('Create playlist error:', error)
    return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 })
  }
}
