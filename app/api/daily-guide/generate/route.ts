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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Get user preferences
    const preferences = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
    })

    if (!preferences) {
      return NextResponse.json(
        { error: 'User preferences not found. Please complete onboarding.' },
        { status: 404 }
      )
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

    const { dayContext, modules } = buildDayPlan(date, userPrefs, {
      isRecoveryOverride: isRecoveryDay ?? false,
      energyLevel: energyLevel as EnergyLevel | undefined,
      timeMode,
      dayTypeOverride: dayType,
    })

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
    const results = await Promise.all(generationPromises)
    const contentMap: Record<string, { script: string; duration: number }> = {}
    results.forEach(({ key, result }) => {
      contentMap[key] = result
    })

    // Upsert the daily guide with all generated content
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
      select: { current_streak: true },
    })

    if (!guide) {
      return NextResponse.json({ data: null, streak: preferences?.current_streak || 0 })
    }

    return NextResponse.json({
      data: guide,
      streak: preferences?.current_streak || 0,
    })
  } catch (error) {
    console.error('Get daily guide error:', error)
    return NextResponse.json(
      { error: 'Failed to get daily guide' },
      { status: 500 }
    )
  }
}
