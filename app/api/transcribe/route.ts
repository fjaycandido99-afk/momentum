/**
 * POST /api/transcribe — Whisper transcription endpoint.
 *
 * Takes an audio blob (multipart form, field name "audio") and returns
 * { text } via Groq's hosted Whisper. Used by VoiceInput when the user
 * is on a Capacitor native app — the Web Speech API silently doesn't
 * exist in WKWebView, so we MediaRecord locally and send the bytes here
 * for transcription instead of trying to call SpeechRecognition.
 *
 * Whisper accepts wav / mp3 / mp4 / m4a / flac / ogg / webm / mpeg. The
 * browser-default MediaRecorder format on iOS WKWebView is audio/mp4
 * (AAC), all good.
 *
 * Auth: standard Supabase session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
// `whisper-large-v3-turbo` — Groq's faster Whisper, ~3x faster than
// whisper-large-v3 at near-identical accuracy for everyday speech.
const WHISPER_MODEL = 'whisper-large-v3-turbo'

const MAX_AUDIO_BYTES = 25 * 1024 * 1024 // Groq's 25MB hard cap

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) {
      return NextResponse.json({ error: 'Groq not configured' }, { status: 500 })
    }

    const form = await request.formData()
    const audio = form.get('audio') as File | Blob | null
    if (!audio || (typeof (audio as Blob).size !== 'number')) {
      return NextResponse.json({ error: 'audio field required (Blob or File)' }, { status: 400 })
    }
    if (audio.size === 0) {
      return NextResponse.json({ error: 'audio is empty' }, { status: 400 })
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'audio too large (>25MB)' }, { status: 413 })
    }

    // Re-wrap as a File so the upstream form preserves the filename +
    // mime type Groq needs to pick a decoder.
    const inputName = (audio as File).name
    const filename = inputName || `voice.${guessExt(audio.type)}`
    const filePart = inputName ? (audio as File) : new File([audio], filename, { type: audio.type || 'audio/mp4' })

    const upstreamForm = new FormData()
    upstreamForm.append('file', filePart, filename)
    upstreamForm.append('model', WHISPER_MODEL)
    upstreamForm.append('response_format', 'json')
    // English default — Whisper auto-detects but biasing helps mishears
    // common in journaling like "anxiety"/"intensity".
    upstreamForm.append('language', 'en')

    const resp = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}` },
      body: upstreamForm,
    })

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '')
      console.error(`[transcribe] Groq error ${resp.status}:`, errText.slice(0, 400))
      return NextResponse.json(
        { error: 'Transcription failed', status: resp.status, detail: errText.slice(0, 400) },
        { status: 502 },
      )
    }

    const data = await resp.json()
    const text: string = (data.text || '').trim()

    return NextResponse.json({ text })
  } catch (err) {
    console.error('[transcribe] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    )
  }
}

function guessExt(mime: string): string {
  if (!mime) return 'mp4'
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('mp4')) return 'mp4'
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3'
  if (mime.includes('wav')) return 'wav'
  if (mime.includes('ogg')) return 'ogg'
  if (mime.includes('m4a')) return 'm4a'
  return 'mp4'
}
