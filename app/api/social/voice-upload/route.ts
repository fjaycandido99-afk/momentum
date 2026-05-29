/**
 * POST /api/social/voice-upload — accepts an audio blob, uploads to
 * Supabase Storage, transcribes via Groq Whisper, returns
 *   { audio_url, transcript, duration_sec }.
 *
 * The client uploads the recorded blob here BEFORE creating the post.
 * The composer then prefills its body with the transcript and stores
 * the returned audio_url + duration in state so they can be POSTed to
 * /api/social/posts alongside the body.
 *
 * Auth: standard Supabase session.
 * Storage: a public bucket `voice-reflections`. Auto-created (with
 *   service role) on first upload if missing. Random filename keeps
 *   URLs unguessable.
 * Size cap: 25MB (Whisper max). 30s of mp4 audio is ~250KB so this
 *   easily covers the intended 15–30s reflection range.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAuthClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

const BUCKET = 'voice-reflections'
const MAX_AUDIO_BYTES = 25 * 1024 * 1024 // 25MB — Whisper hard cap

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !serviceRole) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing')
  return createSupabaseClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

async function ensureBucket() {
  const admin = adminClient()
  // listBuckets is cheap; getBucket would also work. Lazy-create on miss.
  const { data: buckets } = await admin.storage.listBuckets()
  if (buckets?.some(b => b.name === BUCKET)) return
  await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_AUDIO_BYTES,
    allowedMimeTypes: ['audio/mp4', 'audio/m4a', 'audio/mpeg', 'audio/webm', 'audio/wav', 'audio/ogg'],
  })
}

function extFromMime(mime: string): string {
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a'
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3'
  if (mime.includes('wav')) return 'wav'
  if (mime.includes('ogg')) return 'ogg'
  return 'm4a'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) return NextResponse.json({ error: 'Groq not configured' }, { status: 500 })

    const form = await request.formData()
    const audio = form.get('audio') as File | Blob | null
    const durationSec = Number(form.get('duration_sec') || 0) || 0
    if (!audio || typeof (audio as Blob).size !== 'number') {
      return NextResponse.json({ error: 'audio field required (Blob or File)' }, { status: 400 })
    }
    if (audio.size === 0) return NextResponse.json({ error: 'audio is empty' }, { status: 400 })
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'audio too large (>25MB)' }, { status: 413 })
    }

    const inputName = (audio as File).name
    const ext = inputName?.split('.').pop()?.toLowerCase() || extFromMime(audio.type)
    const objectKey = `${user.id}/${randomUUID()}.${ext}`

    // 1) Upload to Supabase Storage (lazy-create bucket on first hit).
    await ensureBucket()
    const admin = adminClient()
    const arrayBuf = await (audio as Blob).arrayBuffer()
    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(objectKey, Buffer.from(arrayBuf), {
        contentType: audio.type || 'audio/mp4',
        cacheControl: 'public, max-age=31536000, immutable',
        upsert: false,
      })
    if (uploadErr) {
      console.error('[voice-upload] storage error:', uploadErr)
      return NextResponse.json({ error: 'Upload failed', detail: uploadErr.message }, { status: 502 })
    }
    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(objectKey)
    const audioUrl = pub.publicUrl

    // 2) Transcribe via Groq Whisper in parallel — we use the same
    //    pattern as /api/transcribe but inline here to keep the request
    //    one round-trip.
    const upstreamForm = new FormData()
    upstreamForm.append('file', new File([arrayBuf], inputName || `voice.${ext}`, { type: audio.type || 'audio/mp4' }))
    upstreamForm.append('model', 'whisper-large-v3-turbo')
    upstreamForm.append('response_format', 'json')
    upstreamForm.append('language', 'en')
    const transcribeResp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}` },
      body: upstreamForm,
    })
    let transcript = ''
    if (transcribeResp.ok) {
      const data = await transcribeResp.json()
      transcript = (data.text || '').trim()
    } else {
      console.warn('[voice-upload] transcription failed', transcribeResp.status)
    }

    return NextResponse.json({
      audio_url: audioUrl,
      duration_sec: Math.round(durationSec),
      transcript,
    })
  } catch (err) {
    console.error('[voice-upload]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    )
  }
}
