import Groq from 'groq-sdk'
import type { MindsetId } from '../mindset/types'
import { buildMindsetSystemPrompt } from '../mindset/prompt-builder'

// Lazy initialization to avoid build-time errors
let groq: Groq | null = null
function getGroq() {
  if (!groq) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return groq
}

export type SegmentType = 'activation' | 'breathing' | 'micro_lesson' | 'cooldown'

export type ContentSegment = {
  type: SegmentType
  text: string
  duration: number // seconds
}

export type ActivityType = 'workout' | 'morning' | 'commute' | 'evening'

const ACTIVITY_PROMPTS: Record<ActivityType, string> = {
  workout: 'The user is about to work out. Content should be energizing but not aggressive. Focus on discipline, strength, and showing up.',
  morning: 'The user is starting their morning. Content should be grounding, purposeful, and set a positive tone for the day.',
  commute: 'The user is commuting. Content should be reflective, preparing them mentally for challenges ahead.',
  evening: 'The user is winding down. Content should be calming, reflective, and focused on gratitude and rest.',
}

const SEGMENT_GUIDELINES: Record<SegmentType, string> = {
  activation: 'Short, punchy motivational statements. No toxic positivity or yelling. Calm confidence. 2-3 sentences max.',
  breathing: 'Simple breathing cues. In through nose, out through mouth. No spiritual language. Just control and presence.',
  micro_lesson: 'One mindset insight or discipline principle. A single actionable idea. Story or metaphor welcome.',
  cooldown: 'Gentle acknowledgment of effort. Gratitude for showing up. Transition back to calm.',
}

export async function generateSessionContent(
  activityType: ActivityType,
  durationMinutes: number,
  voiceStyle: 'calm' | 'direct' | 'energetic' = 'calm',
  mindset?: MindsetId
): Promise<ContentSegment[]> {
  const totalSeconds = durationMinutes * 60

  // Calculate segment distribution
  const activationTime = Math.min(120, totalSeconds * 0.15) // 15% or max 2 min
  const cooldownTime = Math.min(90, totalSeconds * 0.1) // 10% or max 1.5 min
  const breathingTime = Math.min(90, totalSeconds * 0.1) // 10%
  const microLessonTime = totalSeconds - activationTime - cooldownTime - breathingTime

  const segmentPlan = [
    { type: 'activation' as SegmentType, totalDuration: activationTime, count: Math.ceil(activationTime / 30) },
    { type: 'breathing' as SegmentType, totalDuration: breathingTime / 2, count: 1 },
    { type: 'micro_lesson' as SegmentType, totalDuration: microLessonTime * 0.6, count: Math.ceil((microLessonTime * 0.6) / 45) },
    { type: 'breathing' as SegmentType, totalDuration: breathingTime / 2, count: 1 },
    { type: 'micro_lesson' as SegmentType, totalDuration: microLessonTime * 0.4, count: Math.ceil((microLessonTime * 0.4) / 45) },
    { type: 'cooldown' as SegmentType, totalDuration: cooldownTime, count: Math.ceil(cooldownTime / 30) },
  ]

  const prompt = buildPrompt(activityType, voiceStyle, durationMinutes, segmentPlan)

  try {
    const response = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: buildMindsetSystemPrompt(`You are a mindful audio coach. Generate motivational audio scripts.
Voice style: ${voiceStyle}.
${voiceStyle === 'calm' ? 'Speak slowly, deliberately. Pauses between thoughts.' : ''}
${voiceStyle === 'direct' ? 'Clear, no fluff. Get to the point.' : ''}
${voiceStyle === 'energetic' ? 'Upbeat but not cheesy. Confident energy.' : ''}

NEVER use toxic positivity, fake hype, or aggressive motivation.
Always respond with valid JSON only. No markdown, no code blocks, just raw JSON.`, mindset),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from AI')
    }

    const parsed = JSON.parse(content) as { segments: ContentSegment[] }
    return parsed.segments
  } catch (error) {
    console.error('AI content generation error:', error)
    return generateFallbackContent(activityType, durationMinutes, voiceStyle)
  }
}

function buildPrompt(
  activityType: ActivityType,
  voiceStyle: string,
  durationMinutes: number,
  segmentPlan: { type: SegmentType; totalDuration: number; count: number }[]
): string {
  const segmentRequests = segmentPlan.map((seg) => {
    const avgDuration = Math.round(seg.totalDuration / seg.count)
    return `${seg.count}x ${seg.type} segments (~${avgDuration}s each): ${SEGMENT_GUIDELINES[seg.type]}`
  }).join('\n')

  // Duration context for the AI
  const durationContext = durationMinutes <= 10
    ? 'This is a short, focused session. Keep it tight and impactful.'
    : durationMinutes <= 20
    ? 'This is a standard session. Good pace, room to breathe.'
    : 'This is a longer session. Go deeper with insights.'

  return `Generate audio script content for a ${durationMinutes}-minute ${activityType} session.

Context: ${ACTIVITY_PROMPTS[activityType]}
Duration note: ${durationContext}

IMPORTANT: The FIRST activation segment should subtly acknowledge the session settings. Examples:
- "${durationMinutes} minutes. Let's make them count."
- "We'll keep this ${voiceStyle} tonight."
- "Short session. Focused reset."
- "We've got time. Let's go deep."

Generate these segments in order:
${segmentRequests}

Return JSON format:
{
  "segments": [
    { "type": "activation", "text": "Your script here", "duration": 30 },
    ...
  ]
}

Guidelines:
- Each "text" should be what the narrator will say out loud
- Keep sentences short and clear for audio
- Add natural pauses with periods
- No hashtags, emojis, or visual formatting
- Voice style: ${voiceStyle}
- Make it feel personalized, like the app knows the user`
}

function generateFallbackContent(
  activityType: ActivityType,
  durationMinutes: number,
  voiceStyle: 'calm' | 'direct' | 'energetic' = 'calm'
): ContentSegment[] {
  const segments: ContentSegment[] = []

  // Session-aware opening based on duration and activity
  const openingTexts: Record<ActivityType, Record<string, string>> = {
    workout: {
      short: `${durationMinutes} minutes. That's all you need. Let's move.`,
      medium: "We've got time. Let's make every rep count.",
      long: "Longer session today. Let's go deep.",
    },
    morning: {
      short: "Quick morning reset. Let's set the tone.",
      medium: "Good morning. We'll take our time today.",
      long: "A longer morning. Room to breathe and prepare.",
    },
    commute: {
      short: "Short commute. Focused mind.",
      medium: "Let's use this time well.",
      long: "Plenty of time to prepare. Let's go deep.",
    },
    evening: {
      short: "Quick wind down. Let the day go.",
      medium: "We'll take it slow tonight.",
      long: "Longer session. Time to fully unwind.",
    },
  }

  const durationKey = durationMinutes <= 10 ? 'short' : durationMinutes <= 20 ? 'medium' : 'long'

  // First segment acknowledges the session
  segments.push({
    type: 'activation',
    text: openingTexts[activityType][durationKey],
    duration: 25,
  })

  // Voice style acknowledgment (sometimes)
  if (voiceStyle === 'calm' && activityType === 'evening') {
    segments.push({
      type: 'activation',
      text: "We'll keep this calm and slow.",
      duration: 20,
    })
  } else if (voiceStyle === 'direct') {
    segments.push({
      type: 'activation',
      text: "No fluff. Just focus.",
      duration: 20,
    })
  } else if (voiceStyle === 'energetic' && activityType === 'workout') {
    segments.push({
      type: 'activation',
      text: "Energy is high. Let's match it.",
      duration: 20,
    })
  }

  // Activity-specific activation
  const activationTexts: Record<ActivityType, string[]> = {
    workout: [
      "You don't need motivation. You just need momentum.",
      "Your body is ready. Your mind will follow.",
    ],
    morning: [
      "A new day. A fresh start.",
      "Before the world asks anything of you, choose who you want to be today.",
    ],
    commute: [
      "This time is yours. Use it well.",
      "The mind needs direction. Give it something worthy.",
    ],
    evening: [
      "The day is done. Let it go.",
      "You showed up today. That matters.",
    ],
  }

  activationTexts[activityType].forEach((text) => {
    segments.push({ type: 'activation', text, duration: 30 })
  })

  // Breathing
  segments.push({
    type: 'breathing',
    text: "In through the nose. Out through the mouth. Strong body. Calm mind.",
    duration: 30,
  })

  // Micro lessons
  const lessons = [
    "Consistency beats intensity every time. Small actions, repeated daily, create massive results.",
    "The person who moves forward slowly still beats the person who doesn't move at all.",
    "Discipline is choosing between what you want now and what you want most.",
  ]

  const lessonCount = Math.max(2, Math.floor(durationMinutes / 7))
  lessons.slice(0, lessonCount).forEach((text) => {
    segments.push({ type: 'micro_lesson', text, duration: 45 })
  })

  // More breathing
  segments.push({
    type: 'breathing',
    text: "Deep breath in. Hold. And release. You're doing well.",
    duration: 30,
  })

  // More content for longer sessions
  if (durationMinutes >= 15) {
    segments.push({
      type: 'micro_lesson',
      text: "Success is not about perfection. It's about showing up, even when it's hard.",
      duration: 45,
    })
  }

  if (durationMinutes >= 20) {
    segments.push({
      type: 'breathing',
      text: "Breathe. Reset. Continue. You're doing better than you think.",
      duration: 30,
    })
    segments.push({
      type: 'micro_lesson',
      text: "Energy flows where attention goes. Focus on what you can control.",
      duration: 45,
    })
  }

  // Activity-specific cooldown
  const cooldownTexts: Record<ActivityType, string[]> = {
    workout: [
      "Well done. You showed up. That's what matters most.",
      "Carry this energy with you. You're stronger than before.",
    ],
    morning: [
      "You're ready. Go make it count.",
      "The day is yours. Own it.",
    ],
    commute: [
      "You're prepared. Whatever comes, you can handle it.",
      "Stay focused. Stay grounded.",
    ],
    evening: [
      "Rest well tonight. Tomorrow is another opportunity.",
      "Be proud of today. Let go of what you can't control.",
    ],
  }

  cooldownTexts[activityType].forEach((text) => {
    segments.push({ type: 'cooldown', text, duration: 30 })
  })

  return segments
}
