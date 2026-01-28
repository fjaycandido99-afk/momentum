import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Default preferences for guests
const DEFAULT_PREFERENCES = {
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
  daily_guide_enabled: false,
  guide_onboarding_done: false,
  theme_onboarding_done: false,
  default_time_mode: 'normal',
  workout_enabled: true,
  workout_intensity: 'full',
  micro_lesson_enabled: true,
  breath_cues_enabled: true,
  enabled_segments: ['morning_prime', 'movement', 'micro_lesson', 'breath', 'day_close'],
  segment_order: ['morning_prime', 'movement', 'breath', 'micro_lesson'],
  background_music_enabled: true,
  preferred_music_genre: null,
  daily_reminder: true,
  reminder_time: '07:00',
  bedtime_reminder_enabled: false,
  current_streak: 0,
  last_active_date: null,
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('Auth error in preferences:', authError)
    }

    // For guests, return default preferences (they can still use the app)
    if (!user) {
      return NextResponse.json({ ...DEFAULT_PREFERENCES, isGuest: true })
    }

    const preferences = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
      select: {
        // User type
        user_type: true,

        // Work/Professional settings
        work_days: true,
        work_start_time: true,
        work_end_time: true,
        wake_time: true,

        // Student settings
        class_days: true,
        class_start_time: true,
        class_end_time: true,
        study_start_time: true,
        study_end_time: true,
        exam_mode: true,

        // Guide settings
        guide_tone: true,
        daily_guide_enabled: true,
        guide_onboarding_done: true,
        theme_onboarding_done: true,

        // Module settings
        default_time_mode: true,
        workout_enabled: true,
        workout_intensity: true,
        micro_lesson_enabled: true,
        breath_cues_enabled: true,

        // Segment customization
        enabled_segments: true,
        segment_order: true,

        // Background music
        background_music_enabled: true,
        preferred_music_genre: true,

        // Reminders
        daily_reminder: true,
        reminder_time: true,
        bedtime_reminder_enabled: true,

        // Streak tracking
        current_streak: true,
        last_active_date: true,
      },
    })

    if (!preferences) {
      return NextResponse.json({
        // User type
        user_type: 'professional',

        // Work/Professional settings
        work_days: [1, 2, 3, 4, 5],
        work_start_time: '09:00',
        work_end_time: '17:00',
        wake_time: '07:00',

        // Student settings
        class_days: [1, 2, 3, 4, 5],
        class_start_time: '08:00',
        class_end_time: '15:00',
        study_start_time: '18:00',
        study_end_time: '21:00',
        exam_mode: false,

        // Guide settings
        guide_tone: 'calm',
        daily_guide_enabled: false,
        guide_onboarding_done: false,
        theme_onboarding_done: false,

        // Module settings
        default_time_mode: 'normal',
        workout_enabled: true,
        workout_intensity: 'full',
        micro_lesson_enabled: true,
        breath_cues_enabled: true,

        // Segment customization
        enabled_segments: ['morning_prime', 'movement', 'micro_lesson', 'breath', 'day_close'],
        segment_order: ['morning_prime', 'movement', 'breath', 'micro_lesson'],

        // Background music
        background_music_enabled: true,
        preferred_music_genre: null,

        // Reminders
        daily_reminder: true,
        reminder_time: '07:00',
        bedtime_reminder_enabled: false,

        // Streak tracking
        current_streak: 0,
        last_active_date: null,
      })
    }

    return NextResponse.json(preferences)
  } catch (error) {
    console.error('Get daily guide preferences error:', error)
    return NextResponse.json(
      { error: 'Failed to get preferences', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // For guests, accept the request but let them know to sign in to save
    if (!user) {
      return NextResponse.json({
        success: true,
        isGuest: true,
        message: 'Sign in to save your preferences'
      })
    }

    const body = await request.json()
    const {
      // User type
      user_type,

      // Work/Professional settings
      work_days,
      work_start_time,
      work_end_time,
      wake_time,

      // Student settings
      class_days,
      class_start_time,
      class_end_time,
      study_start_time,
      study_end_time,
      exam_mode,

      // Guide settings
      guide_tone,
      daily_guide_enabled,
      guide_onboarding_done,
      theme_onboarding_done,

      // Module settings
      default_time_mode,
      workout_enabled,
      workout_intensity,
      micro_lesson_enabled,
      breath_cues_enabled,

      // Segment customization
      enabled_segments,
      segment_order,

      // Background music
      background_music_enabled,
      preferred_music_genre,

      // Reminders
      daily_reminder,
      reminder_time,
      bedtime_reminder_enabled,
    } = body

    const preferences = await prisma.userPreferences.upsert({
      where: { user_id: user.id },
      update: {
        // User type
        ...(user_type !== undefined && { user_type }),

        // Work/Professional settings
        ...(work_days !== undefined && { work_days }),
        ...(work_start_time !== undefined && { work_start_time }),
        ...(work_end_time !== undefined && { work_end_time }),
        ...(wake_time !== undefined && { wake_time }),

        // Student settings
        ...(class_days !== undefined && { class_days }),
        ...(class_start_time !== undefined && { class_start_time }),
        ...(class_end_time !== undefined && { class_end_time }),
        ...(study_start_time !== undefined && { study_start_time }),
        ...(study_end_time !== undefined && { study_end_time }),
        ...(exam_mode !== undefined && { exam_mode }),

        // Guide settings
        ...(guide_tone !== undefined && { guide_tone }),
        ...(daily_guide_enabled !== undefined && { daily_guide_enabled }),
        ...(guide_onboarding_done !== undefined && { guide_onboarding_done }),
        ...(theme_onboarding_done !== undefined && { theme_onboarding_done }),

        // Module settings
        ...(default_time_mode !== undefined && { default_time_mode }),
        ...(workout_enabled !== undefined && { workout_enabled }),
        ...(workout_intensity !== undefined && { workout_intensity }),
        ...(micro_lesson_enabled !== undefined && { micro_lesson_enabled }),
        ...(breath_cues_enabled !== undefined && { breath_cues_enabled }),

        // Segment customization
        ...(enabled_segments !== undefined && { enabled_segments }),
        ...(segment_order !== undefined && { segment_order }),

        // Background music
        ...(background_music_enabled !== undefined && { background_music_enabled }),
        ...(preferred_music_genre !== undefined && { preferred_music_genre }),

        // Reminders
        ...(daily_reminder !== undefined && { daily_reminder }),
        ...(reminder_time !== undefined && { reminder_time }),
        ...(bedtime_reminder_enabled !== undefined && { bedtime_reminder_enabled }),
      },
      create: {
        user_id: user.id,

        // User type
        user_type: user_type || 'professional',

        // Work/Professional settings
        work_days: work_days || [1, 2, 3, 4, 5],
        work_start_time: work_start_time || '09:00',
        work_end_time: work_end_time || '17:00',
        wake_time: wake_time || '07:00',

        // Student settings
        class_days: class_days || [1, 2, 3, 4, 5],
        class_start_time: class_start_time || '08:00',
        class_end_time: class_end_time || '15:00',
        study_start_time: study_start_time || '18:00',
        study_end_time: study_end_time || '21:00',
        exam_mode: exam_mode ?? false,

        // Guide settings
        guide_tone: guide_tone || 'calm',
        daily_guide_enabled: daily_guide_enabled ?? false,
        guide_onboarding_done: guide_onboarding_done ?? false,
        theme_onboarding_done: theme_onboarding_done ?? false,

        // Module settings
        default_time_mode: default_time_mode || 'normal',
        workout_enabled: workout_enabled ?? true,
        workout_intensity: workout_intensity || 'full',
        micro_lesson_enabled: micro_lesson_enabled ?? true,
        breath_cues_enabled: breath_cues_enabled ?? true,

        // Segment customization
        enabled_segments: enabled_segments || ['morning_prime', 'movement', 'micro_lesson', 'breath', 'day_close'],
        segment_order: segment_order || ['morning_prime', 'movement', 'micro_lesson', 'breath'],

        // Background music
        background_music_enabled: background_music_enabled ?? true,
        preferred_music_genre: preferred_music_genre || null,

        // Reminders
        daily_reminder: daily_reminder ?? true,
        reminder_time: reminder_time || '07:00',
        bedtime_reminder_enabled: bedtime_reminder_enabled ?? false,
      },
    })

    return NextResponse.json({
      success: true,
      data: preferences,
    })
  } catch (error) {
    console.error('Update daily guide preferences error:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
