import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { generateSessionContent } from '@/lib/ai/daily-guide-prompts'
import { getDateString } from '@/lib/daily-guide/day-type'
import { SESSION_DURATIONS } from '@/lib/daily-guide/decision-tree'
import type { SessionType, GuideTone } from '@/lib/daily-guide/decision-tree'
import { rateLimit } from '@/lib/rate-limit'
import { getUserMindset } from '@/lib/mindset/get-user-mindset'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('Auth error in generate:', authError)
    }

    if (!user) {
      console.error('No user found in generate POST. Auth error:', authError?.message)
      return NextResponse.json({
        error: 'Unauthorized',
        details: authError?.message || 'No session found. Please sign in again.'
      }, { status: 401 })
    }

    const { allowed } = rateLimit(`ai-daily-guide:${user.id}`, { limit: 10, windowSeconds: 60 })
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const { date: dateStr, forceRegenerate } = body

    const date = dateStr ? new Date(dateStr) : new Date()
    const dateKey = getDateString(date)

    // Get user preferences, create defaults if not found
    let preferences = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
    })

    if (!preferences) {
      preferences = await prisma.userPreferences.create({
        data: {
          user_id: user.id,
          user_type: 'professional',
          work_days: [1, 2, 3, 4, 5],
          work_start_time: '09:00',
          work_end_time: '17:00',
          wake_time: '07:00',
          class_days: [1, 2, 3, 4, 5],
          class_start_time: '08:00',
          class_end_time: '15:00',
          study_start_time: '18:00',
          study_end_time: '21:00',
          exam_mode: false,
          guide_tone: 'calm',
          daily_guide_enabled: true,
          guide_onboarding_done: true,
          default_time_mode: 'normal',
          workout_enabled: true,
          workout_intensity: 'full',
          micro_lesson_enabled: true,
          breath_cues_enabled: true,
          enabled_segments: ['morning_prime', 'midday_reset', 'wind_down', 'bedtime_story'],
          segment_order: ['morning_prime', 'midday_reset', 'wind_down', 'bedtime_story'],
          background_music_enabled: true,
          current_streak: 0,
        },
      })
    }

    // Check if guide already exists for today
    const existingGuide = await prisma.dailyGuide.findUnique({
      where: {
        user_id_date: {
          user_id: user.id,
          date: new Date(dateKey),
        },
      },
    })

    // If guide exists and not forcing regeneration, return existing
    // But detect stale completion flags from UTC date migration:
    // if bedtime_story_done is true but morning_prime_done is false, the done
    // flags are from a previous day's session stored under today's date key.
    if (existingGuide && !forceRegenerate) {
      if (existingGuide.bedtime_story_done && !existingGuide.morning_prime_done) {
        // Reset stale done flags — keep the scripts
        await prisma.dailyGuide.update({
          where: { id: existingGuide.id },
          data: {
            morning_prime_done: false,
            midday_reset_done: false,
            wind_down_done: false,
            bedtime_story_done: false,
            mood_before: null,
            mood_after: null,
          },
        })
        existingGuide.morning_prime_done = false
        existingGuide.midday_reset_done = false
        existingGuide.wind_down_done = false
        existingGuide.bedtime_story_done = false
        existingGuide.mood_before = null
        existingGuide.mood_after = null
      }
      return NextResponse.json({
        success: true,
        data: existingGuide,
        streak: preferences.current_streak || 0,
        cached: true,
      })
    }

    const tone = (preferences.guide_tone || 'calm') as GuideTone
    const mindset = await getUserMindset(user.id)

    console.log('[generate] Generating 4 session scripts', { tone, mindset })

    // Generate all 4 session scripts in parallel
    const sessionTypes: SessionType[] = ['morning_prime', 'midday_reset', 'wind_down', 'bedtime_story']
    const results = await Promise.all(
      sessionTypes.map(async (sessionType) => {
        try {
          const result = await generateSessionContent(sessionType, { tone, mindset: mindset || undefined })
          return { key: sessionType, result }
        } catch (error) {
          console.error(`[generate] Failed to generate ${sessionType}:`, error)
          return { key: sessionType, result: { script: '', duration: SESSION_DURATIONS[sessionType] } }
        }
      })
    )

    const contentMap: Record<string, { script: string; duration: number }> = {}
    results.forEach(({ key, result }) => {
      contentMap[key] = result
    })

    console.log('[generate] All sessions generated, upserting to DB')

    // Upsert the daily guide
    const guide = await prisma.dailyGuide.upsert({
      where: {
        user_id_date: {
          user_id: user.id,
          date: new Date(dateKey),
        },
      },
      update: {
        // V2 session scripts
        morning_prime_script: contentMap.morning_prime?.script || null,
        midday_reset_script: contentMap.midday_reset?.script || null,
        wind_down_script: contentMap.wind_down?.script || null,
        bedtime_story_script: contentMap.bedtime_story?.script || null,
        // Legacy fields for backward compat
        morning_script: contentMap.morning_prime?.script || null,
        evening_script: contentMap.wind_down?.script || null,
        day_close_script: contentMap.wind_down?.script || null,
        // Keep existing day_type/pace/modules for legacy consumers
        day_type: 'work',
        pace: 'normal',
        time_mode: 'normal',
        modules: ['morning_prime', 'midday_reset', 'wind_down', 'bedtime_story'],
      },
      create: {
        user_id: user.id,
        date: new Date(dateKey),
        day_type: 'work',
        pace: 'normal',
        time_mode: 'normal',
        modules: ['morning_prime', 'midday_reset', 'wind_down', 'bedtime_story'],
        // V2 session scripts
        morning_prime_script: contentMap.morning_prime?.script || null,
        midday_reset_script: contentMap.midday_reset?.script || null,
        wind_down_script: contentMap.wind_down?.script || null,
        bedtime_story_script: contentMap.bedtime_story?.script || null,
        // Legacy fields
        morning_script: contentMap.morning_prime?.script || null,
        evening_script: contentMap.wind_down?.script || null,
        day_close_script: contentMap.wind_down?.script || null,
      },
    })

    // Update streak (use the client-provided date so timezone is correct)
    const today = date
    const lastActive = preferences.last_active_date
    let newStreak = preferences.current_streak || 0
    const streakUpdateData: Record<string, any> = {}

    // Weekly freeze reset
    const lastReset = preferences.streak_freeze_weekly_reset
    if (!lastReset || (today.getTime() - new Date(lastReset).getTime()) > 7 * 24 * 60 * 60 * 1000) {
      if ((preferences.streak_freezes || 0) < 1) {
        streakUpdateData.streak_freezes = 1
      }
      streakUpdateData.streak_freeze_weekly_reset = today
    }

    if (!lastActive) {
      newStreak = 1
    } else {
      const lastActiveDate = new Date(lastActive)
      const daysDiff = Math.floor((today.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff === 1) {
        newStreak += 1
      } else if (daysDiff === 2 && (preferences.streak_freezes || 0) > 0) {
        newStreak += 1
        streakUpdateData.streak_freezes = { decrement: 1 }
        streakUpdateData.streak_freeze_used_at = today
      } else if (daysDiff > 1) {
        streakUpdateData.last_streak_value = preferences.current_streak || 0
        streakUpdateData.streak_lost_at = today
        newStreak = 1
      }
    }

    await prisma.userPreferences.update({
      where: { user_id: user.id },
      data: {
        current_streak: newStreak,
        last_active_date: today,
        ...streakUpdateData,
      },
    })

    return NextResponse.json({
      success: true,
      data: guide,
      streak: newStreak,
      cached: false,
    })
  } catch (error) {
    console.error('Generate daily guide error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error details:', { message: errorMessage })
    return NextResponse.json(
      { error: 'Failed to generate daily guide' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')
    const date = dateStr ? new Date(dateStr) : new Date()
    const dateKey = getDateString(date)

    const guide = await prisma.dailyGuide.findUnique({
      where: {
        user_id_date: {
          user_id: user.id,
          date: new Date(dateKey),
        },
      },
    })

    const preferences = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
    })

    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    }

    if (!guide) {
      return NextResponse.json({ data: null, streak: preferences?.current_streak || 0 }, { headers })
    }

    // Detect stale completion flags from UTC date migration
    if (guide.bedtime_story_done && !guide.morning_prime_done) {
      await prisma.dailyGuide.update({
        where: { id: guide.id },
        data: {
          morning_prime_done: false,
          midday_reset_done: false,
          wind_down_done: false,
          bedtime_story_done: false,
          mood_before: null,
          mood_after: null,
        },
      })
      guide.morning_prime_done = false
      guide.midday_reset_done = false
      guide.wind_down_done = false
      guide.bedtime_story_done = false
      guide.mood_before = null
      guide.mood_after = null
    }

    return NextResponse.json({
      data: guide,
      streak: preferences?.current_streak || 0,
    }, { headers })
  } catch (error) {
    console.error('Get daily guide error:', error)
    return NextResponse.json(
      { error: 'Failed to get daily guide' },
      { status: 500 }
    )
  }
}
