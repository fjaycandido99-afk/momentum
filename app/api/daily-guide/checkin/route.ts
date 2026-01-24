import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDateString } from '@/lib/daily-guide/day-type'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// All valid segments that can be checked in
const VALID_SEGMENTS = [
  // Morning flow segments
  'morning_prime',
  'movement',
  'workout',
  'micro_lesson',
  'breath',
  // Evening
  'day_close',
  // Checkpoints
  'checkpoint_1',
  'checkpoint_2',
  'checkpoint_3',
  // Student-specific
  'pre_study',
  'study_break',
  'exam_calm',
  // Legacy
  'morning',
  'midday',
  'afternoon',
  'evening',
]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { segment, date: dateStr } = body

    if (!segment || !VALID_SEGMENTS.includes(segment)) {
      return NextResponse.json(
        { error: 'Invalid segment parameter' },
        { status: 400 }
      )
    }

    const date = dateStr ? new Date(dateStr) : new Date()
    const dateKey = getDateString(date)

    // Build update data based on segment
    const updateData: Record<string, boolean> = {}

    switch (segment) {
      case 'morning_prime':
        updateData.morning_prime_done = true
        updateData.morning_played = true // Legacy
        break
      case 'movement':
      case 'workout':
        updateData.movement_done = true
        updateData.workout_completed = true // Legacy
        break
      case 'micro_lesson':
        updateData.micro_lesson_done = true
        break
      case 'breath':
        updateData.breath_done = true
        break
      case 'day_close':
        updateData.day_close_done = true
        updateData.evening_played = true // Legacy
        break
      case 'checkpoint_1':
        updateData.checkpoint_1_done = true
        break
      case 'checkpoint_2':
        updateData.checkpoint_2_done = true
        break
      case 'checkpoint_3':
        updateData.checkpoint_3_done = true
        break
      // Legacy segment mappings
      case 'morning':
        updateData.morning_prime_done = true
        updateData.morning_played = true
        break
      case 'evening':
        updateData.day_close_done = true
        updateData.evening_played = true
        break
      default:
        // Other segments (pre_study, study_break, exam_calm) don't have dedicated tracking fields
        // Just return success without persisting
        return NextResponse.json({
          success: true,
          message: `${segment} segment tracked`,
        })
    }

    const guide = await prisma.dailyGuide.update({
      where: {
        user_id_date: {
          user_id: user.id,
          date: new Date(dateKey),
        },
      },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      data: {
        morning_prime_done: guide.morning_prime_done,
        movement_done: guide.movement_done,
        micro_lesson_done: guide.micro_lesson_done,
        breath_done: guide.breath_done,
        day_close_done: guide.day_close_done,
        checkpoint_1_done: guide.checkpoint_1_done,
        checkpoint_2_done: guide.checkpoint_2_done,
        checkpoint_3_done: guide.checkpoint_3_done,
        // Legacy
        morning_played: guide.morning_played,
        evening_played: guide.evening_played,
      },
    })
  } catch (error) {
    console.error('Daily guide checkin error:', error)
    return NextResponse.json(
      { error: 'Failed to record checkin' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { date: dateStr, isRecoveryDay, dayType } = body

    const date = dateStr ? new Date(dateStr) : new Date()
    const dateKey = getDateString(date)

    // Update day type
    const newDayType = dayType || (isRecoveryDay ? 'recovery' : 'work')

    const guide = await prisma.dailyGuide.update({
      where: {
        user_id_date: {
          user_id: user.id,
          date: new Date(dateKey),
        },
      },
      data: {
        day_type: newDayType,
      },
    })

    return NextResponse.json({
      success: true,
      data: guide,
    })
  } catch (error) {
    console.error('Daily guide day type update error:', error)
    return NextResponse.json(
      { error: 'Failed to update day type' },
      { status: 500 }
    )
  }
}
