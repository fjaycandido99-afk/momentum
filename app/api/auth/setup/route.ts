import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { userId, email, name } = body

    // Validate required fields
    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify authenticated user matches requested userId
    if (user.id !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    })

    if (existingUser) {
      // Ensure subscription exists for existing users
      if (!existingUser.subscription) {
        await prisma.subscription.create({
          data: {
            user_id: existingUser.id,
            tier: 'free',
            status: 'active',
          },
        })
      }

      return NextResponse.json({
        success: true,
        data: { user: existingUser }
      })
    }

    // Create user
    const newUser = await prisma.user.create({
      data: {
        id: userId,
        email,
        name: name || null,
      },
    })

    // Create default preferences
    await prisma.userPreferences.create({
      data: {
        user_id: newUser.id,
        voice_style: 'calm',
        activity_type: 'workout',
        daily_reminder: true,
      },
    })

    // Create default free subscription
    await prisma.subscription.create({
      data: {
        user_id: newUser.id,
        tier: 'free',
        status: 'active',
      },
    })

    return NextResponse.json({ success: true, data: { user: newUser } })
  } catch (error) {
    console.error('Auth setup error:', error)
    return NextResponse.json(
      { error: 'Failed to set up account' },
      { status: 500 }
    )
  }
}
