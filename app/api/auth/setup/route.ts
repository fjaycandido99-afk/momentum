import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email, name } = body

    // Validate required fields
    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (existingUser) {
      // User already set up, return success
      return NextResponse.json({
        success: true,
        data: { user: existingUser }
      })
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        id: userId,
        email,
        name: name || null,
      },
    })

    // Create default preferences
    await prisma.userPreferences.create({
      data: {
        user_id: user.id,
        voice_style: 'calm',
        session_length: 20,
        activity_type: 'workout',
        daily_reminder: true,
      },
    })

    return NextResponse.json({ success: true, data: { user } })
  } catch (error) {
    console.error('Auth setup error:', error)
    return NextResponse.json(
      { error: 'Failed to set up account' },
      { status: 500 }
    )
  }
}
