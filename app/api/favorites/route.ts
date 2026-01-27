import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - List favorites, optional ?type= filter
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const contentType = searchParams.get('type')

    const favorites = await prisma.favoriteContent.findMany({
      where: {
        user_id: user.id,
        ...(contentType && { content_type: contentType }),
      },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json({ favorites })
  } catch (error) {
    console.error('Get favorites error:', error)
    return NextResponse.json({ error: 'Failed to get favorites' }, { status: 500 })
  }
}

// POST - Add a favorite
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content_type, content_text } = await request.json()

    if (!content_type || !content_text) {
      return NextResponse.json({ error: 'content_type and content_text required' }, { status: 400 })
    }

    // Check for duplicate
    const existing = await prisma.favoriteContent.findFirst({
      where: {
        user_id: user.id,
        content_type,
        content_text,
      },
    })

    if (existing) {
      return NextResponse.json({ favorite: existing, duplicate: true })
    }

    const favorite = await prisma.favoriteContent.create({
      data: {
        user_id: user.id,
        content_type,
        content_text,
      },
    })

    return NextResponse.json({ favorite })
  } catch (error) {
    console.error('Add favorite error:', error)
    return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 })
  }
}

// DELETE - Remove a favorite by id
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    // Verify ownership
    const favorite = await prisma.favoriteContent.findFirst({
      where: { id, user_id: user.id },
    })

    if (!favorite) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.favoriteContent.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete favorite error:', error)
    return NextResponse.json({ error: 'Failed to delete favorite' }, { status: 500 })
  }
}
