import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isPremiumUser } from '@/lib/subscription-check'
import { getGroq, GROQ_MODEL } from '@/lib/groq'
import { getUserMindset } from '@/lib/mindset/get-user-mindset'
import { buildMindsetSystemPrompt } from '@/lib/mindset/prompt-builder'
import { rateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { consumeAiQuota } from '@/lib/ai/quota'
import { buildUserContext } from '@/lib/ai/user-context'
import { detectCrisisLevel, detectRegion, crisisResourceForLevel } from '@/lib/ai/crisis-detect'
import { applyVoiceTone } from '@/lib/ai/voice-tone'

export const dynamic = 'force-dynamic'

const FALLBACK_REPLY = 'Take a moment to sit with that thought. What comes to mind?'

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { allowed } = rateLimit(`ai-journal-conversation:${user.id}`, { limit: 20, windowSeconds: 60 })
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const { message, conversation = [] } = body as {
      message: string
      conversation: ConversationMessage[]
    }

    // Validate BEFORE spending a quota unit — a malformed request must
    // not cost a free user one of their five messages for the day.
    if (!message?.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    // Tier no longer decides IF you can chat, only how much and how
    // deeply. Free users get a metered taste; the paywall below cites the
    // real number so it reads as a limit rather than a wall.
    const isPremium = await isPremiumUser(user.id)
    const prefs = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
      select: { timezone: true, guide_tone: true },
    })

    const quota = await consumeAiQuota(user.id, 'chat', isPremium, prefs?.timezone)
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: quota.reason === 'locked' ? 'Premium required' : 'Daily limit reached',
          reason: quota.reason,
          limit: quota.limit,
          feature: 'chat',
          upgrade: true,
        },
        { status: 403 }
      )
    }

    // Crisis check runs on the raw message, before the model sees it, and
    // never depends on the model noticing. Over-triggering is the correct
    // bias here: the resources are gentle and never punitive.
    const crisisLevel = detectCrisisLevel(message)
    const crisis = crisisLevel
      ? crisisResourceForLevel(crisisLevel, detectRegion(prefs?.timezone))
      : null

    const memory = await buildUserContext(user.id, isPremium ? 'premium' : 'free')

    const mindset = await getUserMindset(user.id)
    const exchangeCount = conversation.filter(m => m.role === 'user').length

    const basePrompt = `You are a warm, empathetic journaling companion. Your role is to help the user explore their thoughts and feelings through conversation.

Rules:
- Ask ONE follow-up question per turn
- Reference their actual words back to them
- Notice emotions they might not have named
- Keep responses under 40 words
- After 4-5 exchanges (${exchangeCount + 1} so far), offer a brief reflection summary instead of another question
- Never judge, always validate
- Be curious and gentle`

    // When someone says something that reads as crisis language, a
    // journalling follow-up question is the wrong response — it keeps
    // them exploring instead of pointing them somewhere real. Resources
    // are attached to the response separately; the model's job here is
    // just to not undercut them.
    const crisisPrompt = crisisLevel
      ? `

IMPORTANT — this person has just said something that may indicate ${
          crisisLevel === 'urgent'
            ? 'thoughts of suicide or self-harm'
            : 'hopelessness or wanting to give up'
        }. For this reply only:
- Do NOT ask a probing follow-up question
- Acknowledge what they said plainly, without alarm and without minimising
- Make clear they deserve support from a person, not only an app
- Crisis resources are already being shown to them; do not list phone numbers yourself
- Stay under 50 words`
      : ''

    const systemPrompt =
      applyVoiceTone(buildMindsetSystemPrompt(basePrompt, mindset), prefs?.guide_tone) +
      (memory.block ? `\n\n${memory.block}` : '') +
      crisisPrompt

    // Build message history for context
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ]

    // Add conversation history (limit to last 10 exchanges to stay within context)
    const recentConversation = conversation.slice(-10)
    for (const msg of recentConversation) {
      messages.push({ role: msg.role, content: msg.content })
    }

    // Add the new user message
    messages.push({ role: 'user', content: message })

    const completion = await getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages,
      max_tokens: 100,
      temperature: 0.7,
    })

    const reply = completion.choices[0]?.message?.content?.trim() || FALLBACK_REPLY

    // Extract suggested tags if this is a longer conversation
    let suggestedTags: string[] | undefined
    if (exchangeCount >= 3) {
      try {
        const allUserMessages = [...conversation.filter(m => m.role === 'user').map(m => m.content), message].join('. ')
        const tagCompletion = await getGroq().chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content: 'Extract 3-5 one or two-word theme tags from this journaling conversation. Return a JSON array of strings only.',
            },
            { role: 'user', content: allUserMessages },
          ],
          max_tokens: 60,
          temperature: 0.3,
        })
        const tagRaw = tagCompletion.choices[0]?.message?.content?.trim() || '[]'
        const parsed = JSON.parse(tagRaw)
        if (Array.isArray(parsed)) {
          suggestedTags = parsed.slice(0, 5).map((t: unknown) => String(t).toLowerCase())
        }
      } catch {
        // Tag extraction failed, non-fatal
      }
    }

    return NextResponse.json({
      reply,
      suggestedTags,
      crisis,
      // Lets the UI show "2 left today" and prompt for memory consent
      // without a second round trip.
      quota: { remaining: quota.remaining, limit: quota.limit },
      memory: { consented: memory.consented, active: memory.block !== '' },
    })
  } catch (error) {
    console.error('Journal conversation error:', error)
    return NextResponse.json({ reply: FALLBACK_REPLY })
  }
}
