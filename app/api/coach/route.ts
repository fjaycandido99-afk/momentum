import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isPremiumUser } from '@/lib/subscription-check'
import { getGroq, GROQ_MODEL } from '@/lib/groq'
import { getUserMindset } from '@/lib/mindset/get-user-mindset'
import { buildMindsetSystemPrompt } from '@/lib/mindset/prompt-builder'
import { getCoachName } from '@/lib/mindset/configs'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { allowed } = rateLimit(`ai-coach:${user.id}`, { limit: 20, windowSeconds: 60 })
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const isPremium = await isPremiumUser(user.id)

    if (!isPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    // Fetch user's mindset and coach name
    const mindset = await getUserMindset(user.id)
    const coachName = getCoachName(mindset)

    // Compute time-of-day context
    const now = new Date()
    const currentHour = now.getHours()
    const timeOfDay = currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : currentHour < 21 ? 'evening' : 'night'
    const formattedTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

    const { message, context: rawContext, mode = 'coach', checkInType } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 })
    }

    // Sanitize context: only allow user/assistant roles, limit length
    const contextLimit = mode === 'accountability' ? 15 : 20
    const contentLimit = mode === 'accountability' ? 1500 : 2000
    const context = Array.isArray(rawContext)
      ? rawContext
          .filter((m: any) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
          .slice(-contextLimit)
          .map((m: any) => ({ role: m.role, content: m.content.slice(0, contentLimit) }))
      : []

    // Get today's guide for context (merged select for both modes)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const guide = await prisma.dailyGuide.findUnique({
      where: {
        user_id_date: {
          user_id: user.id,
          date: today,
        },
      },
      select: {
        day_type: true,
        energy_level: true,
        mood_before: true,
        mood_after: true,
        journal_win: true,
        journal_gratitude: true,
        morning_prime_done: true,
        movement_done: true,
        breath_done: true,
        day_close_done: true,
        accountability_streak: true,
        accountability_last_checkin: true,
      },
    })

    // Get recent journals for richer context
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    weekAgo.setHours(0, 0, 0, 0)

    const recentJournals = await prisma.dailyGuide.findMany({
      where: {
        user_id: user.id,
        date: { gte: weekAgo },
        journal_win: { not: null },
      },
      select: {
        date: true,
        journal_win: true,
        journal_gratitude: true,
        morning_prime_done: true,
        day_close_done: true,
      },
      orderBy: { date: 'desc' },
      take: 7,
    })

    // Fetch active goals for context
    let goalsContext = ''
    try {
      const goals = await prisma.goal.findMany({
        where: { user_id: user.id, status: 'active' },
        select: { title: true, current_count: true, target_count: true, frequency: true, updated_at: true },
        take: 5,
      })
      if (goals.length > 0) {
        if (mode === 'accountability') {
          goalsContext = goals.map(g => {
            const daysSinceUpdate = Math.floor((Date.now() - new Date(g.updated_at).getTime()) / (1000 * 60 * 60 * 24))
            return `- ${g.title}: ${g.current_count}/${g.target_count} ${g.frequency} (last updated ${daysSinceUpdate}d ago)`
          }).join('\n')
        } else {
          goalsContext = `- Active goals:\n${goals.map(g => {
            const progress = g.target_count > 0 ? Math.round((g.current_count / g.target_count) * 100) : 0
            const daysSinceUpdate = Math.floor((Date.now() - new Date(g.updated_at).getTime()) / (1000 * 60 * 60 * 24))
            const marker = daysSinceUpdate >= 5 ? ' [STALLING]' : progress >= 80 ? ' [NEAR COMPLETION]' : ''
            return `  * ${g.title} (${progress}% — ${g.current_count}/${g.target_count} ${g.frequency}, updated ${daysSinceUpdate}d ago)${marker}`
          }).join('\n')}`
        }
      }
    } catch {
      // Goals table may not exist yet, non-fatal
    }

    let systemPrompt: string
    let maxTokens: number

    if (mode === 'accountability') {
      // Accountability mode
      const modulesCompleted = [
        guide?.morning_prime_done ? 'Morning Prime' : null,
        guide?.movement_done ? 'Movement' : null,
        guide?.breath_done ? 'Breathing' : null,
        guide?.day_close_done ? 'Day Close' : null,
      ].filter(Boolean)

      const streakDays = recentJournals.filter(g => g.morning_prime_done || g.day_close_done).length
      const recentWins = recentJournals
        .filter(g => g.journal_win)
        .map(g => g.journal_win!.substring(0, 60))
        .slice(0, 3)

      const checkInTypeLabel = checkInType === 'morning' ? 'morning check-in'
        : checkInType === 'midday' ? 'midday check-in'
        : checkInType === 'evening' ? 'evening reflection'
        : checkInType === 'goal-review' ? 'goal review'
        : 'general chat'

      systemPrompt = `You are ${coachName}, the AI Accountability Partner in the Voxu wellness app. Your role is specifically about GOALS, HABITS, and COMMITMENTS — not general wellness (that's the Coach's job).

CHECK-IN TYPE: ${checkInTypeLabel}
CURRENT TIME: ${formattedTime} (${timeOfDay})

USER CONTEXT:
- Day type: ${guide?.day_type || 'work'}
- Energy: ${guide?.energy_level || 'unknown'}
- Mood: ${guide?.mood_before || 'unknown'}
- Modules completed today: ${modulesCompleted.length > 0 ? modulesCompleted.join(', ') : 'None yet'}
- Active streak: ${streakDays} days this week
- Accountability streak: ${guide?.accountability_streak || 0} days
${goalsContext ? `\nACTIVE GOALS:\n${goalsContext}` : '\nNo active goals set.'}
${recentWins.length > 0 ? `\nRECENT WINS:\n${recentWins.map(w => `- "${w}"`).join('\n')}` : ''}

RULES:
- Keep responses under 120 words
- Be direct, encouraging, but honest
- Track promises the user makes — if they said they'd do something, ask about it
- For morning: ask what they commit to today, reference their goals
- For midday: check in on progress, offer a quick nudge
- For evening: celebrate wins, review commitments, plan tomorrow
- For goal-review: deep dive into one specific goal, suggest small next step
- Celebrate consistency and progress, no matter how small
- If a goal is stalling, gently call it out and brainstorm solutions
- Never diagnose medical or mental health conditions`

      maxTokens = 250
    } else {
      // Coach mode (default)
      const journalContext = recentJournals
        .map(j => `${new Date(j.date).toLocaleDateString()}: "${j.journal_win}"${j.journal_gratitude ? ` (grateful for: ${j.journal_gratitude})` : ''}`)
        .join('\n')

      // Build time-of-day coaching approach
      const timeApproach = timeOfDay === 'morning'
        ? 'It\'s morning — be energizing and forward-looking. Help them set intentions and build momentum for the day.'
        : timeOfDay === 'afternoon'
        ? 'It\'s afternoon — check their energy, suggest a midday reset if needed. Help them refocus for the second half of the day.'
        : timeOfDay === 'evening'
        ? 'It\'s evening — be calmer and reflective. Help them process the day and wind down with purpose.'
        : 'It\'s late at night — be gentle and soothing. Encourage rest and tomorrow\'s fresh start.'

      // Build mood-based approach
      const moodApproach = guide?.mood_before === 'low'
        ? 'The user\'s mood is low — be extra gentle, empathetic, and validating before offering advice. Acknowledge their feelings first.'
        : guide?.mood_before === 'high'
        ? 'The user\'s mood is high — match their energy! Be enthusiastic and help them channel this positivity.'
        : 'The user\'s mood is neutral/unknown — take a balanced, warm approach.'

      systemPrompt = `You are ${coachName}, a warm, encouraging personal wellness coach in the Voxu app.

CURRENT TIME: ${formattedTime} (${timeOfDay})

CONTEXT:
- Today's day type: ${guide?.day_type || 'work'}
- Energy level: ${guide?.energy_level || 'unknown'}
- Morning mood: ${guide?.mood_before || 'not recorded'}
- Evening mood: ${guide?.mood_after || 'not recorded'}
${journalContext ? `- Recent journal entries:\n${journalContext}` : ''}
${goalsContext}

TIME-OF-DAY APPROACH:
${timeApproach}

MOOD APPROACH:
${moodApproach}

GOAL AWARENESS:
- If a goal is marked [STALLING], gently bring it up and ask what's blocking progress
- If a goal is marked [NEAR COMPLETION], celebrate the momentum and encourage the final push

RULES:
- Keep responses under 150 words
- Be warm, actionable, and direct
- Use the user's context to personalize advice
- Don't be preachy or lecture
- Suggest practical next steps when appropriate
- If they share a problem, acknowledge it first before advising
- Never diagnose medical or mental health conditions
- If someone seems in crisis, encourage them to reach out to a professional`

      maxTokens = 300
    }

    // Inject mindset philosophical framework into system prompt
    const finalPrompt = buildMindsetSystemPrompt(systemPrompt, mindset)

    const chatCompletion = await getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: finalPrompt },
        ...(context || []),
        { role: 'user', content: message },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    })

    const reply = chatCompletion.choices[0]?.message?.content?.trim() ||
      (mode === 'accountability'
        ? "I'm here to keep you on track. What would you like to focus on?"
        : "I'm here for you. What would you like to talk about?")

    // Update accountability streak when in accountability mode
    if (mode === 'accountability') {
      try {
        const now = new Date()
        const lastCheckin = guide?.accountability_last_checkin
        let newStreak = (guide?.accountability_streak || 0) + 1

        // Reset streak if more than 2 days since last check-in
        if (lastCheckin) {
          const daysSince = Math.floor((now.getTime() - new Date(lastCheckin).getTime()) / (1000 * 60 * 60 * 24))
          if (daysSince > 2) newStreak = 1
        }

        await prisma.dailyGuide.upsert({
          where: {
            user_id_date: { user_id: user.id, date: today },
          },
          update: {
            accountability_streak: newStreak,
            accountability_last_checkin: now,
          },
          create: {
            user_id: user.id,
            date: today,
            day_type: 'work',
            accountability_streak: newStreak,
            accountability_last_checkin: now,
          },
        })
      } catch {
        // Non-fatal
      }
    }

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Coach API error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to get coach response' }, { status: 500 })
  }
}
