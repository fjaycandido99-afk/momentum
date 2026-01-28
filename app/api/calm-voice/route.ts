import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// Voice ID mapping by guide tone
const TONE_VOICES: Record<string, string> = {
  calm: 'XB0fDUnXU5powFXDhCwa',     // Charlotte - calm and soothing
  neutral: 'uju3wxzG5OhpWcoi3SMy',   // Neutral voice
  direct: 'goT3UYdM9bhm0n2lmKQx',   // Direct voice
}

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Lazy initialization to avoid build-time errors
let groq: Groq | null = null
function getGroq() {
  if (!groq) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return groq
}

// DB-backed cache for audio (persists across Vercel cold starts)
async function getCachedAudio(cacheKey: string): Promise<{ script: string; audioBase64: string } | null> {
  try {
    const cached = await prisma.audioCache.findUnique({
      where: { cache_key: cacheKey },
    })
    if (cached) {
      return { script: '', audioBase64: cached.audio }
    }
  } catch (e) {
    console.error('[Calm Voice Cache] DB read error:', e)
  }
  return null
}

// Save audio to DB cache
async function setCachedAudio(cacheKey: string, script: string, audioBase64: string) {
  try {
    await prisma.audioCache.upsert({
      where: { cache_key: cacheKey },
      update: { audio: audioBase64, duration: 0 },
      create: { cache_key: cacheKey, audio: audioBase64, duration: 0 },
    })
  } catch (e) {
    console.error('[Calm Voice Cache] DB write error:', e)
  }
}

// Pre-written 2-minute scripts (~250-300 words each for calm speaking pace)
const PRE_WRITTEN_SCRIPTS = {
  breathing: [
    `Welcome. Find a comfortable position and let your eyes gently close. We're going to spend the next two minutes together, breathing and releasing tension.

Take a slow, deep breath in through your nose... filling your lungs completely... hold it for a moment... and now release slowly through your mouth. Feel your shoulders drop. Feel your jaw unclench.

Let's do that again. Breathe in... one... two... three... four... hold... and release... one... two... three... four... five... six. Good.

Now breathe in peace and calm... imagine it as a warm, golden light entering your body. Hold it... let it spread through you... and exhale any tension, any worry, any stress. Watch it leave your body like grey smoke disappearing into the air.

Continue breathing at your own pace now. With each inhale, you're bringing in fresh energy. With each exhale, you're letting go of what no longer serves you.

Notice how your body feels. Perhaps your hands are warmer. Perhaps your heartbeat has slowed. This is your body thanking you for this moment of care.

One more deep breath together. In through the nose... filling every corner of your lungs... hold... and release completely, letting your body sink deeper into relaxation.

You are calm. You are centered. You are at peace. Carry this feeling with you as you continue your day. Remember, your breath is always there for you, whenever you need to return to this place of stillness.`,

    `Let's begin with a cleansing breath. Inhale slowly through your nose... feel your belly expand... your chest rise... hold this breath at the top... and exhale through your mouth with a soft sigh. Let everything go.

We're going to practice box breathing together. This technique calms your nervous system and brings you back to center.

Breathe in for four counts... one... two... three... four. Hold your breath for four counts... one... two... three... four. Exhale for four counts... one... two... three... four. Hold empty for four counts... one... two... three... four.

Let's continue. Inhale... two... three... four. Hold... two... three... four. Exhale... two... three... four. Hold... two... three... four.

Feel how your body responds to this rhythm. Your heart rate steadying. Your mind growing quieter. Each breath is an anchor, keeping you present in this moment.

One more round. Breathe in slowly... hold with ease... release completely... rest in the stillness.

Now let your breathing return to its natural rhythm. Notice how different you feel from when we started. Your body knows how to find peace. You just gave it permission.

Whenever the world feels overwhelming, remember this practice. Four counts in. Four counts hold. Four counts out. Four counts rest. Your calm is always just a breath away.`,
  ],
  affirmation: [
    `Take a deep breath and settle into this moment. These next two minutes are dedicated to reminding you of your inherent worth and power.

I am worthy of love and belonging. Not because of what I do or achieve, but simply because I exist. I don't need to prove my value to anyone.

I am capable of handling whatever comes my way. I have faced challenges before, and I have grown stronger each time. My resilience is one of my greatest strengths.

I choose to release comparison. My journey is unique, and I honor my own timeline. I am exactly where I need to be right now.

I trust myself. I trust my decisions. Even when I make mistakes, I know they are opportunities to learn and grow. I am not defined by my failures.

I deserve rest without guilt. I deserve joy without conditions. I deserve to take up space in this world fully and unapologetically.

My voice matters. My ideas have value. I contribute something unique to this world that no one else can offer.

I am patient with myself. Growth takes time, and I am growing every single day, even when I can't see it.

Today, I choose peace over worry. I choose self-compassion over criticism. I choose to believe in my own potential.

I am enough. I have always been enough. I will always be enough. This is not something I need to earn. It is simply the truth of who I am.

Carry these words with you. Let them become the voice in your head. You are worthy. You are capable. You are enough.`,

    `Close your eyes and take a moment to arrive here, fully present. Let's fill your mind with truths that will carry you through this day.

I am strong. Not just physically, but mentally and emotionally. I have survived every difficult day that has come before this one, and that is proof of my strength.

I choose to focus on what I can control and release what I cannot. This brings me freedom and peace.

I am allowed to set boundaries. Saying no to others often means saying yes to myself. My needs matter too.

I attract positive energy and opportunities. I am open to receiving good things. I deserve abundance in all its forms.

My past does not define my future. Every moment is a chance to begin again. I am constantly evolving, constantly becoming.

I am grateful for my body. It carries me through this life. I will treat it with kindness and respect.

I forgive myself for my mistakes. I release shame and embrace growth. Every misstep has taught me something valuable.

I am surrounded by love, even when I don't feel it. People care about me. I am connected to others in meaningful ways.

I have everything I need within me to create the life I want. My dreams are valid. My goals are achievable.

Right now, in this moment, I am okay. I am safe. I am loved. And that is more than enough.

Breathe in these truths. Let them settle into your bones. You are remarkable, just as you are.`,
  ],
  gratitude: [
    `Take a slow, deep breath and allow yourself to settle into this moment of reflection. For the next two minutes, we're going to turn our attention to the gifts that surround us.

Begin by noticing your breath. This simple, automatic act keeps you alive. Your lungs expand and contract without you having to think about it. What a remarkable gift your body is.

Think about your hands. These incredible tools have held loved ones, created things, and carried you through countless days. Take a moment to appreciate them.

Now, bring to mind one person who has shown you kindness. It might be a family member, a friend, or even a stranger who smiled at you. Feel the warmth of that connection. We are never truly alone.

Consider the roof over your head. The food you've eaten today. The clean water available to you. These basics that we often overlook are luxuries that many in this world don't have.

Think of a challenge you've overcome. Perhaps it was recent, perhaps it was years ago. You made it through. And that struggle made you who you are today. Even our difficulties carry hidden gifts.

Notice something beautiful in your surroundings right now. A ray of light. A color you love. The texture of something nearby. Beauty is everywhere when we choose to see it.

Finally, appreciate yourself. You showed up today. You're taking time to care for your wellbeing. That takes strength. You are doing better than you give yourself credit for.

Let gratitude fill your heart like warm sunlight. This feeling is always available to you, whenever you choose to look for it.`,
  ],
  sleep: [
    `Welcome to this moment of rest. It's time to let go of the day and prepare your body and mind for deep, peaceful sleep.

Find a comfortable position and let your eyes close. Take one long, slow breath in... and release it with a sigh, letting your body sink into the mattress.

The day is over. Whatever happened, whatever didn't happen, it's done now. Those thoughts can wait until tomorrow. Right now, there's nothing to do. Nowhere to be. Only rest.

Feel the weight of your head on the pillow. Let your scalp relax. Your forehead smooths out. Your eyebrows soften. The tiny muscles around your eyes release their grip.

Your jaw unclenches. Your tongue rests gently in your mouth. Your neck and throat relax completely.

Feel your shoulders melt into the bed. They've been holding so much. Let them drop. Let them rest. Your arms grow heavy. Your hands uncurl. Each finger releasing tension.

Your chest rises and falls in a slow, steady rhythm. Your heartbeat is calm and peaceful. Your stomach is soft. Your lower back releases.

Your legs grow heavy. Your thighs sink into the mattress. Your knees, your calves, your ankles - all relaxing. Your feet are warm and heavy. Your toes uncurl.

You are safe. You are warm. You are comfortable. There's nothing to figure out tonight. Sleep is coming for you like a gentle wave.

Your thoughts become soft and dreamy. Float on this wave of relaxation. Drift... deeper... and deeper... into peaceful, restorative sleep.

Let go... and rest.`,

    `The day has come to an end, and you've done enough. It's time to gift yourself the rest you deserve.

Take a deep breath and feel your body settle. With each exhale, you're sinking deeper into comfort. Deeper into peace.

Imagine a warm, soft light beginning at the top of your head. It moves slowly down, relaxing everything it touches. Your face softens. Your neck releases. Your shoulders drop away from your ears.

The warm light continues down your arms, making them feel heavy and relaxed. Down through your chest, your belly, warming you from the inside.

Down through your hips, your thighs. The light reaches your knees, your calves, your feet. Your entire body is bathed in this soothing glow.

Now imagine you're in a cozy cabin, deep in a quiet forest. Outside, snow falls softly. Inside, you're warm under thick blankets. A gentle fire crackles nearby. You are completely safe. Completely at peace.

The sounds of the world fade away. There's only silence now. Only stillness. Only the gentle rhythm of your breathing.

Your mind begins to quiet. Thoughts float by like clouds, but you don't need to follow them. Let them drift past. You're simply resting. Simply being.

Sleep is a gift. Receive it now. Let your consciousness soften. Let your body repair. Let your mind dream.

Tomorrow will take care of itself. Right now, in this moment, you are safe. You are peaceful. You are ready for sleep.

Drift away now... into the quiet darkness... into deep, healing rest.`,
  ],
  anxiety: [
    `I'm here with you. Whatever you're feeling right now, it's okay. Let's take these next two minutes to come back to safety, back to the present moment.

Start by taking a deep breath. It doesn't have to be perfect. Just breathe. In through your nose... and out through your mouth. Good. You're doing great.

Now, let's ground ourselves. Press your feet firmly into the floor. Feel the solid ground beneath you. It's holding you up. You are supported.

Look around and name five things you can see. Don't rush. Just notice them. A wall. A light. A color. Objects in your space. You are here. You are present.

Now notice four things you can physically feel. The texture of your clothing. The temperature of the air. Your hands resting somewhere. The sensation of sitting or standing.

Three things you can hear. Maybe distant sounds. Maybe close ones. Maybe even the sound of your own breathing. These sounds connect you to this moment.

Two things you can smell. Take a gentle breath and notice. Even if it's subtle, something is there.

One thing you can taste. The inside of your mouth. A recent drink. Anything at all.

You've just completed a grounding exercise. Notice how you feel now compared to a few moments ago.

Remember: anxiety is just energy. It's your body trying to protect you. But right now, you are safe. There is no emergency in this present moment.

Place your hand on your heart. Feel it beating. You are alive. You are okay. This feeling will pass, like every anxious moment before it has passed.

Breathe with me one more time. Slow inhale... hold... slow exhale. You've got this. You always have.`,
  ],
  meditation: [
    `Find a comfortable position and allow your eyes to close. For the next two minutes, we're going to practice a body scan meditation, releasing tension from head to toe.

Begin by bringing your awareness to the top of your head. Notice any sensations there. Without trying to change anything, simply observe. Now imagine that area softening, releasing, letting go.

Move your attention to your forehead. Often we hold worry here without realizing it. Let your forehead smooth out. Feel the release.

Your eyes have worked hard today. Let them rest now. The muscles around them relax. Your eyelids are heavy and peaceful.

Bring awareness to your jaw. This is where many of us hold stress. Let your teeth part slightly. Feel your jaw drop. Your tongue rests gently.

Your neck and shoulders carry so much weight. Imagine warm hands gently massaging them, releasing every knot, every point of tension. Feel your shoulders drop away from your ears.

Move your attention down your arms. Your upper arms... forearms... wrists... hands... fingers. Let each part grow warm and heavy.

Now your chest. Feel it rise and fall with your breath. There's no need to control it. Just observe. Let your heart beat at its own rhythm.

Your belly softens. Your lower back releases against the surface beneath you. Your hips let go of any holding.

Down through your legs now. Your thighs... knees... calves... ankles... feet... all the way to your toes. Every muscle fiber releasing.

You are now completely relaxed from head to toe. Rest here for a moment in this peaceful state.

When you're ready, take a deep breath and carry this sense of calm with you. Your body thanks you for this gift.`,
  ],
}

// Get today's script index
function getTodayScriptIndex(type: string): number {
  const today = new Date()
  const dayOfMonth = today.getDate() - 1
  const scripts = PRE_WRITTEN_SCRIPTS[type as keyof typeof PRE_WRITTEN_SCRIPTS]
  return dayOfMonth % (scripts?.length || 1)
}

// Get day of month for cache key
function getTodayCacheKey(): number {
  return new Date().getDate()
}

// Content type prompts for AI generation
const CONTENT_TYPES = {
  breathing: {
    prompt: 'Write a 2-minute guided breathing exercise script. Include slow breathing instructions, counts, and calming imagery. About 250 words.',
    color: 'from-cyan-600 to-blue-800',
  },
  affirmation: {
    prompt: 'Write a 2-minute positive affirmation script using "I am" statements. Include themes of self-worth, capability, and inner peace. About 250 words.',
    color: 'from-purple-600 to-indigo-800',
  },
  meditation: {
    prompt: 'Write a 2-minute body scan meditation script. Guide the listener through relaxing each body part from head to toe. About 250 words.',
    color: 'from-indigo-600 to-purple-900',
  },
  gratitude: {
    prompt: 'Write a 2-minute gratitude meditation script. Guide the listener to appreciate various aspects of their life. About 250 words.',
    color: 'from-amber-500 to-orange-700',
  },
  sleep: {
    prompt: 'Write a 2-minute sleep meditation script. Use progressive relaxation and soothing imagery to help the listener drift off. About 250 words.',
    color: 'from-slate-700 to-slate-900',
  },
  anxiety: {
    prompt: 'Write a 2-minute grounding exercise for anxiety. Include the 5-4-3-2-1 technique and reassuring messages. About 250 words.',
    color: 'from-teal-600 to-emerald-800',
  },
}

export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json()
    const contentType = CONTENT_TYPES[type as keyof typeof CONTENT_TYPES] || CONTENT_TYPES.breathing
    const preWritten = PRE_WRITTEN_SCRIPTS[type as keyof typeof PRE_WRITTEN_SCRIPTS]

    // Get authenticated user's tone preference
    let tone = 'calm'
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        const prefs = await prisma.userPreferences.findUnique({
          where: { user_id: user.id },
          select: { guide_tone: true },
        })
        tone = prefs?.guide_tone || 'calm'
      }
    } catch {
      // Fall back to calm tone
    }

    const scriptIndex = getTodayScriptIndex(type)
    // Use script index + tone as cache key so different tones get different audio
    const cacheKey = `${type}-script${scriptIndex}-${tone}`

    // Check DB cache first (persists across Vercel cold starts)
    const cached = await getCachedAudio(cacheKey)
    if (cached) {
      console.log(`[DB Cache HIT] Serving cached audio for ${cacheKey}`)
      return NextResponse.json({
        script: preWritten?.[scriptIndex] || '',
        audioBase64: cached.audioBase64,
        color: contentType.color,
        type,
        cached: true,
      })
    }

    // Use pre-written script if available
    let script = preWritten?.[scriptIndex] || ''

    // If no pre-written script, generate with AI
    if (!script) {
      const completion = await getGroq().chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a calm, soothing meditation guide. Write scripts that are peaceful and reassuring. Use ellipses (...) for pauses. No markdown formatting.' },
          { role: 'user', content: contentType.prompt },
        ],
        max_tokens: 500,
        temperature: 0.7,
      })
      script = completion.choices[0]?.message?.content || preWritten?.[0] || ''
    }

    // Generate audio with ElevenLabs
    const apiKey = process.env.ELEVENLABS_API_KEY
    let audioBase64 = null

    if (apiKey) {
      // Select voice based on user's tone preference
      const voiceId = TONE_VOICES[tone] || TONE_VOICES.calm

      const ttsResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify({
            text: script,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: {
              stability: 0.6,
              similarity_boost: 0.75,
            },
          }),
        }
      )

      if (ttsResponse.ok) {
        const audioBuffer = await ttsResponse.arrayBuffer()
        audioBase64 = Buffer.from(audioBuffer).toString('base64')

        // Save to DB cache (persists across Vercel cold starts)
        await setCachedAudio(cacheKey, script, audioBase64)
        console.log(`[DB Cache SET] Saved audio for ${cacheKey}`)
      } else {
        const errorText = await ttsResponse.text()
        console.error(`[ElevenLabs Error] Status: ${ttsResponse.status}, Response: ${errorText}`)
      }
    } else {
      console.error('[ElevenLabs Error] No API key found')
    }

    return NextResponse.json({
      script,
      audioBase64,
      color: contentType.color,
      type,
      characterCount: script.length,
    })
  } catch (error) {
    console.error('Calm voice error:', error)
    return NextResponse.json(
      { error: 'Failed to generate calming audio' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    types: [
      { id: 'breathing', name: 'Breathing', icon: 'wind', color: 'from-cyan-600 to-blue-800' },
      { id: 'affirmation', name: 'Affirmations', icon: 'sparkles', color: 'from-purple-600 to-indigo-800' },
      { id: 'meditation', name: 'Body Scan', icon: 'user', color: 'from-indigo-600 to-purple-900' },
      { id: 'gratitude', name: 'Gratitude', icon: 'heart', color: 'from-amber-500 to-orange-700' },
      { id: 'sleep', name: 'Sleep', icon: 'moon', color: 'from-slate-700 to-slate-900' },
      { id: 'anxiety', name: 'Grounding', icon: 'anchor', color: 'from-teal-600 to-emerald-800' },
    ],
  })
}
