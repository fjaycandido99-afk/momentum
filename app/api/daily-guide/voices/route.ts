import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import Groq from 'groq-sdk'
import fs from 'fs'
import path from 'path'
import { createClient } from '@/lib/supabase/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

// Voice ID mapping by guide tone
const TONE_VOICES: Record<string, string> = {
  calm: 'XB0fDUnXU5powFXDhCwa',     // Charlotte - calm and soothing
  neutral: 'uju3wxzG5OhpWcoi3SMy',   // Neutral voice
  direct: 'goT3UYdM9bhm0n2lmKQx',   // Direct voice
}

// Shared file cache — keyed by type+scriptIndex+tone, reused across all users and days
const SHARED_CACHE_DIR = path.join(process.cwd(), '.audio-cache', 'shared-voices')

function ensureSharedCacheDir() {
  if (!fs.existsSync(SHARED_CACHE_DIR)) {
    fs.mkdirSync(SHARED_CACHE_DIR, { recursive: true })
  }
}

function getSharedCached(cacheKey: string): { audioBase64: string; duration: number } | null {
  ensureSharedCacheDir()
  const filePath = path.join(SHARED_CACHE_DIR, `${cacheKey}.json`)
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    } catch {
      return null
    }
  }
  return null
}

function setSharedCache(cacheKey: string, audioBase64: string, duration: number) {
  ensureSharedCacheDir()
  const filePath = path.join(SHARED_CACHE_DIR, `${cacheKey}.json`)
  fs.writeFileSync(filePath, JSON.stringify({ audioBase64, duration }))
  console.log(`[Shared Voice Cache SET] ${cacheKey}`)
}

// Lazy initialization to avoid build-time errors
let groq: Groq | null = null
function getGroq() {
  if (!groq) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return groq
}

// Voice guide types
type VoiceGuideType = 'breathing' | 'affirmation' | 'gratitude' | 'sleep' | 'grounding'

// Day-type specific voice types
type DayTypeVoiceType = 'work_prime' | 'off_prime' | 'recovery_prime' | 'work_close' | 'off_close' | 'recovery_close'

// All voice types combined
type AllVoiceType = VoiceGuideType | DayTypeVoiceType

// Pre-written 2-minute scripts (max ~250-300 words for 2 min at calm pace)
const PRE_WRITTEN_SCRIPTS: Record<VoiceGuideType, string[]> = {
  breathing: [
    `Welcome. Find a comfortable position and let your eyes gently close. We're going to spend the next two minutes together, breathing and releasing tension.

Take a slow, deep breath in through your nose... filling your lungs completely... hold it for a moment... and now release slowly through your mouth. Feel your shoulders drop. Feel your jaw unclench.

Let's do that again. Breathe in... one... two... three... four... hold... and release... one... two... three... four... five... six. Good.

Now breathe in peace and calm... imagine it as a warm, golden light entering your body. Hold it... let it spread through you... and exhale any tension, any worry, any stress.

Continue breathing at your own pace now. With each inhale, you're bringing in fresh energy. With each exhale, you're letting go of what no longer serves you.

One more deep breath together. In through the nose... hold... and release completely.

You are calm. You are centered. You are at peace.`,

    `Let's begin with a cleansing breath. Inhale slowly through your nose... feel your belly expand... your chest rise... hold this breath at the top... and exhale through your mouth with a soft sigh.

We're going to practice box breathing together. Breathe in for four counts... one... two... three... four. Hold your breath for four counts... one... two... three... four. Exhale for four counts... one... two... three... four. Hold empty for four counts... one... two... three... four.

Let's continue. Inhale... two... three... four. Hold... two... three... four. Exhale... two... three... four. Hold... two... three... four.

Feel your body respond to this rhythm. Your heart rate steadying. Your mind growing quieter.

One more round. Breathe in slowly... hold with ease... release completely... rest in the stillness.

Your calm is always just a breath away.`,
  ],

  affirmation: [
    `Take a deep breath and settle into this moment. These next two minutes are for reminding you of your inherent worth.

I am worthy of love and belonging. Not because of what I do, but simply because I exist.

I am capable of handling whatever comes my way. I have faced challenges before, and I have grown stronger each time.

I choose to release comparison. My journey is unique. I am exactly where I need to be.

I trust myself. I trust my decisions. Even when I make mistakes, they are opportunities to learn.

I deserve rest without guilt. I deserve joy without conditions.

My voice matters. My ideas have value. I contribute something unique to this world.

I am patient with myself. Growth takes time, and I am growing every single day.

Today, I choose peace over worry. Self-compassion over criticism.

I am enough. I have always been enough. I will always be enough.`,

    `Close your eyes and arrive here, fully present. Let's fill your mind with truths that will carry you through this day.

I am strong. Not just physically, but mentally and emotionally. I have survived every difficult day before this one.

I choose to focus on what I can control and release what I cannot.

I am allowed to set boundaries. My needs matter.

I attract positive energy and opportunities. I am open to receiving good things.

My past does not define my future. Every moment is a chance to begin again.

I am grateful for my body. It carries me through this life.

I forgive myself for my mistakes. I release shame and embrace growth.

I am surrounded by love, even when I don't feel it.

Right now, in this moment, I am okay. I am safe. I am loved.`,
  ],

  gratitude: [
    `Take a slow, deep breath and allow yourself to settle into this moment of reflection.

Begin by noticing your breath. This simple, automatic act keeps you alive. What a remarkable gift your body is.

Think about your hands. These incredible tools have held loved ones, created things, and carried you through countless days.

Bring to mind one person who has shown you kindness. Feel the warmth of that connection. We are never truly alone.

Consider the roof over your head. The food you've eaten today. These basics are luxuries many don't have.

Think of a challenge you've overcome. You made it through. That struggle made you who you are today.

Notice something beautiful in your surroundings right now. Beauty is everywhere when we choose to see it.

Finally, appreciate yourself. You showed up today. You're taking time to care for your wellbeing.

Let gratitude fill your heart like warm sunlight. This feeling is always available to you.`,
  ],

  sleep: [
    `Welcome to this moment of rest. It's time to let go of the day and prepare for deep, peaceful sleep.

Find a comfortable position and let your eyes close. Take one long, slow breath in... and release it with a sigh.

The day is over. Whatever happened, it's done now. Those thoughts can wait until tomorrow. Right now, there's nothing to do.

Feel the weight of your head on the pillow. Let your scalp relax. Your forehead smooths out. Your eyebrows soften.

Your jaw unclenches. Your neck and throat relax completely.

Feel your shoulders melt into the bed. Your arms grow heavy. Your hands uncurl.

Your chest rises and falls in a slow, steady rhythm. Your stomach is soft. Your lower back releases.

Your legs grow heavy. Your feet are warm. Your toes uncurl.

You are safe. You are warm. You are comfortable. Sleep is coming for you like a gentle wave.

Let go... and rest.`,

    `The day has come to an end, and you've done enough. It's time to gift yourself the rest you deserve.

Take a deep breath and feel your body settle. With each exhale, you're sinking deeper into comfort.

Imagine a warm, soft light beginning at the top of your head. It moves slowly down, relaxing everything it touches.

The warm light continues down through your body. Your entire body is bathed in this soothing glow.

Now imagine you're in a cozy cabin, deep in a quiet forest. Outside, snow falls softly. Inside, you're warm under thick blankets. You are completely safe.

The sounds of the world fade away. There's only silence now. Only stillness.

Sleep is a gift. Receive it now. Let your consciousness soften. Let your body repair.

Drift away now... into deep, healing rest.`,
  ],

  grounding: [
    `I'm here with you. Whatever you're feeling right now, it's okay. Let's come back to safety, back to the present moment.

Start by taking a deep breath. It doesn't have to be perfect. Just breathe. In through your nose... and out through your mouth. Good.

Now, let's ground ourselves. Press your feet firmly into the floor. Feel the solid ground beneath you. You are supported.

Look around and name five things you can see. Don't rush. Just notice them. You are here. You are present.

Now notice four things you can physically feel. The texture of your clothing. The temperature of the air.

Three things you can hear. Maybe distant sounds. Maybe close ones. These sounds connect you to this moment.

Two things you can smell. Take a gentle breath and notice.

One thing you can taste.

You've just completed a grounding exercise. Notice how you feel now.

Remember: anxiety is just energy. It's your body trying to protect you. But right now, you are safe.

Place your hand on your heart. Feel it beating. You are alive. You are okay. This feeling will pass.

Breathe with me one more time. Slow inhale... hold... slow exhale. You've got this.`,
  ],
}

// Day-type specific scripts
const DAY_TYPE_SCRIPTS: Record<DayTypeVoiceType, string[]> = {
  work_prime: [
    `Good morning. Today is a work day, and you have the opportunity to make it meaningful.

Take a deep breath in... and release. Let's set your intention for today.

Think about the one thing that, if accomplished, would make today a success. Not a list of tasks, but the single most important thing. Hold that in your mind.

Now, consider how you want to show up today. Present? Focused? Patient? Choose one quality to embody.

Remember, your energy is a resource. Spend it wisely. Not everything deserves your full attention. Prioritize what matters.

When challenges arise, and they will, pause before reacting. A breath can change everything.

You are capable. You are prepared. You have everything you need within you.

Today, work with intention. Focus on progress, not perfection. Celebrate small wins along the way.

Take one more deep breath. You're ready. Go make today count.`,

    `Welcome to your work day. Before the busyness begins, let's ground you in purpose.

Breathe in clarity... breathe out distraction.

What is your priority today? Not what's urgent, but what's truly important. Let that guide your energy.

Visualize yourself at the end of today, looking back with satisfaction. What did you accomplish? How did you handle challenges? How did you treat others?

Set your intention: Today, I will...

Remember that productivity isn't about doing more. It's about doing what matters. Say no to what doesn't serve your goals.

You have unique talents that the world needs. Trust yourself. Trust your abilities.

When you feel overwhelmed, return to your breath. Return to this moment. One task at a time.

You're not just going through the motions today. You're building something. Creating something. Contributing something.

Stand tall. You've got this. Make it happen.`,
  ],

  off_prime: [
    `Good morning. Today is your day off, and that's something to celebrate.

Take a slow, deep breath. There's no rush. No deadlines. No expectations except the ones you choose.

Today is for restoration. Your body and mind need this time to recover, to dream, to simply be.

What would bring you joy today? Not productivity, not accomplishments, but genuine joy. Let yourself want that.

Give yourself permission to do nothing productive. Permission to rest without guilt. Permission to play, to wander, to wonder.

Notice how your body feels when it's not bracing for work. Let your shoulders drop. Let your jaw unclench.

Today, move slowly. Eat mindfully. Laugh freely.

If your mind drifts to work or responsibilities, gently guide it back. Those things will wait. This moment won't.

You deserve rest. You've earned it. It's not laziness to recharge. It's wisdom.

Embrace today fully. Let it fill you back up. Tomorrow can take care of itself.`,

    `Rise gently into this beautiful day off.

No alarms needed. No schedules to keep. Today belongs to you entirely.

Breathe in possibility... breathe out obligation.

What does your soul need today? Stillness? Adventure? Connection? Solitude? Listen to what it's telling you.

Release the guilt that sometimes comes with rest. Your worth isn't measured by productivity. You matter simply because you exist.

Today, follow your curiosity. Read that book. Take that walk. Call that friend. Or do absolutely nothing at all.

Notice the small pleasures. The warmth of sunlight. The taste of your morning coffee. The comfort of your favorite spot.

You work hard. You give so much. Today, receive. Let the day give back to you.

There's beauty in unstructured time. Space for thoughts to wander. Room for creativity to bloom.

Enjoy every moment of this gift called a day off.`,
  ],

  recovery_prime: [
    `Good morning. Today is a recovery day, and you're exactly where you need to be.

Take the gentlest breath you can. No forcing. No striving. Just ease.

Your body is asking for rest, and that's not weakness. It's wisdom. Healing happens in stillness.

Today, move slowly. Speak softly. Think kindly, especially about yourself.

Release any pressure to be productive. Your only job today is to take care of yourself.

What does recovery look like for you right now? Maybe it's extra sleep. Maybe it's gentle movement. Maybe it's simply being still.

Honor your limits today. If something feels like too much, it is too much. That's okay.

Drink water. Eat nourishing food. Rest when you need to. These are not small things. They are essential.

Be patient with yourself. Recovery isn't linear. Some moments will feel better than others. All of them are valid.

You are healing. You are restoring. You are taking care of the most important person in your life: you.

Go gently today.`,

    `This is a recovery day, and that makes it one of the most important days.

Breathe in self-compassion... breathe out self-criticism.

Your body is not a machine. It needs rest to function. Today, you honor that need.

Lower your expectations for today. Way lower. Then lower them again. Whatever you accomplish beyond existing is a bonus.

Notice where you're holding tension. Your shoulders? Your jaw? Your hands? Consciously soften those places.

It's okay to cancel plans. It's okay to say no. It's okay to disappoint others to take care of yourself.

Recovery might look like staying in bed. It might look like a slow walk. It might look like watching comfort shows all day. All of these are valid.

You don't need to explain or justify your need for rest. It simply is what it is.

Treat yourself today like you would treat someone you love who isn't feeling well. With patience. With kindness. With care.

You will get through this. One gentle moment at a time.`,
  ],

  work_close: [
    `The work day is coming to a close. It's time to release and reflect.

Take a deep breath in... and let it all go.

You showed up today. You did what you could. That is enough.

Think of one thing you accomplished today, no matter how small. Acknowledge it. Celebrate it.

Now, think of something that didn't go as planned. Instead of dwelling on it, ask: what can I learn? Then let it go.

The work will be there tomorrow. It doesn't need to live in your mind tonight.

Physically feel yourself transitioning. Roll your shoulders back. Unclench your hands. You're leaving work mode now.

This evening is yours. Use it to restore. Connect with loved ones. Do something that brings you joy.

You are more than your job. More than your productivity. Tonight, remember who you are outside of work.

Tomorrow is a new day with new opportunities. For now, rest. You've earned it.

Well done today. Sleep peacefully.`,
  ],

  off_close: [
    `Your day off is winding down. What a gift this day has been.

Breathe in gratitude... breathe out completely.

Think about how you spent today. Did you rest? Play? Connect? Whatever you did, it was exactly right for you.

Notice how your body feels after a day without work stress. Remember this feeling. You can return to it.

If you did absolutely nothing productive today, congratulations. That takes courage in a world that constantly demands more.

As evening settles in, let yourself feel content. You recharged. You took care of yourself. That matters.

Tomorrow, regular life resumes. But you'll face it restored. Renewed. Ready.

Carry the peace of today into your sleep tonight. Let it be deep and restful.

You honored your need for rest today. Be proud of that.

Sleep well. Dream sweetly. Tomorrow will take care of itself.`,
  ],

  recovery_close: [
    `Your recovery day is ending. You made it through, and that's an accomplishment.

Take the softest breath. Let your body sink into rest.

Today, you chose yourself. You prioritized healing over hustle. That's not weakness. That's wisdom.

Even if today was hard, you're still here. Still breathing. Still going.

Notice any small improvements from this morning. Perhaps your energy is slightly better. Perhaps your mind is slightly calmer. Progress isn't always obvious.

Release any guilt about today. You needed this time. You took this time. That was the right choice.

As you prepare for sleep, set a gentle intention. Tomorrow, I will continue to be kind to myself.

Recovery isn't a single day event. It's an ongoing practice. Tonight, rest deeply knowing you're doing the work of healing.

You are strong, even in your vulnerability. Especially in your vulnerability.

Sleep will restore you further. Welcome it. Embrace it.

Tomorrow is another chance to heal. For now, just rest.`,
  ],
}

// Get day-of-year for script rotation
function getDayOfYear(): number {
  return Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
}

// Get today's script based on date rotation
function getTodayScript(type: VoiceGuideType): { script: string; index: number } {
  const scripts = PRE_WRITTEN_SCRIPTS[type]
  const index = getDayOfYear() % scripts.length
  return { script: scripts[index], index }
}

// Get today's day-type script
function getTodayDayTypeScript(type: DayTypeVoiceType): { script: string; index: number } {
  const scripts = DAY_TYPE_SCRIPTS[type]
  const index = getDayOfYear() % scripts.length
  return { script: scripts[index], index }
}

// Generate audio with ElevenLabs (max 2 min)
async function generateAudio(script: string, tone: string = 'calm'): Promise<{ audioBase64: string | null; duration: number }> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    console.error('[ElevenLabs] No API key')
    return { audioBase64: null, duration: 0 }
  }

  try {
    const voiceId = TONE_VOICES[tone] || TONE_VOICES.calm

    const response = await fetch(
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

    if (!response.ok) {
      const error = await response.text()
      console.error(`[ElevenLabs] Error: ${response.status} - ${error}`)
      return { audioBase64: null, duration: 0 }
    }

    const audioBuffer = await response.arrayBuffer()
    const audioBase64 = Buffer.from(audioBuffer).toString('base64')

    // Estimate duration: ~150 words per minute for calm speech, ~5 chars per word
    const estimatedDuration = Math.ceil((script.length / 5) / 150 * 60)

    return { audioBase64, duration: Math.min(estimatedDuration, 120) } // Cap at 2 min
  } catch (error) {
    console.error('[ElevenLabs] Exception:', error)
    return { audioBase64: null, duration: 0 }
  }
}

// Look up user's guide tone from preferences
async function getUserTone(userId: string): Promise<string> {
  try {
    const prefs = await prisma.userPreferences.findUnique({
      where: { user_id: userId },
      select: { guide_tone: true },
    })
    return prefs?.guide_tone || 'calm'
  } catch {
    return 'calm'
  }
}

// GET - Fetch today's voices (generate if needed)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as VoiceGuideType | null

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || searchParams.get('userId') || 'demo-user'
    const tone = user ? await getUserTone(userId) : 'calm'

    // Get today's date at midnight
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find or create today's guide
    let guide = await prisma.dailyGuide.findUnique({
      where: {
        user_id_date: {
          user_id: userId,
          date: today,
        },
      },
    })

    if (!guide) {
      // Create a basic guide entry for today
      guide = await prisma.dailyGuide.create({
        data: {
          user_id: userId,
          date: today,
          day_type: 'work',
          modules: [],
        },
      })
    }

    // If requesting specific type
    if (type) {
      const scriptField = `${type}_script` as keyof typeof guide
      const audioField = `${type}_audio` as keyof typeof guide
      const durationField = `${type}_duration` as keyof typeof guide

      // Check if already saved to this user's daily guide
      if (guide[scriptField] && guide[audioField]) {
        return NextResponse.json({
          type,
          script: guide[scriptField],
          audioBase64: guide[audioField],
          duration: guide[durationField] || 120,
          cached: true,
        })
      }

      // Get today's script + index
      const { script, index } = getTodayScript(type)
      const sharedKey = `${type}-s${index}-${tone}`

      // Check shared file cache first (reused across all users and days)
      let audioBase64: string | null = null
      let duration = 0
      const shared = getSharedCached(sharedKey)
      if (shared) {
        console.log(`[Shared Voice Cache HIT] ${sharedKey}`)
        audioBase64 = shared.audioBase64
        duration = shared.duration
      } else {
        // Only call ElevenLabs if not in shared cache
        const result = await generateAudio(script, tone)
        audioBase64 = result.audioBase64
        duration = result.duration
        if (audioBase64) {
          setSharedCache(sharedKey, audioBase64, duration)
        }
      }

      // Save to user's daily guide DB record
      if (audioBase64) {
        await prisma.dailyGuide.update({
          where: { id: guide.id },
          data: {
            [scriptField]: script,
            [audioField]: audioBase64,
            [durationField]: duration,
          },
        })
      }

      return NextResponse.json({
        type,
        script,
        audioBase64,
        duration,
        cached: !!shared,
      })
    }

    // Return all voice data status
    const voiceTypes: VoiceGuideType[] = ['breathing', 'affirmation', 'gratitude', 'sleep', 'grounding']
    const voices = voiceTypes.map(t => ({
      type: t,
      hasScript: !!guide?.[`${t}_script` as keyof typeof guide],
      hasAudio: !!guide?.[`${t}_audio` as keyof typeof guide],
      duration: guide?.[`${t}_duration` as keyof typeof guide] || 0,
    }))

    return NextResponse.json({ voices, guideId: guide?.id })
  } catch (error) {
    console.error('Daily voices GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch voices' }, { status: 500 })
  }
}

// All valid voice types
const VALID_VOICE_TYPES = ['breathing', 'affirmation', 'gratitude', 'sleep', 'grounding']
const VALID_DAY_TYPE_VOICES = ['work_prime', 'off_prime', 'recovery_prime', 'work_close', 'off_close', 'recovery_close']

// POST - Generate a specific voice type
export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json()

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || 'demo-user'
    const tone = user ? await getUserTone(userId) : 'calm'

    const isRegularVoice = VALID_VOICE_TYPES.includes(type)
    const isDayTypeVoice = VALID_DAY_TYPE_VOICES.includes(type)

    if (!type || (!isRegularVoice && !isDayTypeVoice)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    // Get today's date at midnight
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find or create today's guide
    let guide = await prisma.dailyGuide.upsert({
      where: {
        user_id_date: {
          user_id: userId,
          date: today,
        },
      },
      create: {
        user_id: userId,
        date: today,
        day_type: 'work',
        modules: [],
      },
      update: {},
    })

    const scriptField = `${type}_script` as keyof typeof guide
    const audioField = `${type}_audio` as keyof typeof guide
    const durationField = `${type}_duration` as keyof typeof guide

    // Check if already saved to this user's daily guide
    if (guide[scriptField] && guide[audioField]) {
      return NextResponse.json({
        type,
        script: guide[scriptField],
        audioBase64: guide[audioField],
        duration: guide[durationField] || 120,
        cached: true,
      })
    }

    // Get today's script + index
    let script: string
    let scriptIndex: number
    if (isDayTypeVoice) {
      const result = getTodayDayTypeScript(type as DayTypeVoiceType)
      script = result.script
      scriptIndex = result.index
    } else {
      const result = getTodayScript(type as VoiceGuideType)
      script = result.script
      scriptIndex = result.index
    }

    const sharedKey = `${type}-s${scriptIndex}-${tone}`

    // Check shared file cache first (reused across all users and days)
    let audioBase64: string | null = null
    let duration = 0
    const shared = getSharedCached(sharedKey)
    if (shared) {
      console.log(`[Shared Voice Cache HIT] ${sharedKey}`)
      audioBase64 = shared.audioBase64
      duration = shared.duration
    } else {
      // Only call ElevenLabs if not in shared cache
      const result = await generateAudio(script, tone)
      audioBase64 = result.audioBase64
      duration = result.duration
      if (audioBase64) {
        setSharedCache(sharedKey, audioBase64, duration)
      }
    }

    // Save to user's daily guide DB record
    if (audioBase64) {
      await prisma.dailyGuide.update({
        where: { id: guide.id },
        data: {
          [scriptField]: script,
          [audioField]: audioBase64,
          [durationField]: duration,
        },
      })
    }

    return NextResponse.json({
      type,
      script,
      audioBase64,
      duration,
      cached: !!shared,
    })
  } catch (error) {
    console.error('Daily voices POST error:', error)
    return NextResponse.json({ error: 'Failed to generate voice' }, { status: 500 })
  }
}
