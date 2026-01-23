import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch widget data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Return default data for unauthenticated users
      return NextResponse.json({
        greeting: getGreeting(),
        completedModules: 0,
        totalModules: 4,
        streak: 0,
        message: 'Sign in to track your progress',
      })
    }

    const searchParams = request.nextUrl.searchParams
    const widgetType = searchParams.get('type') || 'progress'

    // Get today's date
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get user's daily guide for today
    const guide = await prisma.dailyGuide.findUnique({
      where: {
        user_id_date: {
          user_id: user.id,
          date: today,
        },
      },
      select: {
        morning_prime_done: true,
        movement_done: true,
        micro_lesson_done: true,
        breath_done: true,
        day_close_done: true,
      },
    })

    // Get user's preferences for streak
    const prefs = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
      select: {
        current_streak: true,
        enabled_segments: true,
      },
    })

    // Calculate completed modules
    let completedModules = 0
    const enabledSegments = prefs?.enabled_segments || ['morning_prime', 'movement', 'micro_lesson', 'breath', 'day_close']
    const morningSegments = enabledSegments.filter((s: string) =>
      ['morning_prime', 'movement', 'micro_lesson', 'breath'].includes(s)
    )

    if (guide) {
      if (guide.morning_prime_done && enabledSegments.includes('morning_prime')) completedModules++
      if (guide.movement_done && enabledSegments.includes('movement')) completedModules++
      if (guide.micro_lesson_done && enabledSegments.includes('micro_lesson')) completedModules++
      if (guide.breath_done && enabledSegments.includes('breath')) completedModules++
    }

    const totalModules = morningSegments.length
    const streak = prefs?.current_streak || 0

    // Generate message based on progress
    let message = 'Start your morning flow!'
    if (completedModules === totalModules) {
      message = 'Morning complete! Great job!'
    } else if (completedModules > 0) {
      message = `${totalModules - completedModules} modules to go!`
    } else if (streak > 0) {
      message = `Keep your ${streak}-day streak going!`
    }

    if (widgetType === 'streak') {
      return NextResponse.json({
        streak,
        message: streak > 0
          ? `${streak} days strong!`
          : 'Start your streak today!',
      })
    }

    return NextResponse.json({
      greeting: getGreeting(),
      completedModules,
      totalModules,
      streak,
      message,
    })
  } catch (error) {
    console.error('Widget API error:', error)
    return NextResponse.json({
      greeting: getGreeting(),
      completedModules: 0,
      totalModules: 4,
      streak: 0,
      message: 'Start your day!',
    })
  }
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
