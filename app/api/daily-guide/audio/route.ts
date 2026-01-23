import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import {
  getCachedAudio,
  setCachedAudio,
  generateAndCacheAudio,
} from '@/lib/daily-guide/audio-cache'
import { getDateString } from '@/lib/daily-guide/day-type'
import type { ModuleType } from '@/lib/daily-guide/decision-tree'

// All valid module/segment types
const VALID_MODULES = [
  'morning',
  'evening',
  'midday',
  'afternoon',
  'morning_prime',
  'workout',
  'breath',
  'micro_lesson',
  'day_close',
  'checkpoint_1',
  'checkpoint_2',
  'checkpoint_3',
  'tomorrow_preview',
]

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const segment = searchParams.get('segment')
    const dateStr = searchParams.get('date')

    if (!segment || !VALID_MODULES.includes(segment)) {
      return NextResponse.json(
        { error: 'Invalid segment parameter' },
        { status: 400 }
      )
    }

    const date = dateStr ? new Date(dateStr) : new Date()
    const dateKey = getDateString(date)

    // Check file cache first
    const cached = getCachedAudio(user.id, dateKey, segment)
    if (cached) {
      console.log(`[Daily Guide Audio Cache HIT] ${user.id}/${dateKey}/${segment}`)
      return NextResponse.json({
        script: cached.script,
        audioBase64: cached.audioBase64,
        duration: cached.duration,
        segment,
        cached: true,
      })
    }

    // Get the script from the daily guide
    const guide = await prisma.dailyGuide.findUnique({
      where: {
        user_id_date: {
          user_id: user.id,
          date: new Date(dateKey),
        },
      },
    })

    if (!guide) {
      return NextResponse.json(
        { error: 'Daily guide not found for this date' },
        { status: 404 }
      )
    }

    // Get the appropriate script based on segment
    let script: string | null = null
    switch (segment) {
      // Legacy segments
      case 'morning':
        script = guide.morning_prime_script || guide.morning_script
        break
      case 'evening':
        script = guide.day_close_script || guide.evening_script
        break
      case 'midday':
        script = guide.checkpoint_2_script || (guide as any).midday_script
        break
      case 'afternoon':
        script = guide.checkpoint_3_script || (guide as any).afternoon_script
        break
      // New module types
      case 'morning_prime':
        script = guide.morning_prime_script || guide.morning_script
        break
      case 'workout':
        script = guide.workout_script
        break
      case 'breath':
        script = guide.breath_script
        break
      case 'micro_lesson':
        script = guide.micro_lesson_script || guide.micro_lesson
        break
      case 'day_close':
        script = guide.day_close_script || guide.evening_script
        break
      case 'checkpoint_1':
        script = guide.checkpoint_1_script
        break
      case 'checkpoint_2':
        script = guide.checkpoint_2_script
        break
      case 'checkpoint_3':
        script = guide.checkpoint_3_script
        break
      case 'tomorrow_preview':
        script = guide.tomorrow_preview
        break
    }

    if (!script) {
      return NextResponse.json(
        { error: `No ${segment} script found for this date` },
        { status: 404 }
      )
    }

    // Generate audio
    const audioResult = await generateAndCacheAudio(script, segment)

    if (!audioResult) {
      return NextResponse.json({
        script,
        audioBase64: null,
        duration: 45,
        segment,
        error: 'Audio generation failed, script only',
      })
    }

    // Cache the audio
    setCachedAudio(
      user.id,
      dateKey,
      segment,
      script,
      audioResult.audioBase64,
      audioResult.duration
    )

    return NextResponse.json({
      script,
      audioBase64: audioResult.audioBase64,
      duration: audioResult.duration,
      segment,
      cached: false,
    })
  } catch (error) {
    console.error('Get daily guide audio error:', error)
    return NextResponse.json(
      { error: 'Failed to get audio' },
      { status: 500 }
    )
  }
}
