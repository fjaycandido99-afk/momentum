import Groq from 'groq-sdk'
import type { SessionType, GuideTone } from '../daily-guide/decision-tree'
import type { MindsetId } from '../mindset/types'
import { buildMindsetSystemPrompt } from '../mindset/prompt-builder'

export type { GuideTone }
export type GuideSegment = SessionType

// Lazy initialization to avoid build-time errors
let groq: Groq | null = null
function getGroq() {
  if (!groq) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return groq
}

const TONE_GUIDELINES: Record<GuideTone, string> = {
  calm: 'Speak slowly and deliberately. Use pauses. Soft but confident. Like a trusted friend who speaks truth gently.',
  direct: 'Clear and concise. No fluff. Get to the point while remaining warm. Respect the user\'s time and intelligence.',
  neutral: 'Balanced and measured. Neither too soft nor too firm. Professional but personal.',
}

// ============================================
// SESSION PROMPTS
// ============================================

export function buildMorningPrimePrompt(tone: GuideTone): string {
  return `Generate a Morning Prime audio script to start the day (~2 minutes, 200-250 words).

Tone: ${tone}
${TONE_GUIDELINES[tone]}

The Morning Prime should:
- Warmly acknowledge the start of the day
- Set intention and energy for what's ahead
- Include a brief breathing moment (3-4 breaths)
- Feel like a trusted companion greeting them
- End with gentle forward momentum and motivation

Do NOT:
- Use toxic positivity or hype
- List tasks or create pressure
- Use spiritual or religious language
- Include emojis or formatting

Return JSON:
{
  "script": "Your script here",
  "duration": 120
}`
}

export function buildMiddayResetPrompt(tone: GuideTone): string {
  return `Generate a Midday Reset audio script for recharging mid-day (~2 minutes, 200-250 words).

Tone: ${tone}
${TONE_GUIDELINES[tone]}

The Midday Reset should:
- Acknowledge the day is halfway through
- Offer a quick mental reset and recharge
- Include an affirmation or motivational reflection
- Help refocus energy for the rest of the day
- Use a brief breathing or grounding technique
- End with renewed clarity and purpose

Do NOT:
- Create pressure about what's left to do
- Use corporate buzzwords
- Be preachy or lecturing

Return JSON:
{
  "script": "Your script here",
  "duration": 120
}`
}

export function buildWindDownPrompt(tone: GuideTone): string {
  return `Generate a Wind Down audio script for the evening (~2 minutes, 200-250 words).

Tone: ${tone}
${TONE_GUIDELINES[tone]}

The Wind Down should:
- Help transition from productivity to rest
- Invite reflection on the day without judgment
- Release tension — physical and mental
- Include grounding: body scan or breath work
- Create a sense of completion and peace
- Acknowledge effort and validate rest

Do NOT:
- List what they should have done
- Create guilt about unfinished work
- Be overly sentimental

Return JSON:
{
  "script": "Your script here",
  "duration": 120
}`
}

// Bedtime Story uses pre-written scripts from bedtime-scripts.ts — no AI generation needed
// This prompt exists only as fallback if pre-written stories are unavailable
export function buildBedtimeStoryPrompt(tone: GuideTone): string {
  return `Generate a motivational bedtime story (~6-8 minutes, 900-1100 words).

Tone: ${tone}
${TONE_GUIDELINES[tone]}

The Bedtime Story should:
- Be a narrative story with characters and a setting
- Weave in motivational themes: resilience, discipline, purpose, self-belief, or rest as strength
- Use vivid, calming imagery (nature, warmth, quiet spaces)
- Use ellipses (...) for natural pauses throughout
- Gradually slow pace toward the end to encourage sleep
- End with the listener feeling safe, motivated, and ready to rest

Themes to draw from:
- Consistent effort builds greatness
- Your struggles shape you for what's ahead
- Rest is not weakness — it's preparation
- Your light never stops traveling
- The best version of you already lives inside you

Do NOT:
- Use action/thriller elements
- End on a cliffhanger
- Use spiritual or religious language
- Break the fourth wall frequently

Return JSON:
{
  "script": "Your story script here",
  "duration": 420
}`
}

// ============================================
// GENERATION
// ============================================

interface GenerationContext {
  tone: GuideTone
  mindset?: MindsetId
}

export async function generateSessionContent(
  sessionType: SessionType,
  context: GenerationContext
): Promise<{ script: string; duration: number }> {
  let prompt: string

  switch (sessionType) {
    case 'morning_prime':
      prompt = buildMorningPrimePrompt(context.tone)
      break
    case 'midday_reset':
      prompt = buildMiddayResetPrompt(context.tone)
      break
    case 'wind_down':
      prompt = buildWindDownPrompt(context.tone)
      break
    case 'bedtime_story':
      prompt = buildBedtimeStoryPrompt(context.tone)
      break
    default:
      throw new Error(`Unknown session type: ${sessionType}`)
  }

  try {
    if (!process.env.GROQ_API_KEY) {
      console.warn('[generateSessionContent] GROQ_API_KEY not set, using fallback')
      return getFallbackContent(sessionType)
    }

    const baseGuidePrompt = `You are a mindful daily guide and coach. Generate warm, personal audio scripts.
Tone: ${context.tone}. ${TONE_GUIDELINES[context.tone]}
Always respond with valid JSON only. No markdown, no code blocks, just raw JSON.`

    const response = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: buildMindsetSystemPrompt(baseGuidePrompt, context.mindset),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: sessionType === 'bedtime_story' ? 2000 : 800,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from AI')
    }

    const parsed = JSON.parse(content)
    return {
      script: parsed.script,
      duration: parsed.duration || 120,
    }
  } catch (error) {
    console.error(`Session generation error (${sessionType}):`, error)
    return getFallbackContent(sessionType)
  }
}

function getFallbackContent(sessionType: SessionType): { script: string; duration: number } {
  const fallbacks: Record<SessionType, { script: string; duration: number }> = {
    morning_prime: {
      script: "Good morning. A new day, a fresh start. You don't need to feel ready... you just need to begin. Take one deep breath in... hold... and release. Today has its demands, but you're capable of meeting them. Set your intention. Not a to-do list... just one thing that matters to you today. Hold it in your mind. Now take another breath... and step forward. You've got this.",
      duration: 120,
    },
    midday_reset: {
      script: "Pause for a moment. You're halfway through the day. Whatever happened this morning... let it settle. Take a breath in... hold... and release. If your energy is dipping, that's completely normal. You don't need to power through... you need to reset. Remind yourself why today matters. Not the tasks... the bigger picture. You are making progress even when it doesn't feel like it. One more breath... and continue. Refreshed.",
      duration: 120,
    },
    wind_down: {
      script: "The day is winding down. Whatever happened today... happened. Let go of what you couldn't control. Acknowledge what you did accomplish... you showed up, you tried, you made it through. That matters. Take a slow breath in... and let your shoulders drop as you exhale. The evening is yours now. No more productivity. No more striving. Just rest and recovery. You've earned this. Be proud of today.",
      duration: 120,
    },
    bedtime_story: {
      script: "Once upon a time... in a land where the earth was perfectly flat... there lived a woman who built mountains. Not with machinery or magic... but one stone at a time. Every morning she placed a single stone. The villagers laughed. But she smiled and said... then it is a good thing I started today. Years passed. The pile became a hill. The hill became a mountain. And when the storms came and scattered her stones... she simply placed another one the next morning. Because the mountain was never about the stones. It was about who she became by placing them. Sleep now... builder. Your mountain is rising. And so are you.",
      duration: 420,
    },
  }

  return fallbacks[sessionType]
}

// Legacy compatibility — maps old module names to new session types
export async function generateModuleContent(
  moduleType: string,
  context: { tone: GuideTone; mindset?: MindsetId; dayType?: string; pace?: string; timeMode?: string; energyLevel?: string; workoutIntensity?: string; isStressTriggered?: boolean; skippedPrevious?: boolean; tomorrowDayType?: string }
): Promise<{ script: string; duration: number }> {
  const sessionMap: Record<string, SessionType> = {
    morning_prime: 'morning_prime',
    morning: 'morning_prime',
    midday_reset: 'midday_reset',
    midday: 'midday_reset',
    wind_down: 'wind_down',
    afternoon: 'wind_down',
    evening: 'wind_down',
    bedtime_story: 'bedtime_story',
  }

  const sessionType = sessionMap[moduleType] || 'morning_prime'
  return generateSessionContent(sessionType, { tone: context.tone, mindset: context.mindset })
}
