/* ============================================================================
   /api/journal/morning-minute

   POST — submit today's voice clip.
     Multipart:  audio: File   (m4a / mp4 / webm / mp3)
                 duration_sec: number
     Returns:    { transcript, response, voice_url, date }

     Pipeline:  upload audio → Supabase Storage → Whisper transcribe →
                Groq one-sentence reflection → upsert today's DailyGuide
                row with all four morning_minute_* fields.

   GET — return today's morning minute (or null if not done yet).
     Returns:    { minute: null }  OR  { minute: { ...fields } }

   This is the daily ritual we're betting Voxu's value spine on. Cheap
   (one Whisper call + one tiny Groq call), idempotent (re-submitting
   overwrites the same row), and finishes in under three seconds end to
   end so the user feels their voice was heard, not queued.
   ============================================================================ */

import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSbAdmin } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null

const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const WHISPER_MODEL = 'whisper-large-v3-turbo'
const MORNING_BUCKET = 'morning-minute'

function todayUtcDate(): Date {
  // Day key is calendar-day in UTC (matches DailyGuide.date @db.Date).
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function guessExt(mime: string): string {
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a'
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3'
  if (mime.includes('wav')) return 'wav'
  return 'm4a'
}

const REFLECTION_SYSTEM = `You are Voxu, a quiet AI companion.

The user just spoke for up to 30 seconds about what's on their mind. Your job is to give back ONE SENTENCE that helps them sit with what they said.

Rules:
- Output ONE sentence. Maximum 22 words. No preamble, no follow-up question, no "Thank you for sharing."
- Use second person ("you").
- NOT advice. NOT a fix. NOT a question. A reflection or a gentle frame they can carry into the day.
- Match their emotional register. If they sound heavy, be slow and steady. If they sound light, be light back.
- Concrete imagery beats abstract therapy-speak. Avoid "It's okay to feel ___", "Remember to ___", "Try to ___".
- Output ONLY the sentence. No quotes, no formatting.

Good examples:
- User: "I'm anxious about the meeting today, feels like everything is on the line."
  → Some weight is real. Some weight is rehearsal — see which is which before you walk in.
- User: "I'm tired, I didn't sleep well."
  → Tired is information, not a verdict on today.
- User: "Just had a good chat with my brother."
  → Notice what's warm in you right now — that's worth keeping for later.`

async function reflectOnTranscript(transcript: string): Promise<string> {
  const fallback = 'You showed up. That counts.'
  if (!groq) return fallback
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: REFLECTION_SYSTEM },
        { role: 'user', content: transcript },
      ],
      temperature: 0.7,
      max_tokens: 80,
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    // Strip surrounding quotes the model sometimes adds despite the rule.
    const cleaned = raw.replace(/^["“'`]+|["”'`]+$/g, '').trim()
    return cleaned || fallback
  } catch (err) {
    console.warn('[morning-minute] reflection failed:', err)
    return fallback
  }
}

async function transcribe(file: File): Promise<string> {
  if (!process.env.GROQ_API_KEY) return ''
  const upstream = new FormData()
  upstream.append('file', file, file.name)
  upstream.append('model', WHISPER_MODEL)
  upstream.append('response_format', 'json')
  upstream.append('language', 'en')

  const resp = await fetch(GROQ_WHISPER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: upstream,
  })
  if (!resp.ok) {
    const t = await resp.text().catch(() => '')
    throw new Error(`Whisper ${resp.status}: ${t.slice(0, 200)}`)
  }
  const data = await resp.json()
  return (data.text || '').trim()
}

async function uploadAudio(userId: string, audio: File): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('missing SUPABASE_SERVICE_ROLE_KEY')
  const admin = createSbAdmin(url, key)
  const ext = guessExt(audio.type)
  const path = `${userId}/${Date.now()}.${ext}`
  const buf = Buffer.from(await audio.arrayBuffer())
  const { error } = await admin.storage.from(MORNING_BUCKET).upload(path, buf, {
    contentType: audio.type || 'audio/mp4',
    upsert: false,
  })
  if (error) throw new Error(`upload: ${error.message}`)
  const { data: { publicUrl } } = admin.storage.from(MORNING_BUCKET).getPublicUrl(path)
  return publicUrl
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const date = todayUtcDate()
    const guide = await prisma.dailyGuide.findFirst({
      where: { user_id: user.id, date },
      select: {
        morning_minute_voice_url: true,
        morning_minute_voice_duration: true,
        morning_minute_transcript: true,
        morning_minute_response: true,
        morning_minute_at: true,
      },
    })
    if (!guide || !guide.morning_minute_at) {
      return NextResponse.json({ minute: null })
    }
    return NextResponse.json({
      minute: {
        voice_url: guide.morning_minute_voice_url,
        voice_duration_sec: guide.morning_minute_voice_duration,
        transcript: guide.morning_minute_transcript,
        response: guide.morning_minute_response,
        at: guide.morning_minute_at,
      },
    })
  } catch (err) {
    console.error('[morning-minute GET] error:', err)
    return NextResponse.json({ error: 'unknown' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const form = await request.formData()
    const audio = form.get('audio') as File | null
    const durationRaw = form.get('duration_sec')
    const duration = Math.max(1, Math.round(Number(durationRaw) || 0))
    if (!audio || audio.size === 0) {
      return NextResponse.json({ error: 'audio required' }, { status: 400 })
    }
    if (audio.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'audio too large' }, { status: 413 })
    }

    // 1. Transcribe via Whisper — fast path before storage so we can bail
    //    cleanly on a fundamentally unreadable clip.
    let transcript = ''
    try {
      transcript = await transcribe(audio)
    } catch (err) {
      console.error('[morning-minute] transcribe failed:', err)
      return NextResponse.json({ error: 'transcribe_failed' }, { status: 502 })
    }
    if (!transcript) {
      return NextResponse.json({ error: 'no_speech_detected' }, { status: 422 })
    }

    // 2. Upload audio (background-ish; not strictly required for the
    //    response loop but kept in line so the row write is one atomic
    //    transaction).
    let voiceUrl: string | null = null
    try {
      voiceUrl = await uploadAudio(user.id, audio)
    } catch (err) {
      console.warn('[morning-minute] audio upload failed (continuing):', err)
    }

    // 3. AI reflection — single Groq llama-3.1-8b-instant call.
    const response = await reflectOnTranscript(transcript)

    // 4. Persist into today's DailyGuide row. Upsert so a user who has
    //    other journal data for today (mood checkin, etc.) doesn't get
    //    a duplicate row.
    const date = todayUtcDate()
    const at = new Date()
    const existing = await prisma.dailyGuide.findFirst({
      where: { user_id: user.id, date },
      select: { id: true },
    })
    if (existing) {
      await prisma.dailyGuide.update({
        where: { id: existing.id },
        data: {
          morning_minute_voice_url: voiceUrl,
          morning_minute_voice_duration: duration,
          morning_minute_transcript: transcript,
          morning_minute_response: response,
          morning_minute_at: at,
          // Invalidate today's Morning Prime script so the next
          // /daily-guide request regenerates it with this Minute as
          // context. The other session scripts stay (not minute-aware
          // today). See project_voxu_value_spine.
          morning_prime_script: null,
        },
      })
    } else {
      await prisma.dailyGuide.create({
        data: {
          user_id: user.id,
          date,
          day_type: 'work',
          morning_minute_voice_url: voiceUrl,
          morning_minute_voice_duration: duration,
          morning_minute_transcript: transcript,
          morning_minute_response: response,
          morning_minute_at: at,
        },
      })
    }

    return NextResponse.json({
      transcript,
      response,
      voice_url: voiceUrl,
      date,
      at,
    })
  } catch (err) {
    console.error('[morning-minute POST] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    )
  }
}
