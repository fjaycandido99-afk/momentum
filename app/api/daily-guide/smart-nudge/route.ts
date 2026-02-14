import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isPremiumUser } from '@/lib/subscription-check'
import { getGroq, GROQ_MODEL } from '@/lib/groq'
import { getUserMindset } from '@/lib/mindset/get-user-mindset'
import { buildMindsetSystemPrompt } from '@/lib/mindset/prompt-builder'

export const dynamic = 'force-dynamic'

type NudgeType = 'streak_recovery' | 'streak_risk' | 'journal_reminder' | 'mood_trend' | 'inactive' | 'energy_pattern' | 'completion_pattern' | 'mood_dip' | 'goal_reminder' | 'none'

interface NudgeResult {
  type: NudgeType
  message: string
  icon: string
  label: string
  suggested_action?: {
    label: string
    action: string
  }
}

const NUDGE_TEMPLATES: Record<NudgeType, string> = {
  streak_recovery: 'Every great journey has rest stops. Your growth is permanent. Let\'s pick back up today.',
  streak_risk: "You haven't logged in today yet. Keep your streak going!",
  journal_reminder: "You've been journaling consistently. Don't forget to reflect today!",
  mood_trend: "Your mood has been trending upward this week. Keep it up!",
  inactive: "We miss you! Take a moment to check in with yourself today.",
  energy_pattern: "You tend to have more energy in the mornings. Plan your important tasks then.",
  completion_pattern: "Try mixing up your routine — exploring new modules can boost your growth.",
  mood_dip: "Your mood has been dipping recently. A breathing exercise might help reset.",
  goal_reminder: "One of your goals could use some attention. Small steps still count!",
  none: "",
}

const NUDGE_ICONS: Record<NudgeType, string> = {
  streak_recovery: 'flame',
  streak_risk: 'flame',
  journal_reminder: 'pen',
  mood_trend: 'trending-up',
  inactive: 'heart',
  energy_pattern: 'zap',
  completion_pattern: 'refresh-cw',
  mood_dip: 'wind',
  goal_reminder: 'target',
  none: '',
}

const NUDGE_LABELS: Record<NudgeType, string> = {
  streak_recovery: 'Welcome Back',
  streak_risk: 'Smart Nudge',
  journal_reminder: 'Smart Nudge',
  mood_trend: 'Smart Nudge',
  inactive: 'Smart Nudge',
  energy_pattern: 'Smart Nudge',
  completion_pattern: 'Smart Nudge',
  mood_dip: 'Smart Nudge',
  goal_reminder: 'Smart Nudge',
  none: '',
}

const SUGGESTED_ACTIONS: Record<NudgeType, { label: string; action: string } | undefined> = {
  streak_recovery: { label: 'Start fresh', action: 'open_daily_guide' },
  streak_risk: { label: 'Start your day', action: 'open_daily_guide' },
  journal_reminder: { label: 'Write in journal', action: 'open_journal' },
  mood_trend: { label: 'Keep the momentum', action: 'open_daily_guide' },
  inactive: { label: 'Quick check-in', action: 'open_daily_guide' },
  energy_pattern: { label: 'Plan your morning', action: 'open_daily_guide' },
  completion_pattern: { label: 'Try something new', action: 'open_explore' },
  mood_dip: { label: 'Try breathing', action: 'open_breathing' },
  goal_reminder: { label: 'Review goals', action: 'open_goals' },
  none: undefined,
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch preferences for streak info
    const prefs = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
      select: { current_streak: true, last_active_date: true },
    })

    // Fetch last 14 days of data
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    twoWeeksAgo.setHours(0, 0, 0, 0)

    const guides = await prisma.dailyGuide.findMany({
      where: {
        user_id: user.id,
        date: { gte: twoWeeksAgo },
      },
      select: {
        date: true,
        energy_level: true,
        mood_before: true,
        mood_after: true,
        journal_win: true,
        journal_gratitude: true,
        morning_prime_done: true,
        movement_done: true,
        micro_lesson_done: true,
        breath_done: true,
        day_close_done: true,
        ai_streak_recovery_message: true,
      },
      orderBy: { date: 'desc' },
    })

    // Analyze patterns
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    const hasToday = guides.some(g => new Date(g.date).toISOString().split('T')[0] === todayStr)
    const recentDays = guides.slice(0, 7)
    const journalCount = recentDays.filter(g => g.journal_win || g.journal_gratitude).length
    const activeDays = recentDays.filter(g => g.morning_prime_done || g.movement_done || g.day_close_done).length
    const inactiveDays = 7 - activeDays

    // Check if streak is broken (recovery scenario)
    let streakBroken = false
    let daysSinceActive = 0
    if (prefs && prefs.current_streak === 0 && prefs.last_active_date) {
      const lastActive = new Date(prefs.last_active_date)
      lastActive.setHours(0, 0, 0, 0)
      daysSinceActive = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceActive >= 1) {
        streakBroken = true
      }
    }

    // Mood trend analysis
    const moodValues: Record<string, number> = { low: 0, medium: 1, high: 2 }
    const recentMoods = recentDays
      .filter(g => g.mood_after)
      .map(g => moodValues[g.mood_after!] ?? 1)
    const moodTrending = recentMoods.length >= 3 &&
      recentMoods.slice(0, 3).reduce((a, b) => a + b, 0) / 3 >
      recentMoods.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, recentMoods.length)

    const moodDipping = recentMoods.length >= 3 &&
      recentMoods.slice(0, 3).every(m => m <= 1) &&
      recentMoods.slice(0, 3).reduce((a, b) => a + b, 0) / 3 < 1

    // Completion pattern
    const moduleCompletion = {
      morning_prime: recentDays.filter(g => g.morning_prime_done).length,
      movement: recentDays.filter(g => g.movement_done).length,
      micro_lesson: recentDays.filter(g => g.micro_lesson_done).length,
      breath: recentDays.filter(g => g.breath_done).length,
      day_close: recentDays.filter(g => g.day_close_done).length,
    }
    const totalActive = Math.max(activeDays, 1)
    const hasSkippedModule = Object.values(moduleCompletion).some(
      count => count < totalActive * 0.3 && totalActive >= 3
    )
    const skippedModules = Object.entries(moduleCompletion)
      .filter(([, count]) => count < totalActive * 0.3 && totalActive >= 3)
      .map(([mod]) => mod.replace('_', ' '))

    // Goal stalling
    let goalStalling = false
    let stalledGoalTitle = ''
    try {
      const goals = await prisma.goal.findMany({
        where: { user_id: user.id, status: 'active' },
        select: { title: true, current_count: true, target_count: true, updated_at: true },
        take: 5,
      })
      const stalledGoal = goals.find(g => {
        const daysSinceUpdate = Math.floor((Date.now() - new Date(g.updated_at).getTime()) / (1000 * 60 * 60 * 24))
        return daysSinceUpdate >= 3 && g.current_count < g.target_count
      })
      if (stalledGoal) {
        goalStalling = true
        stalledGoalTitle = stalledGoal.title
      }
    } catch {
      // Goals table may not exist
    }

    // Energy pattern
    const energyCounts = { low: 0, normal: 0, high: 0 }
    recentDays.forEach(g => {
      if (g.energy_level && g.energy_level in energyCounts) {
        energyCounts[g.energy_level as keyof typeof energyCounts]++
      }
    })

    // Determine nudge type (priority order — streak recovery is highest)
    let nudgeType: NudgeType = 'none'
    if (streakBroken) {
      nudgeType = 'streak_recovery'
    } else if (moodDipping) {
      nudgeType = 'mood_dip'
    } else if (!hasToday && activeDays >= 3) {
      nudgeType = 'streak_risk'
    } else if (goalStalling) {
      nudgeType = 'goal_reminder'
    } else if (journalCount >= 4 && !guides[0]?.journal_win) {
      nudgeType = 'journal_reminder'
    } else if (hasSkippedModule) {
      nudgeType = 'completion_pattern'
    } else if (moodTrending) {
      nudgeType = 'mood_trend'
    } else if (inactiveDays >= 4) {
      nudgeType = 'inactive'
    } else if (energyCounts.high >= 3 || energyCounts.low >= 3) {
      nudgeType = 'energy_pattern'
    }

    if (nudgeType === 'none') {
      return NextResponse.json({ nudge: null })
    }

    // Check premium for personalized message
    const isPremium = await isPremiumUser(user.id)

    let message = NUDGE_TEMPLATES[nudgeType]

    if (isPremium) {
      // For streak recovery, check for cached message first
      if (nudgeType === 'streak_recovery') {
        const todayGuide = guides.find(g => new Date(g.date).toISOString().split('T')[0] === todayStr)
        if (todayGuide?.ai_streak_recovery_message) {
          const nudge: NudgeResult = {
            type: nudgeType,
            message: todayGuide.ai_streak_recovery_message,
            icon: NUDGE_ICONS[nudgeType],
            label: NUDGE_LABELS[nudgeType],
            suggested_action: SUGGESTED_ACTIONS[nudgeType],
          }
          return NextResponse.json({ nudge, cached: true, isRecovery: true })
        }
      }

      try {
        let aiMessage: string | undefined

        if (nudgeType === 'streak_recovery') {
          // Recovery-specific prompt with mindset injection
          const mindset = await getUserMindset(user.id)
          const activeDaysInPeriod = guides.filter(g =>
            g.journal_win || g.morning_prime_done || g.breath_done
          ).length
          const wins = guides.filter(g => g.journal_win).map(g => g.journal_win!).slice(0, 3)

          const basePrompt = `You write comeback messages for users returning after a streak break. Write 2-3 sentences. Be warm, not guilt-inducing. Reference their past wins if available. End with forward momentum.`
          const userContent = [
            `The user had a streak that broke ${daysSinceActive} day(s) ago.`,
            `They were active ${activeDaysInPeriod} of the last 14 days.`,
            wins.length > 0 ? `Recent wins: ${wins.join('; ')}` : 'No recent wins recorded.',
          ].join('\n')

          const completion = await getGroq().chat.completions.create({
            model: GROQ_MODEL,
            messages: [
              { role: 'system', content: buildMindsetSystemPrompt(basePrompt, mindset) },
              { role: 'user', content: userContent },
            ],
            max_tokens: 120,
            temperature: 0.7,
          })

          aiMessage = completion.choices[0]?.message?.content?.trim()

          // Cache recovery message
          if (aiMessage) {
            try {
              await prisma.dailyGuide.upsert({
                where: { user_id_date: { user_id: user.id, date: today } },
                update: { ai_streak_recovery_message: aiMessage },
                create: { user_id: user.id, date: today, day_type: 'work', ai_streak_recovery_message: aiMessage },
              })
            } catch {
              // Non-fatal
            }
          }
        } else {
          // Generic nudge AI generation
          const context = [
            `Nudge type: ${nudgeType}`,
            `Active days this week: ${activeDays}/7`,
            `Journal entries this week: ${journalCount}`,
            moodTrending ? 'Mood has been improving' : null,
            moodDipping ? 'Mood has been declining for 3+ days' : null,
            energyCounts.low >= 3 ? 'Frequently low energy' : null,
            energyCounts.high >= 3 ? 'Frequently high energy' : null,
            skippedModules.length > 0 ? `Often skips: ${skippedModules.join(', ')}` : null,
            goalStalling ? `Goal "${stalledGoalTitle}" hasn't been updated in 3+ days` : null,
          ].filter(Boolean).join('. ')

          const completion = await getGroq().chat.completions.create({
            model: GROQ_MODEL,
            messages: [
              {
                role: 'system',
                content: `You are a warm wellness coach. Write a single, short encouraging nudge message (1 sentence, max 25 words). Be personal and reference specific patterns. Don't use emojis. Context: ${context}`,
              },
              { role: 'user', content: `Write a ${nudgeType} nudge message.` },
            ],
            max_tokens: 50,
            temperature: 0.7,
          })

          aiMessage = completion.choices[0]?.message?.content?.trim()
        }

        if (aiMessage) message = aiMessage
      } catch (error) {
        console.error('Smart nudge AI error:', error)
        // Fall through to template
      }
    }

    const nudge: NudgeResult = {
      type: nudgeType,
      message,
      icon: NUDGE_ICONS[nudgeType],
      label: NUDGE_LABELS[nudgeType],
      suggested_action: SUGGESTED_ACTIONS[nudgeType],
    }

    return NextResponse.json({ nudge, isRecovery: nudgeType === 'streak_recovery' })
  } catch (error) {
    console.error('Smart nudge API error:', error)
    return NextResponse.json({ error: 'Failed to get nudge' }, { status: 500 })
  }
}
