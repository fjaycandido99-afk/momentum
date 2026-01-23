import Groq from 'groq-sdk'
import type {
  DayType,
  Pace,
  TimeMode,
  EnergyLevel,
  GuideTone,
  ModuleType,
  WorkoutIntensity,
} from '../daily-guide/decision-tree'

export type { DayType, GuideTone }
export type GuideSegment =
  | 'morning'
  | 'midday'
  | 'afternoon'
  | 'evening'
  | 'morning_prime'
  | 'workout'
  | 'breath'
  | 'micro_lesson'
  | 'day_close'
  | 'checkpoint_1'
  | 'checkpoint_2'
  | 'checkpoint_3'
  | 'tomorrow_preview'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

const DAY_TYPE_CONTEXT: Record<DayType, string> = {
  work: 'This is a work day. The user needs to be focused, grounded, and efficient. Acknowledge the demands ahead without adding pressure.',
  off: 'This is a day off. The user can relax and reflect. Tone should be lighter, more spacious. No urgency.',
  recovery: 'This is a recovery day. The user may be tired or overwhelmed. Be extra calm, reassuring, and nurturing. Validate rest.',
}

const PACE_CONTEXT: Record<Pace, string> = {
  focused: 'Pace is focused - clear direction, efficient, purposeful.',
  open: 'Pace is open - spacious, relaxed, exploratory.',
  gentle: 'Pace is gentle - slow, nurturing, no pressure at all.',
}

const TONE_GUIDELINES: Record<GuideTone, string> = {
  calm: 'Speak slowly and deliberately. Use pauses. Soft but confident. Like a trusted friend who speaks truth gently.',
  direct: 'Clear and concise. No fluff. Get to the point while remaining warm. Respect the user\'s time and intelligence.',
  neutral: 'Balanced and measured. Neither too soft nor too firm. Professional but personal.',
}

const ENERGY_ADJUSTMENTS: Record<EnergyLevel, string> = {
  low: 'User has low energy today. Be extra gentle, acknowledge tiredness, suggest smaller steps.',
  normal: 'User has normal energy. Standard guidance applies.',
  high: 'User has high energy. Can be slightly more ambitious, but don\'t push too hard.',
}

// ============================================
// MODULE PROMPTS
// ============================================

export function buildMorningPrimePrompt(
  dayType: DayType,
  pace: Pace,
  tone: GuideTone,
  timeMode: TimeMode,
  energyLevel?: EnergyLevel
): string {
  const duration = timeMode === 'quick' ? '30 seconds' : timeMode === 'normal' ? '60 seconds' : '90 seconds'
  const energyContext = energyLevel ? ENERGY_ADJUSTMENTS[energyLevel] : ''

  return `Generate a Morning Prime audio script to start the day.

${DAY_TYPE_CONTEXT[dayType]}
${PACE_CONTEXT[pace]}
${energyContext}

Tone: ${tone}
${TONE_GUIDELINES[tone]}

Duration: ${duration}

The Morning Prime should:
- Warmly acknowledge the start of the day
- ${dayType === 'work' ? 'Set a capable, focused tone without pressure' : ''}
- ${dayType === 'off' ? 'Invite enjoyment and freedom' : ''}
- ${dayType === 'recovery' ? 'Validate rest as the priority' : ''}
- Feel like a trusted companion greeting them
- End with gentle forward momentum

Do NOT:
- Use toxic positivity or hype
- List tasks or create pressure
- Use spiritual or religious language
- Include emojis or formatting

Return JSON:
{
  "script": "Your script here",
  "duration": ${timeMode === 'quick' ? 30 : timeMode === 'normal' ? 60 : 90}
}`
}

export function buildWorkoutPrompt(
  dayType: DayType,
  pace: Pace,
  tone: GuideTone,
  intensity: WorkoutIntensity,
  timeMode: TimeMode
): string {
  const duration = timeMode === 'quick' ? '3 minutes' : timeMode === 'normal' ? '5 minutes' : '7 minutes'
  const seconds = timeMode === 'quick' ? 180 : timeMode === 'normal' ? 300 : 420

  const intensityContext = {
    none: '',
    light: 'This is a LIGHT workout - gentle stretching, mobility, easy movement. No intensity.',
    full: 'This is a FULL workout - energizing, purposeful movement. Challenge without strain.',
  }

  return `Generate a Workout Coach audio script.

${DAY_TYPE_CONTEXT[dayType]}
${PACE_CONTEXT[pace]}
${intensityContext[intensity]}

Tone: ${tone}
${TONE_GUIDELINES[tone]}

Duration: ${duration}

The Workout script should:
- ${dayType === 'work' ? '"Get moving fast" - short warmup + set intention for the body' : ''}
- ${dayType === 'off' ? '"Train with enjoyment" - relaxed movement, no performance pressure' : ''}
- ${dayType === 'recovery' ? '"5-minute mobility + breath" - very gentle, restorative' : ''}
- Include natural pauses for movement
- Guide breathing during movement
- End with acknowledgment of showing up

Structure (for ${duration}):
1. Opening (10-15s): Intent setting
2. Warmup cues (30-60s): Light movement guidance
3. Main movement (varies): Encouraging cues
4. Cool transition (15-20s): Bring it down
5. Close (10s): Acknowledge effort

Do NOT:
- Count reps aggressively
- Use "push harder" language on recovery days
- Be a drill sergeant
- Assume specific equipment

Return JSON:
{
  "script": "Your script here",
  "duration": ${seconds}
}`
}

export function buildMicroLessonPrompt(
  dayType: DayType,
  pace: Pace,
  tone: GuideTone,
  timeMode: TimeMode
): string {
  const duration = timeMode === 'normal' ? '3 minutes' : '5 minutes'
  const seconds = timeMode === 'normal' ? 180 : 300

  return `Generate a Micro Lesson audio script - one insight to carry through the day.

${DAY_TYPE_CONTEXT[dayType]}
${PACE_CONTEXT[pace]}

Tone: ${tone}
${TONE_GUIDELINES[tone]}

Duration: ${duration}

The Micro Lesson should:
- Present ONE actionable insight or mindset shift
- ${dayType === 'work' ? 'Focus on: productivity, discipline, focus, handling pressure' : ''}
- ${dayType === 'off' ? 'Focus on: presence, enjoyment, meaning, relationships' : ''}
- ${dayType === 'recovery' ? 'Focus on: self-compassion, patience, renewal, acceptance' : ''}
- Use a brief story, metaphor, or example
- Make it memorable and quotable
- End with a simple takeaway

Good themes:
- Consistency over intensity
- Small wins compound
- Energy management matters
- You don't need to feel ready
- Progress isn't linear
- The obstacle is the way

Do NOT:
- Be preachy or lecturing
- Give multiple lessons
- Use corporate buzzwords

Return JSON:
{
  "script": "Your script here",
  "duration": ${seconds}
}`
}

export function buildBreathPrompt(
  dayType: DayType,
  pace: Pace,
  tone: GuideTone,
  isStressTriggered: boolean = false
): string {
  const duration = isStressTriggered ? '90-120 seconds' : '60-90 seconds'
  const seconds = isStressTriggered ? 105 : 75

  const stressContext = isStressTriggered
    ? 'The user tapped "Stressed" - they need immediate calm. Be extra soothing and reassuring.'
    : ''

  return `Generate a Breath Cues audio script for grounding and calm.

${DAY_TYPE_CONTEXT[dayType]}
${PACE_CONTEXT[pace]}
${stressContext}

Tone: calm (override for breath work)
${TONE_GUIDELINES.calm}

Duration: ${duration}

The Breath script should:
- ${isStressTriggered ? 'Immediately acknowledge their stress without judgment' : 'Gently invite them to pause'}
- Guide simple box breathing or 4-7-8 breathing
- Include counts: "In... 2... 3... 4... Hold... 2... 3... 4... Out..."
- ${isStressTriggered ? 'Remind them this feeling will pass' : 'Create a moment of stillness'}
- End with grounding affirmation

Structure:
1. Opening (10s): Invitation to pause
2. First breath cycle with counts (20s)
3. Second breath cycle (20s)
4. Third breath cycle (20s)
5. Close (10-15s): Grounding statement

Do NOT:
- Use spiritual or mystical language
- Make it complicated
- Rush the counts

Return JSON:
{
  "script": "Your script here",
  "duration": ${seconds}
}`
}

export function buildDayClosePrompt(
  dayType: DayType,
  pace: Pace,
  tone: GuideTone,
  timeMode: TimeMode
): string {
  const duration = timeMode === 'quick' ? '30 seconds' : timeMode === 'normal' ? '45 seconds' : '60 seconds'
  const seconds = timeMode === 'quick' ? 30 : timeMode === 'normal' ? 45 : 60

  return `Generate a Day Close audio script to end the day.

${DAY_TYPE_CONTEXT[dayType]}
${PACE_CONTEXT[pace]}

Tone: ${tone}
${TONE_GUIDELINES[tone]}

Duration: ${duration}

The Day Close should:
- Close the day emotionally
- ${dayType === 'work' ? 'Acknowledge effort, help transition out of work mode' : ''}
- ${dayType === 'off' ? 'Celebrate the rest enjoyed, no guilt about relaxation' : ''}
- ${dayType === 'recovery' ? 'Validate rest strongly, express hope for tomorrow' : ''}
- Create a sense of completion and peace
- Make it feel like a meaningful ritual
- End with warmth

Do NOT:
- List what they should have done
- Create guilt or regret
- Be overly sentimental

Return JSON:
{
  "script": "Your script here",
  "duration": ${seconds}
}`
}

export function buildTomorrowPreviewPrompt(
  tomorrowDayType: DayType,
  tone: GuideTone
): string {
  return `Generate a Tomorrow Preview - a brief 10-second preview of tomorrow.

Tomorrow is a ${tomorrowDayType} day.

Tone: ${tone}
${TONE_GUIDELINES[tone]}

Duration: 10 seconds (2-3 sentences max)

The Tomorrow Preview should:
- ${tomorrowDayType === 'work' ? 'Mention a focused morning is ready for them' : ''}
- ${tomorrowDayType === 'off' ? 'Mention a relaxed start awaits' : ''}
- ${tomorrowDayType === 'recovery' ? 'Invite continued rest' : ''}
- Create anticipation, not anxiety
- Be very brief

Examples:
- "Tomorrow is a work day. I've set a focused morning for you. Rest well."
- "Tomorrow is yours. A relaxed start awaits."
- "Tomorrow is for recovery too. Let tonight restore you."

Return JSON:
{
  "script": "Your 10-second script here",
  "duration": 10
}`
}

// ============================================
// CHECKPOINT PROMPTS
// ============================================

export function buildCheckpointPrompt(
  checkpointType: 'focus_target' | 'midday_reset' | 'downshift' | 'nourish' | 'close_loop' | 'gentle_movement',
  dayType: DayType,
  pace: Pace,
  tone: GuideTone,
  duration: number,
  skippedPrevious: boolean = false
): string {
  const supportiveOverride = skippedPrevious
    ? 'The user skipped their previous module. Be extra supportive, no guilt, shorter and gentler.'
    : ''

  const checkpointConfigs = {
    focus_target: {
      name: 'Focus Target',
      purpose: 'Set intention before work',
      guidance: 'Help them choose ONE priority for the work session ahead.',
    },
    midday_reset: {
      name: 'Midday Reset',
      purpose: 'Quick reset mid-day',
      guidance: 'Acknowledge energy dip is normal, offer a micro-reset.',
    },
    downshift: {
      name: 'Downshift',
      purpose: 'Transition out of work mode',
      guidance: 'Help them mentally leave work behind.',
    },
    nourish: {
      name: 'Nourish',
      purpose: 'Do one thing that feeds the soul',
      guidance: 'Invite them to do something nourishing - no pressure.',
    },
    close_loop: {
      name: 'Close the Loop',
      purpose: 'Reflect on day off',
      guidance: 'Help them appreciate their day of rest.',
    },
    gentle_movement: {
      name: 'Gentle Movement',
      purpose: 'Breathe and move gently on recovery day',
      guidance: 'Very gentle - stretching, walking, or just breathing.',
    },
  }

  const config = checkpointConfigs[checkpointType]

  return `Generate a "${config.name}" checkpoint audio script.

${DAY_TYPE_CONTEXT[dayType]}
${PACE_CONTEXT[pace]}
${supportiveOverride}

Tone: ${tone}
${TONE_GUIDELINES[tone]}

Duration: ${duration} seconds

Purpose: ${config.purpose}
Guidance: ${config.guidance}

The checkpoint should:
- Be brief and non-intrusive
- ${skippedPrevious ? 'Be extra supportive - they skipped before, no guilt' : 'Gently check in'}
- Feel like a supportive tap on the shoulder
- End with simple forward momentum

Do NOT:
- Add pressure
- List tasks
- Be preachy

Return JSON:
{
  "script": "Your ${duration}-second script here",
  "duration": ${duration}
}`
}

// ============================================
// GENERATION FUNCTIONS
// ============================================

interface GenerationContext {
  dayType: DayType
  pace: Pace
  tone: GuideTone
  timeMode: TimeMode
  energyLevel?: EnergyLevel
  workoutIntensity?: WorkoutIntensity
  isStressTriggered?: boolean
  skippedPrevious?: boolean
  tomorrowDayType?: DayType
}

export async function generateModuleContent(
  moduleType: ModuleType | 'tomorrow_preview',
  context: GenerationContext
): Promise<{ script: string; duration: number }> {
  let prompt: string

  switch (moduleType) {
    case 'morning_prime':
      prompt = buildMorningPrimePrompt(
        context.dayType,
        context.pace,
        context.tone,
        context.timeMode,
        context.energyLevel
      )
      break
    case 'workout':
      prompt = buildWorkoutPrompt(
        context.dayType,
        context.pace,
        context.tone,
        context.workoutIntensity || 'full',
        context.timeMode
      )
      break
    case 'micro_lesson':
      prompt = buildMicroLessonPrompt(
        context.dayType,
        context.pace,
        context.tone,
        context.timeMode
      )
      break
    case 'breath':
      prompt = buildBreathPrompt(
        context.dayType,
        context.pace,
        context.tone,
        context.isStressTriggered
      )
      break
    case 'day_close':
      prompt = buildDayClosePrompt(
        context.dayType,
        context.pace,
        context.tone,
        context.timeMode
      )
      break
    case 'tomorrow_preview':
      prompt = buildTomorrowPreviewPrompt(
        context.tomorrowDayType || context.dayType,
        context.tone
      )
      break
    case 'checkpoint_1':
    case 'checkpoint_2':
    case 'checkpoint_3':
      const checkpointMap: Record<string, Record<DayType, 'focus_target' | 'midday_reset' | 'downshift' | 'nourish' | 'close_loop' | 'gentle_movement'>> = {
        checkpoint_1: { work: 'focus_target', off: 'nourish', recovery: 'gentle_movement' },
        checkpoint_2: { work: 'midday_reset', off: 'close_loop', recovery: 'gentle_movement' },
        checkpoint_3: { work: 'downshift', off: 'close_loop', recovery: 'gentle_movement' },
      }
      const checkpointType = checkpointMap[moduleType][context.dayType]
      const checkpointDuration = context.timeMode === 'quick' ? 20 : context.timeMode === 'normal' ? 30 : 45
      prompt = buildCheckpointPrompt(
        checkpointType,
        context.dayType,
        context.pace,
        context.tone,
        checkpointDuration,
        context.skippedPrevious
      )
      break
    default:
      throw new Error(`Unknown module type: ${moduleType}`)
  }

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a mindful daily guide and coach. Generate warm, personal audio scripts.
Tone: ${context.tone}. ${TONE_GUIDELINES[context.tone]}
Day type: ${context.dayType}. Pace: ${context.pace}.
Always respond with valid JSON only. No markdown, no code blocks, just raw JSON.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from AI')
    }

    const parsed = JSON.parse(content)
    return {
      script: parsed.script,
      duration: parsed.duration || 45,
    }
  } catch (error) {
    console.error(`Module generation error (${moduleType}):`, error)
    return getFallbackContent(moduleType, context)
  }
}

function getFallbackContent(
  moduleType: ModuleType | 'tomorrow_preview',
  context: GenerationContext
): { script: string; duration: number } {
  const fallbacks: Record<string, Record<DayType, { script: string; duration: number }>> = {
    morning_prime: {
      work: { script: "Good morning. A new day, a fresh start. You don't need to feel ready. You just need to begin. Today has its demands, but you're capable of meeting them. Take one breath. Set your intention. Let's go.", duration: 45 },
      off: { script: "Good morning. No rush today. This day is yours to shape however you'd like. Take a moment to appreciate that. Maybe there's something you've been wanting to do. Maybe there's nothing at all. Both are fine.", duration: 45 },
      recovery: { script: "Good morning. Today is for taking it easy. Your only job is to rest and restore. There's no productivity quota to meet. Listen to what your body needs. Be gentle with yourself.", duration: 45 },
    },
    workout: {
      work: { script: "Let's move. Start with a deep breath. Roll your shoulders back. We're not here to break records - just to wake up the body. Gentle stretches first. Reach up, then fold forward. Feel your spine lengthen. Now some easy movement - whatever feels right. Your body knows what it needs. Keep breathing. Good. You're ready.", duration: 180 },
      off: { script: "Time to move, at your own pace. This isn't about performance. It's about feeling good. Start slow - some stretches, some easy movement. Let your body guide you. There's no rush, no quota. Just enjoyment. Move in ways that feel good today.", duration: 180 },
      recovery: { script: "Very gentle movement today. Start with your breath. Slow inhale... slow exhale. Now, small movements - rolling your neck, your shoulders. Nothing strenuous. Just waking up the body gently. A few stretches if that feels right. Listen to your body. It's healing. That's enough.", duration: 180 },
    },
    micro_lesson: {
      work: { script: "Here's something to carry with you today. Consistency beats intensity. Small actions, repeated daily, create results that bursts of effort never will. You don't need a perfect day. You need a bunch of decent days, strung together. So today, don't aim for perfect. Aim for present. Show up. Do the next small thing. That's how momentum builds.", duration: 180 },
      off: { script: "A thought for today. Being present is a skill. Days off are practice for enjoying life as it happens. Not every moment needs to be productive or optimized. Some moments are just for being. Today, practice noticing small pleasures. The warmth of coffee. A good song. Sunlight. These tiny moments are where life actually happens.", duration: 180 },
      recovery: { script: "Something to remember. Healing isn't linear. Some days you'll feel better. Some days, worse. Both are part of the process. Self-compassion isn't weakness - it's how you build the strength to keep going. Your pace right now is exactly right. There's no schedule for restoration. Trust the process.", duration: 180 },
    },
    breath: {
      work: { script: "Pause for a moment. Let's breathe. In through the nose... 2... 3... 4... Hold... 2... 3... 4... Out through the mouth... 2... 3... 4... 5... 6... Again. In... 2... 3... 4... Hold... Out slowly... One more time. Deep breath in... hold... and release everything. You're centered. You're ready.", duration: 60 },
      off: { script: "Take a breath with me. No rush. In through the nose... nice and slow... hold gently... and release. Again. Breathe in calm... hold... breathe out tension. One more. In... this moment is yours... out... let everything else wait. You're here. You're present. That's enough.", duration: 60 },
      recovery: { script: "Let's breathe together. Very gently. In through your nose... 2... 3... 4... Hold softly... 2... 3... Out through your mouth... 2... 3... 4... 5... Your only job right now is to breathe. In... hold... out... Feel your body soften. You're safe. You're okay. Rest here.", duration: 75 },
    },
    day_close: {
      work: { script: "The day is done. Whatever happened, happened. Let go of what you couldn't control. Acknowledge what you did accomplish - you showed up, you tried, you made it through. That matters. Now, let work stay at work. The evening is yours. Rest well.", duration: 45 },
      off: { script: "Your day off is coming to a close. Hopefully it gave you what you needed - rest, joy, or simply a break. You don't have to justify how you spent it. Days of rest are valuable exactly as they are. Carry this feeling with you. You deserve days like this.", duration: 45 },
      recovery: { script: "Evening. Another day of rest behind you. You're taking care of yourself, and that's important work too. You may not feel it yet, but you're rebuilding. Sleep well tonight. Tomorrow, a little more strength. Be proud of your patience with yourself.", duration: 50 },
    },
    tomorrow_preview: {
      work: { script: "Tomorrow is a work day. I've set a focused morning for you. Rest well tonight.", duration: 10 },
      off: { script: "Tomorrow is yours. A relaxed start awaits. Enjoy your evening.", duration: 10 },
      recovery: { script: "Tomorrow is for continued recovery. Let tonight restore you.", duration: 10 },
    },
    checkpoint_1: {
      work: { script: "Quick moment before you dive in. What's the ONE thing that matters most today? Not everything - just one. Hold that in mind. You've got this.", duration: 25 },
      off: { script: "Morning check-in. What's one nourishing thing you could do today? Nothing big. Just something that feeds your soul. Keep that in mind.", duration: 25 },
      recovery: { script: "Gentle check-in. How's your body feeling? No judgment. Just notice. Maybe some light stretching or a slow walk if it feels right. Listen to what you need.", duration: 30 },
    },
    checkpoint_2: {
      work: { script: "Midday. If your energy is dipping, that's completely normal. Take a breath. The afternoon is often about finishing, not starting. What's the one thing left that matters?", duration: 25 },
      off: { script: "Afternoon. How's your day going? No agenda here. Just wanted to check in. You're doing great.", duration: 20 },
      recovery: { script: "Afternoon check-in. How are you feeling? Whatever the answer, it's okay. Rest is productive. You're exactly where you need to be.", duration: 25 },
    },
    checkpoint_3: {
      work: { script: "Work's winding down. Start to mentally close your tabs - the ones in your head. What can wait until tomorrow? Let it. You've done enough for today.", duration: 25 },
      off: { script: "Evening approaching. Time to close the loop on your day off. What did you enjoy? Hold onto that feeling.", duration: 20 },
      recovery: { script: "Evening. You made it through another day of rest. That's not nothing. Tomorrow might bring more energy. Or it might not. Either way, you're doing the right thing.", duration: 30 },
    },
  }

  const moduleKey = moduleType.toString()
  if (fallbacks[moduleKey] && fallbacks[moduleKey][context.dayType]) {
    return fallbacks[moduleKey][context.dayType]
  }

  return { script: "Take a moment. Breathe. You're doing well.", duration: 20 }
}

// Legacy exports for backward compatibility
export async function generateGuideContent(
  segment: GuideSegment,
  dayType: DayType,
  tone: GuideTone,
  wakeTime?: string,
  workEndTime?: string
): Promise<{ script: string; duration: number }> {
  const moduleMap: Record<GuideSegment, ModuleType> = {
    morning: 'morning_prime',
    midday: 'checkpoint_2',
    afternoon: 'checkpoint_3',
    evening: 'day_close',
  }

  return generateModuleContent(moduleMap[segment], {
    dayType,
    pace: dayType === 'work' ? 'focused' : dayType === 'off' ? 'open' : 'gentle',
    tone,
    timeMode: 'normal',
  })
}

export async function generateMicroLesson(
  dayType: DayType,
  tone: GuideTone
): Promise<string> {
  const result = await generateModuleContent('micro_lesson', {
    dayType,
    pace: dayType === 'work' ? 'focused' : dayType === 'off' ? 'open' : 'gentle',
    tone,
    timeMode: 'normal',
  })
  return result.script
}
