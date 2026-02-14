import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isPremiumUser } from '@/lib/subscription-check'
import { getGroq, GROQ_MODEL } from '@/lib/groq'
import { getUserMindset } from '@/lib/mindset/get-user-mindset'
import { buildMindsetSystemPrompt } from '@/lib/mindset/prompt-builder'

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

    // Premium check
    const isPremium = await isPremiumUser(user.id)

    if (!isPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    const body = await request.json()
    const { message, conversation = [] } = body as {
      message: string
      conversation: ConversationMessage[]
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

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

    // Build message history for context
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      {
        role: 'system',
        content: buildMindsetSystemPrompt(basePrompt, mindset),
      },
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

    return NextResponse.json({ reply, suggestedTags })
  } catch (error) {
    console.error('Journal conversation error:', error)
    return NextResponse.json({ reply: FALLBACK_REPLY })
  }
}
