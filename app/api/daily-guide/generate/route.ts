import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { generateModuleContent } from '@/lib/ai/daily-guide-prompts'
import {
  buildDayPlan,
  getTomorrowPreview,
  classifyDayType,
} from '@/lib/daily-guide/decision-tree'
import { getDateString } from '@/lib/daily-guide/day-type'
import type { DayType, TimeMode, EnergyLevel, GuideTone, WorkoutIntensity } from '@/lib/daily-guide/decision-tree'

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

    const body = await request.json()
    const {
      date: dateStr,
      forceRegenerate,
      isRecoveryDay,
      timeMode: requestedTimeMode,
      energyLevel,
      dayType: requestedDayType, // Allow overriding day type (for students: class, study, exam)
    } = body

    const date = dateStr ? new Date(dateStr) : new Date()
    const dateKey = getDateString(date)

    // Get user preferences, create defaults if not found
    let preferences = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
    })

    if (!preferences) {
      // Create default preferences for the user
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
          enabled_segments: ['morning_prime', 'movement', 'micro_lesson', 'breath', 'day_close'],
          segment_order: ['morning_prime', 'movement', 'breath', 'micro_lesson'],
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
    if (existingGuide && !forceRegenerate) {
      return NextResponse.json({
        success: true,
        data: existingGuide,
        cached: true,
      })
    }

    console.log('[generate] Step 1: Preferences loaded', {
      userId: user.id,
      hasPrefs: !!preferences,
      hasGroqKey: !!process.env.GROQ_API_KEY
    })

    // Build the day plan using decision tree
    const userPrefs = {
      userType: (preferences.user_type || 'professional') as 'professional' | 'student' | 'hybrid',
      workDays: preferences.work_days,
      workStartTime: preferences.work_start_time || undefined,
      workEndTime: preferences.work_end_time || undefined,
      classDays: preferences.class_days || [1, 2, 3, 4, 5],
      classStartTime: preferences.class_start_time || undefined,
      classEndTime: preferences.class_end_time || undefined,
      studyStartTime: preferences.study_start_time || undefined,
      studyEndTime: preferences.study_end_time || undefined,
      examMode: preferences.exam_mode ?? false,
      wakeTime: preferences.wake_time || undefined,
      guideTone: (preferences.guide_tone || 'calm') as GuideTone,
      workoutEnabled: preferences.workout_enabled ?? true,
      workoutIntensity: (preferences.workout_intensity || 'full') as WorkoutIntensity,
      microLessonEnabled: preferences.micro_lesson_enabled ?? true,
      breathCuesEnabled: preferences.breath_cues_enabled ?? true,
      defaultTimeMode: (preferences.default_time_mode || 'normal') as TimeMode,
    }

    const timeMode = (requestedTimeMode || userPrefs.defaultTimeMode) as TimeMode

    // Determine day type (allow override from request)
    let dayType: DayType = classifyDayType(date, userPrefs)
    if (requestedDayType) {
      dayType = requestedDayType as DayType
    } else if (isRecoveryDay) {
      dayType = 'recovery'
    } else if (userPrefs.examMode && (userPrefs.userType === 'student' || userPrefs.userType === 'hybrid')) {
      dayType = 'exam'
    }

    console.log('[generate] Step 2: Building day plan', { dayType, timeMode })
    const { dayContext, modules } = buildDayPlan(date, userPrefs, {
      isRecoveryOverride: isRecoveryDay ?? false,
      energyLevel: energyLevel as EnergyLevel | undefined,
      timeMode,
      dayTypeOverride: dayType,
    })
    console.log('[generate] Step 3: Day plan built', { modules: modules.modules })

    // Generation context for AI
    const genContext = {
      dayType: dayContext.dayType,
      pace: dayContext.pace,
      tone: userPrefs.guideTone,
      timeMode,
      energyLevel: dayContext.energyLevel,
      workoutIntensity: userPrefs.workoutIntensity,
    }

    // Generate content for selected modules in parallel
    const generationPromises: Promise<{ key: string; result: { script: string; duration: number } }>[] = []

    // Always generate morning prime and day close
    generationPromises.push(
      generateModuleContent('morning_prime', genContext).then(result => ({ key: 'morning_prime', result }))
    )
    generationPromises.push(
      generateModuleContent('day_close', genContext).then(result => ({ key: 'day_close', result }))
    )

    // Generate workout/movement if included
    if (modules.modules.includes('workout')) {
      generationPromises.push(
        generateModuleContent('workout', genContext).then(result => ({ key: 'workout', result }))
      )
    }

    // Generate micro lesson if included
    if (modules.modules.includes('micro_lesson')) {
      generationPromises.push(
        generateModuleContent('micro_lesson', genContext).then(result => ({ key: 'micro_lesson', result }))
      )
    }

    // Generate breath if included
    if (modules.modules.includes('breath')) {
      generationPromises.push(
        generateModuleContent('breath', genContext).then(result => ({ key: 'breath', result }))
      )
    }

    // Generate student-specific content for study/class/exam days
    const isStudentDay = ['class', 'study', 'exam'].includes(dayType)
    if (isStudentDay && (userPrefs.userType === 'student' || userPrefs.userType === 'hybrid')) {
      if (dayType === 'exam') {
        generationPromises.push(
          generateModuleContent('exam_calm', genContext).then(result => ({ key: 'exam_calm', result }))
        )
      } else {
        // Class or study day
        generationPromises.push(
          generateModuleContent('pre_study', genContext).then(result => ({ key: 'pre_study', result }))
        )
        generationPromises.push(
          generateModuleContent('study_break', genContext).then(result => ({ key: 'study_break', result }))
        )
      }
    }

    // Generate checkpoints
    for (const checkpoint of modules.checkpoints) {
      generationPromises.push(
        generateModuleContent(checkpoint.id, genContext).then(result => ({ key: checkpoint.id, result }))
      )
    }

    // Generate tomorrow preview
    const tomorrow = new Date(date)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDayType = classifyDayType(tomorrow, userPrefs)
    generationPromises.push(
      generateModuleContent('tomorrow_preview', { ...genContext, tomorrowDayType }).then(result => ({ key: 'tomorrow_preview', result }))
    )

    // Wait for all generations
    console.log('[generate] Step 4: Starting content generation', { promiseCount: generationPromises.length })
    const results = await Promise.all(generationPromises)
    console.log('[generate] Step 5: Content generated', { resultCount: results.length })
    const contentMap: Record<string, { script: string; duration: number }> = {}
    results.forEach(({ key, result }) => {
      contentMap[key] = result
    })

    // Upsert the daily guide with all generated content
    console.log('[generate] Step 6: Upserting guide to database')
    const guide = await prisma.dailyGuide.upsert({
      where: {
        user_id_date: {
          user_id: user.id,
          date: new Date(dateKey),
        },
      },
      update: {
        day_type: dayType,
        pace: dayContext.pace,
        time_mode: timeMode,
        energy_level: dayContext.energyLevel || null,
        modules: modules.modules,
        morning_prime_script: contentMap.morning_prime?.script || null,
        movement_script: contentMap.movement?.script || null,
        workout_script: contentMap.movement?.script || null,
        micro_lesson_script: contentMap.micro_lesson?.script || null,
        breath_script: contentMap.breath?.script || null,
        day_close_script: contentMap.day_close?.script || null,
        tomorrow_preview: contentMap.tomorrow_preview?.script || null,
        checkpoint_1_script: contentMap.checkpoint_1?.script || null,
        checkpoint_2_script: contentMap.checkpoint_2?.script || null,
        checkpoint_3_script: contentMap.checkpoint_3?.script || null,
        // Student-specific scripts
        pre_study_script: contentMap.pre_study?.script || null,
        study_break_script: contentMap.study_break?.script || null,
        exam_calm_script: contentMap.exam_calm?.script || null,
        // Legacy fields for backward compatibility
        morning_script: contentMap.morning_prime?.script || null,
        evening_script: contentMap.day_close?.script || null,
        micro_lesson: contentMap.micro_lesson?.script || null,
      },
      create: {
        user_id: user.id,
        date: new Date(dateKey),
        day_type: dayType,
        pace: dayContext.pace,
        time_mode: timeMode,
        energy_level: dayContext.energyLevel || null,
        modules: modules.modules,
        morning_prime_script: contentMap.morning_prime?.script || null,
        movement_script: contentMap.movement?.script || null,
        workout_script: contentMap.movement?.script || null,
        micro_lesson_script: contentMap.micro_lesson?.script || null,
        breath_script: contentMap.breath?.script || null,
        day_close_script: contentMap.day_close?.script || null,
        tomorrow_preview: contentMap.tomorrow_preview?.script || null,
        checkpoint_1_script: contentMap.checkpoint_1?.script || null,
        checkpoint_2_script: contentMap.checkpoint_2?.script || null,
        checkpoint_3_script: contentMap.checkpoint_3?.script || null,
        // Student-specific scripts
        pre_study_script: contentMap.pre_study?.script || null,
        study_break_script: contentMap.study_break?.script || null,
        exam_calm_script: contentMap.exam_calm?.script || null,
        // Legacy fields
        morning_script: contentMap.morning_prime?.script || null,
        evening_script: contentMap.day_close?.script || null,
        micro_lesson: contentMap.micro_lesson?.script || null,
      },
    })

    // Update streak
    const today = new Date()
    const lastActive = preferences.last_active_date
    let newStreak = preferences.current_streak || 0

    if (!lastActive) {
      newStreak = 1
    } else {
      const lastActiveDate = new Date(lastActive)
      const daysDiff = Math.floor((today.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff === 1) {
        newStreak += 1
      } else if (daysDiff > 1) {
        newStreak = 1 // Reset streak
      }
      // If same day, keep streak as is
    }

    await prisma.userPreferences.update({
      where: { user_id: user.id },
      data: {
        current_streak: newStreak,
        last_active_date: today,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...guide,
        checkpoints: modules.checkpoints,
        durations: modules.durations,
        streak: newStreak,
      },
      cached: false,
    })
  } catch (error) {
    console.error('Generate daily guide error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error details:', { message: errorMessage, stack: errorStack })
    return NextResponse.json(
      { error: 'Failed to generate daily guide', details: errorMessage },
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
      console.log('[generate GET] No guide found for date:', dateKey)
      return NextResponse.json({ data: null, streak: preferences?.current_streak || 0 }, { headers })
    }

    // Generate checkpoints and durations dynamically based on stored guide parameters
    let checkpoints: any[] = []
    let durations: Record<string, number> = {}

    if (guide.day_type && guide.time_mode && guide.energy_level) {
      const modules = buildDayPlan({
        dayType: guide.day_type as DayType,
        timeMode: guide.time_mode as TimeMode,
        energyLevel: guide.energy_level as EnergyLevel,
        tone: (preferences?.guide_tone || 'calm') as GuideTone,
        workoutEnabled: preferences?.workout_enabled ?? true,
        workoutIntensity: (preferences?.workout_intensity || 'full') as WorkoutIntensity,
        microLessonEnabled: preferences?.micro_lesson_enabled ?? true,
        breathCuesEnabled: preferences?.breath_cues_enabled ?? true,
        enabledSegments: preferences?.enabled_segments || [],
        segmentOrder: preferences?.segment_order || [],
      })
      checkpoints = modules.checkpoints
      durations = modules.durations
    }

    console.log('[generate GET] Returning guide with done states:', {
      dateKey,
      morning_prime_done: guide.morning_prime_done,
      movement_done: guide.movement_done,
      micro_lesson_done: guide.micro_lesson_done,
      breath_done: guide.breath_done,
      day_close_done: guide.day_close_done,
      checkpointCount: checkpoints.length,
    })

    return NextResponse.json({
      data: guide,
      checkpoints,
      durations,
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
