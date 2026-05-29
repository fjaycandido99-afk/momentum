'use client'

/* ============================================================================
   VoiceRecorder — inline mic capture for the community composer.

   States:
     idle        → big red mic button. Tap to start.
     recording   → pulsing ring + timer + tap-to-stop.
     uploading   → spinner ("Transcribing…").
     ready       → audio preview (waveform-ish playback control) +
                   prefilled transcript shown to the parent so the user
                   can edit before sharing. "Re-record" lifts back to idle.

   On `ready`, calls onReady({ audio_url, duration_sec, transcript })
   so the parent composer can wire those into the eventual POST to
   /api/social/posts.

   30-second soft cap (UI auto-stops). Web fallback works the same as
   iOS native (uses existing /api/transcribe-and-store via voice-upload).
   ============================================================================ */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Square, Loader2, Play, Pause, X } from 'lucide-react'

interface VoiceReady {
  audio_url: string
  duration_sec: number
  transcript: string
}

interface Props {
  /** Soft cap in seconds; UI auto-stops at this duration. */
  maxSeconds?: number
  /** Called once recording is uploaded + transcribed. */
  onReady: (v: VoiceReady) => void
  /** Called when user clicks Re-record or X to discard. */
  onDiscard: () => void
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function VoiceRecorder({ maxSeconds = 30, onReady, onDiscard }: Props) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'uploading' | 'ready' | 'error'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [errMsg, setErrMsg] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startedAtRef = useRef<number>(0)
  const audioElRef = useRef<HTMLAudioElement | null>(null)

  // Clean up on unmount so the iOS mic indicator clears
  useEffect(() => {
    return () => {
      try { recorderRef.current?.stop() } catch {}
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (timerRef.current) clearInterval(timerRef.current)
      audioElRef.current?.pause()
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const start = useCallback(async () => {
    setErrMsg('')
    setElapsed(0)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        // Release the mic immediately so iOS / Capacitor clears the
        // recording indicator while we upload.
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        if (timerRef.current) clearInterval(timerRef.current)
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/mp4' })
        chunksRef.current = []
        const duration = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
        void upload(blob, duration)
      }
      recorderRef.current = recorder
      recorder.start()
      startedAtRef.current = Date.now()
      setPhase('recording')
      timerRef.current = setInterval(() => {
        setElapsed(e => {
          const next = e + 1
          if (next >= maxSeconds) {
            try { recorder.stop() } catch {}
          }
          return next
        })
      }, 1000)
    } catch (err) {
      console.error('[VoiceRecorder] mic permission denied:', err)
      setErrMsg('Could not access the microphone. Allow it in your device settings.')
      setPhase('error')
    }
  }, [maxSeconds])

  const stop = useCallback(() => {
    try { recorderRef.current?.stop() } catch {}
    setPhase('uploading')
  }, [])

  const upload = useCallback(async (blob: Blob, duration: number) => {
    try {
      // Local preview before the upload roundtrip so the user sees
      // something immediately.
      const localUrl = URL.createObjectURL(blob)
      setPreviewUrl(localUrl)

      const form = new FormData()
      form.append('audio', blob, `voice.${(blob.type || 'audio/mp4').includes('webm') ? 'webm' : 'm4a'}`)
      form.append('duration_sec', String(duration))
      const res = await fetch('/api/social/voice-upload', { method: 'POST', body: form })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`upload failed (${res.status}) ${text.slice(0, 200)}`)
      }
      const data = await res.json()
      setPhase('ready')
      onReady({
        audio_url: data.audio_url,
        duration_sec: data.duration_sec || duration,
        transcript: data.transcript || '',
      })
    } catch (err) {
      console.error('[VoiceRecorder] upload error:', err)
      setErrMsg(err instanceof Error ? err.message : 'Upload failed.')
      setPhase('error')
    }
  }, [onReady])

  const togglePlayback = () => {
    if (!previewUrl) return
    if (!audioElRef.current) {
      const audio = new Audio(previewUrl)
      audioElRef.current = audio
      audio.onplay = () => setIsPlaying(true)
      audio.onpause = () => setIsPlaying(false)
      audio.onended = () => setIsPlaying(false)
    }
    if (audioElRef.current.paused) audioElRef.current.play().catch(() => {})
    else audioElRef.current.pause()
  }

  const reset = () => {
    audioElRef.current?.pause()
    audioElRef.current = null
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setIsPlaying(false)
    setPhase('idle')
    setElapsed(0)
    setErrMsg('')
    onDiscard()
  }

  return (
    <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.10]">
      {phase === 'idle' && (
        <div className="flex items-center gap-3">
          <button
            onClick={start}
            aria-label="Start voice reflection"
            className="w-11 h-11 rounded-full bg-red-500/15 hover:bg-red-500/25 border border-red-400/30 grid place-items-center transition-colors press-scale"
          >
            <Mic className="w-5 h-5 text-red-300" />
          </button>
          <div className="text-sm">
            <div className="text-white/85">Record a voice reflection</div>
            <div className="text-[11px] text-white/50">Up to {maxSeconds} seconds. Auto-transcribed.</div>
          </div>
          <button
            onClick={reset}
            aria-label="Cancel voice mode"
            className="ml-auto p-1 rounded-full hover:bg-white/10 text-white/55"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {phase === 'recording' && (
        <div className="flex items-center gap-3">
          <button
            onClick={stop}
            aria-label="Stop recording"
            className="relative w-11 h-11 rounded-full bg-red-500/20 ring-2 ring-red-400/60 grid place-items-center press-scale"
          >
            <Square className="w-5 h-5 text-red-300" fill="rgb(248 113 113)" />
            <span className="absolute inset-0 rounded-full border-2 border-red-400/50 animate-ping" />
          </button>
          <div className="font-mono tabular-nums text-base text-white">{formatTime(elapsed)}</div>
          <div className="ml-auto text-[11px] text-white/55">Tap stop when you&apos;re done</div>
        </div>
      )}

      {phase === 'uploading' && (
        <div className="flex items-center gap-3 py-1">
          <Loader2 className="w-5 h-5 text-white/70 animate-spin" />
          <div className="text-sm text-white/75">Transcribing your voice…</div>
        </div>
      )}

      {phase === 'ready' && (
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlayback}
            aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
            className="w-11 h-11 rounded-full bg-white text-black grid place-items-center hover:bg-white/95 press-scale"
          >
            {isPlaying ? <Pause className="w-4 h-4" fill="black" /> : <Play className="w-4 h-4 ml-0.5" fill="black" />}
          </button>
          <div className="text-[11px] text-white/65">
            Voice attached. Edit the transcript below if you want, then Share.
          </div>
          <button
            onClick={reset}
            aria-label="Re-record"
            className="ml-auto px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-[11px] text-white/80"
          >
            Re-record
          </button>
        </div>
      )}

      {phase === 'error' && (
        <div className="flex items-center gap-3">
          <div className="text-sm text-red-300 flex-1">{errMsg}</div>
          <button onClick={reset} className="px-3 py-1.5 rounded-full bg-white/[0.06] text-xs text-white/85">
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
