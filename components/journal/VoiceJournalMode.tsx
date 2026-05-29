'use client'

/* ============================================================================
   Voice Journal Mode — talk-it-out journaling.

   Flow:
   1. User taps the big mic. Mic permission prompt the first time.
   2. MediaRecorder captures audio (any length up to ~25MB ≈ ~25 min).
      A live timer + waveform indicator show recording is active.
   3. User taps stop. The recording is uploaded to /api/transcribe
      (Whisper) and the transcript comes back.
   4. Transcript is saved to the day's journal as journal_freetext —
      this triggers the existing AI Reflection / Battle Report flow on
      /api/daily-guide/journal AND the auto-bookmark to /saved.
   5. When the reflection comes back, it's voice-played via ElevenLabs
      in the same warm-female voice the Daily Guide uses, so the user
      hears Arlo's response to what they just said.

   This works on both web (any browser with MediaRecorder + mic) AND
   Capacitor native iOS (uses the NSMicrophoneUsageDescription perm
   that's already declared). No native plugin or rebuild needed —
   server.url=voxu.app means the JS change lands live.
   ============================================================================ */

import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Loader2, Sparkles, Play, Pause } from 'lucide-react'
import { useMindsetOptional } from '@/contexts/MindsetContext'
import { getMindsetConfig } from '@/lib/mindset/configs'
import { getMindsetVoiceId } from '@/lib/mindset/voices'

interface VoiceJournalModeProps {
  /** YYYY-MM-DD of the date the entry should attach to. */
  dateISO: string
  /** Called after the entry + reflection are saved so the parent
   *  page can refresh its journalData / entries list. */
  onSaved?: () => void
}

type Phase =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'reflecting'
  | 'ready'
  | 'error'

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function VoiceJournalMode({ dateISO, onSaved }: VoiceJournalModeProps) {
  // The voice + persona name follow the user's current mindset so
  // Voice Journal sounds like THEIR coach (The Commander for Hustler,
  // The Sage for Stoic, etc.) instead of a generic Arlo voice.
  const mindsetCtx = useMindsetOptional()
  const mindsetConfig = mindsetCtx ? getMindsetConfig(mindsetCtx.mindset) : null
  const coachName = mindsetConfig?.coachName || 'Your coach'
  const reflectionLabel = mindsetConfig?.insightName || 'Reflection'
  const voiceId = getMindsetVoiceId(mindsetCtx?.mindset)

  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [reflection, setReflection] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Cleanup on unmount: stop any active recording, tear down mic stream,
  // pause any playing audio so the user can't navigate away mid-record
  // and leave the iOS mic indicator stuck on.
  useEffect(() => {
    return () => {
      try { recorderRef.current?.stop() } catch {}
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (timerRef.current) clearInterval(timerRef.current)
      audioRef.current?.pause()
    }
  }, [])

  const start = async () => {
    setErrorMsg('')
    setTranscript('')
    setReflection('')
    audioRef.current?.pause()
    audioRef.current = null
    setIsPlaying(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        // Mic stream off so iOS clears the orange indicator.
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        if (timerRef.current) clearInterval(timerRef.current)
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/mp4' })
        chunksRef.current = []
        if (blob.size === 0) {
          setPhase('idle')
          return
        }
        void transcribeAndReflect(blob, recorder.mimeType)
      }
      recorderRef.current = recorder
      recorder.start()
      setPhase('recording')
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } catch (err) {
      console.error('[VoiceJournal] mic permission failed:', err)
      setErrorMsg('Could not access microphone. Allow it in your device settings, then try again.')
      setPhase('error')
    }
  }

  const stop = () => {
    try { recorderRef.current?.stop() } catch {}
    setPhase('transcribing')
  }

  const transcribeAndReflect = async (audio: Blob, mimeType?: string) => {
    try {
      // 1) Whisper transcription
      setPhase('transcribing')
      const ext = (mimeType || 'audio/mp4').includes('webm') ? 'webm' : 'mp4'
      const transcribeForm = new FormData()
      transcribeForm.append('audio', audio, `voice-journal.${ext}`)
      const tResp = await fetch('/api/transcribe', { method: 'POST', body: transcribeForm })
      if (!tResp.ok) throw new Error(`Transcribe failed (${tResp.status})`)
      const tData = await tResp.json()
      const text: string = (tData.text || '').trim()
      if (!text) {
        setErrorMsg('Couldn\'t catch any words — try again, a bit closer to the mic.')
        setPhase('error')
        return
      }
      setTranscript(text)

      // 2) Save to journal — the POST endpoint auto-generates the AI
      //    reflection AND auto-bookmarks it. We just wait + read it back.
      setPhase('reflecting')
      const saveResp = await fetch('/api/daily-guide/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateISO,
          journal_freetext: text,
        }),
      })
      if (!saveResp.ok) throw new Error(`Save failed (${saveResp.status})`)
      const saveData = await saveResp.json()
      const ref: string = (saveData.reflection || '').trim()
      setReflection(ref || '')
      setPhase('ready')
      onSaved?.()

      // 3) Speak the reflection via ElevenLabs (existing /api/tts route).
      //    Fire-and-forget — UI shows the text immediately, audio plays
      //    in the background a beat later.
      if (ref) void playReflection(ref)
    } catch (err) {
      console.error('[VoiceJournal] pipeline error:', err)
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setPhase('error')
    }
  }

  const playReflection = async (text: string) => {
    try {
      const resp = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId }),
      })
      if (!resp.ok) return
      const audioBlob = await resp.blob()
      const url = URL.createObjectURL(audioBlob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onplay = () => setIsPlaying(true)
      audio.onended = () => { setIsPlaying(false); URL.revokeObjectURL(url) }
      audio.onpause = () => setIsPlaying(false)
      await audio.play().catch((e) => console.warn('[VoiceJournal] autoplay blocked:', e))
    } catch (err) {
      console.warn('[VoiceJournal] TTS failed:', err)
    }
  }

  const togglePlayback = () => {
    if (!audioRef.current) {
      if (reflection) void playReflection(reflection)
      return
    }
    if (audioRef.current.paused) audioRef.current.play().catch(() => {})
    else audioRef.current.pause()
  }

  const reset = () => {
    audioRef.current?.pause()
    audioRef.current = null
    setIsPlaying(false)
    setTranscript('')
    setReflection('')
    setErrorMsg('')
    setPhase('idle')
    setElapsed(0)
  }

  return (
    <div className="flex flex-col items-center text-center py-6 lg:py-10">
      {/* === Big mic button === */}
      {(phase === 'idle' || phase === 'recording' || phase === 'error') && (
        <button
          onClick={phase === 'recording' ? stop : start}
          aria-label={phase === 'recording' ? 'Stop and transcribe' : 'Start recording'}
          className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all press-scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
            phase === 'recording'
              ? 'bg-red-500/20 ring-2 ring-red-400/60 shadow-[0_0_40px_rgba(248,113,113,0.4)]'
              : 'bg-white text-black shadow-[0_0_50px_rgba(255,255,255,0.25)] hover:bg-white/95'
          }`}
        >
          {phase === 'recording' ? (
            <Square className="w-10 h-10 text-red-400" fill="rgb(248 113 113)" />
          ) : (
            <Mic className="w-12 h-12 text-black" />
          )}
          {phase === 'recording' && (
            <span className="absolute inset-0 rounded-full border-2 border-red-400/50 animate-ping" />
          )}
        </button>
      )}

      {/* === Timer (while recording) === */}
      {phase === 'recording' && (
        <div className="mt-6 text-2xl font-mono tabular-nums text-white">
          {formatTime(elapsed)}
        </div>
      )}

      {/* === Hint copy === */}
      {phase === 'idle' && (
        <>
          <p className="mt-6 text-lg text-white/90 font-medium">Talk to {coachName}.</p>
          <p className="mt-1.5 text-sm text-white/55 max-w-xs">
            Speak whatever&apos;s on your mind. {coachName} writes back when you&apos;re done.
          </p>
        </>
      )}
      {phase === 'recording' && (
        <p className="mt-5 text-xs text-white/55 uppercase tracking-wider">Tap to stop</p>
      )}
      {phase === 'error' && errorMsg && (
        <p className="mt-5 text-sm text-red-300 max-w-sm">{errorMsg}</p>
      )}

      {/* === Pipeline states === */}
      {(phase === 'transcribing' || phase === 'reflecting') && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 text-white/70 animate-spin" />
          <p className="text-sm text-white/65">
            {phase === 'transcribing' ? 'Listening…' : `${coachName} is reflecting…`}
          </p>
        </div>
      )}

      {/* === Transcript === */}
      {transcript && phase !== 'idle' && phase !== 'recording' && (
        <div className="mt-8 w-full max-w-xl px-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/45 mb-2">You said</div>
          <p className="text-[15px] text-white/85 leading-relaxed italic whitespace-pre-wrap">
            &ldquo;{transcript}&rdquo;
          </p>
        </div>
      )}

      {/* === Reflection card + voice playback === */}
      {phase === 'ready' && reflection && (
        <div className="mt-6 w-full max-w-xl px-2">
          <div className="relative p-5 rounded-2xl bg-white/[0.05] border border-white/[0.10]">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-white/70" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/55">{reflectionLabel}</span>
              <button
                onClick={togglePlayback}
                aria-label={isPlaying ? 'Pause reflection' : 'Play reflection'}
                className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/15 text-[11px] text-white/85 transition-colors"
              >
                {isPlaying ? <Pause className="w-3 h-3" fill="currentColor" /> : <Play className="w-3 h-3 ml-0.5" fill="currentColor" />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>
            </div>
            <p className="text-[15px] text-white/90 leading-relaxed italic">
              &ldquo;{reflection.replace(/^"|"$/g, '')}&rdquo;
            </p>
          </div>

          <button
            onClick={reset}
            className="mt-4 px-5 py-2 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-sm text-white transition-colors"
          >
            Record another
          </button>
        </div>
      )}

      {phase === 'error' && (
        <button
          onClick={reset}
          className="mt-4 px-5 py-2 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-sm text-white transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  )
}
