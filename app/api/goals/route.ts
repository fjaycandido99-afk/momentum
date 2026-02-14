import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isPremiumUser } from '@/lib/subscription-check'

export const dynamic = 'force-dynamic'

// GET - List active goals
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isPremium = await isPremiumUser(user.id)

    if (!isPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    const goals = await prisma.goal.findMany({
      where: {
        user_id: user.id,
        status: { in: ['active', 'completed'] },
      },
      orderBy: [
        { status: 'asc' },
        { created_at: 'desc' },
      ],
    })

    return NextResponse.json({ goals })
  } catch (error) {
    console.error('Goals GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
  }
}

// POST - Create new goal
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isPremium = await isPremiumUser(user.id)

    if (!isPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    const { title, description, frequency, target_count } = await request.json()

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title required' }, { status: 400 })
    }

    const validFrequencies = ['daily', 'weekly', 'monthly']
    const safeFrequency = validFrequencies.includes(frequency) ? frequency : 'daily'
    const safeTarget = typeof target_count === 'number' && target_count > 0 ? target_count : 1

    const goal = await prisma.goal.create({
      data: {
        user_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        frequency: safeFrequency,
        target_count: safeTarget,
        period_start: new Date(),
      },
    })

    return NextResponse.json({ goal })
  } catch (error) {
    console.error('Goals POST error:', error)
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
  }
}

// PATCH - Update/increment goal
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isPremium = await isPremiumUser(user.id)

    if (!isPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    const { id, increment, status, title, description, target_count } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Goal ID required' }, { status: 400 })
    }

    // Verify ownership
    const existing = await prisma.goal.findFirst({
      where: { id, user_id: user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (increment) {
      const newCount = existing.current_count + 1
      updateData.current_count = newCount
      // Auto-complete if target reached
      if (newCount >= existing.target_count) {
        updateData.status = 'completed'
      }
    }

    if (status !== undefined && typeof status === 'string') updateData.status = status
    if (title !== undefined && typeof title === 'string' && title.trim()) updateData.title = title.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (target_count !== undefined && typeof target_count === 'number' && target_count > 0) updateData.target_count = target_count

    const goal = await prisma.goal.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ goal })
  } catch (error) {
    console.error('Goals PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
  }
}

// DELETE - Archive goal
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isPremium = await isPremiumUser(user.id)

    if (!isPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Goal ID required' }, { status: 400 })
    }

    // Verify ownership
    const existing = await prisma.goal.findFirst({
      where: { id, user_id: user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    await prisma.goal.update({
      where: { id },
      data: { status: 'archived' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Goals DELETE error:', error)
    return NextResponse.json({ error: 'Failed to archive goal' }, { status: 500 })
  }
}
