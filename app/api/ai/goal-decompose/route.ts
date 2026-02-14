import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isPremiumUser } from '@/lib/subscription-check'
import { getGroq } from '@/lib/groq'
import { getUserMindset } from '@/lib/mindset/get-user-mindset'
import { buildMindsetSystemPrompt } from '@/lib/mindset/prompt-builder'

export const dynamic = 'force-dynamic'

const DEEP_MODEL = 'llama-3.3-70b-versatile'

const FALLBACK_ACTIONS = [
  { action: 'Take one small step toward your goal', when: 'morning', durationMinutes: 10 },
]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isPremium = await isPremiumUser(user.id)

    if (!isPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    const body = await request.json()
    const { goalId } = body

    if (!goalId) {
      return NextResponse.json({ error: 'goalId is required' }, { status: 400 })
    }

    // Fetch goal
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, user_id: user.id },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Check cache
    if (goal.ai_micro_actions) {
      try {
        const cached = JSON.parse(goal.ai_micro_actions)
        return NextResponse.json({ microActions: cached, cached: true })
      } catch {
        // Bad cache
      }
    }

    // Get user context
    const prefs = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
      select: { wake_time: true, work_start_time: true, work_end_time: true },
    })

    const mindset = await getUserMindset(user.id)

    const basePrompt = `You are a goal strategist. Break down a goal into 5-7 daily micro-actions. Be ultra-specific and actionable.

Return valid JSON: { "microActions": [{ "action": "string", "when": "morning|afternoon|evening", "durationMinutes": number, "tiedToModule": "morning_prime|movement|breath|day_close" or null }] }

Rules:
- Each action should be completable in 5-20 minutes
- Tie actions to parts of the user's existing daily routine when possible
- Use specific numbers and times, not vague instructions
- Example: "Read 12 books" → "Read for 15 minutes right after Morning Prime"
- Return valid JSON only`

    const scheduleContext = prefs?.wake_time
      ? `Schedule: wake ${prefs.wake_time}, work ${prefs.work_start_time || '9:00'}-${prefs.work_end_time || '17:00'}`
      : ''

    const completion = await getGroq().chat.completions.create({
      model: DEEP_MODEL,
      messages: [
        { role: 'system', content: buildMindsetSystemPrompt(basePrompt, mindset) },
        {
          role: 'user',
          content: `Goal: "${goal.title}"${goal.description ? `\nDetails: ${goal.description}` : ''}\nFrequency: ${goal.frequency}\nProgress: ${goal.current_count}/${goal.target_count}\n${scheduleContext}`,
        },
      ],
      max_tokens: 400,
      temperature: 0.7,
    })

    const raw = completion.choices[0]?.message?.content?.trim() || ''

    let microActions = FALLBACK_ACTIONS
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.microActions) && parsed.microActions.length > 0) {
        microActions = parsed.microActions.slice(0, 7).map((a: { action?: string; when?: string; durationMinutes?: number; tiedToModule?: string }) => ({
          action: a.action || '',
          when: a.when || 'morning',
          durationMinutes: a.durationMinutes || 10,
          tiedToModule: a.tiedToModule || null,
        }))
      }
    } catch {
      // Use fallback
    }

    // Cache on goal
    try {
      await prisma.goal.update({
        where: { id: goalId },
        data: {
          ai_micro_actions: JSON.stringify(microActions),
          ai_decomposition_generated: new Date(),
        },
      })
    } catch {
      // Non-fatal
    }

    return NextResponse.json({ microActions, cached: false })
  } catch (error) {
    console.error('Goal decompose error:', error)
    return NextResponse.json({ microActions: FALLBACK_ACTIONS })
  }
}
