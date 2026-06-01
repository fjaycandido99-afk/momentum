'use client'

/* ============================================================================
   VoiceInput — dictation button for the journal.

   Two backends, chosen by what the runtime actually exposes:

   1. Web Speech API (`webkitSpeechRecognition`) — instant on-device
      streaming transcription. Available in Safari / Chrome, but NOT in
      the iOS WKWebView that Capacitor uses. When this is present we use
      it because it's free, low-latency, and emits interim text live.

   2. MediaRecorder + /api/transcribe (Whisper) — fallback when SR is
      missing. Records audio locally via the mic (requires the mic
      permission already declared in ios/App/App/Info.plist's
      NSMicrophoneUsageDescription), then uploads the blob to the server
      on stop and the server runs it through Groq Whisper. Higher
      latency (no interim text — the full transcript arrives after stop),
      but works in Capacitor native + everywhere else MediaRecorder is
      available.

   The button's UX is the same either way: tap to start, tap to stop,
   pulsing ring + waveform bars while recording. The only visible
   difference is that on the Whisper backend a small spinner shows
   between stop-tap and final transcript arrival.
   ============================================================================ */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  onInterim: (text: string) => void
  disabled?: boolean
}

type Backend = 'speech-api' | 'media-recorder' | 'none'

function detectBackend(): Backend {
  if (typeof window === 'undefined') return 'none'
  const SR = (window as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition
    || (window as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  if (SR) return 'speech-api'
  if (
    typeof window.MediaRecorder !== 'undefined'
    && typeof navigator !== 'undefined'
    && navigator.mediaDevices
    && typeof navigator.mediaDevices.getUserMedia === 'function'
  ) {
    return 'media-recorder'
  }
  return 'none'
}

export function VoiceInput({ onTranscript, onInterim, disabled }: VoiceInputProps) {
  const [backend, setBackend] = useState<Backend>('none')
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  // Visible error state — every previous failure path silently
  // console.error'd, so on native the user just saw the mic button
  // do nothing. Now we surface what went wrong inline.
  const [error, setError] = useState<string | null>(null)
  const clearError = useCallback(() => setError(null), [])

  // Web Speech refs
  const recognitionRef = useRef<{ stop: () => void } | null>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // MediaRecorder refs
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // Detect backend on mount + cleanup on unmount.
  useEffect(() => {
    setBackend(detectBackend())
    return () => {
      try { recognitionRef.current?.stop() } catch {}
      try { recorderRef.current?.stop() } catch {}
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    }
  }, [])

  // ── Web Speech API backend ────────────────────────────────────────────
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    silenceTimerRef.current = setTimeout(() => {
      try { recognitionRef.current?.stop() } catch {}
      setIsRecording(false)
    }, 60000)
  }, [])

  const startSpeechApi = useCallback(() => {
    const SR = (window as { SpeechRecognition?: new() => unknown; webkitSpeechRecognition?: new() => unknown }).SpeechRecognition
      || (window as { SpeechRecognition?: new() => unknown; webkitSpeechRecognition?: new() => unknown }).webkitSpeechRecognition
    if (!SR) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      resetSilenceTimer()
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) final += transcript
        else interim += transcript
      }
      if (final) onTranscript(final)
      if (interim) onInterim(interim)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.error('[VoiceInput] Speech API error:', event.error)
      if (event.error !== 'no-speech') {
        setIsRecording(false)
        setError(
          event.error === 'not-allowed'
            ? 'Microphone permission denied.'
            : event.error === 'network'
              ? 'Voice service unreachable. Check your connection.'
              : `Voice error: ${event.error}`,
        )
      }
    }
    recognition.onend = () => {
      setIsRecording(false)
      onInterim('')
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
      setIsRecording(true)
      setError(null)
      resetSilenceTimer()
    } catch (err) {
      console.error('[VoiceInput] Speech API start failed:', err)
      setError(err instanceof Error ? `Couldn't start mic: ${err.message.slice(0, 80)}` : 'Couldn\'t start mic.')
    }
  }, [onTranscript, onInterim, resetSilenceTimer])

  // ── MediaRecorder backend (Capacitor native, others) ──────────────────
  const startMediaRecorder = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      // Let the browser pick — WKWebView gives audio/mp4 (AAC), other
      // browsers usually webm/opus. Both work with Whisper.
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        // Tear down the mic stream so iOS releases the indicator dot.
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/mp4' })
        chunksRef.current = []
        if (blob.size === 0) {
          setIsTranscribing(false)
          setError('No audio captured — try holding closer to the mic and recording for at least a second.')
          return
        }
        try {
          setIsTranscribing(true)
          const form = new FormData()
          form.append('audio', blob, `voice.${(recorder.mimeType || 'audio/mp4').includes('webm') ? 'webm' : 'mp4'}`)
          const resp = await fetch('/api/transcribe', { method: 'POST', body: form })
          if (resp.ok) {
            const data = await resp.json()
            if (data.text) {
              onTranscript(data.text)
              setError(null)
            } else {
              setError('Couldn\'t make out any words. Try again.')
            }
          } else {
            const detail = await resp.text().catch(() => '')
            console.error('[VoiceInput] Transcribe failed', resp.status, detail.slice(0, 200))
            setError(`Transcription failed (${resp.status}). Tap to retry.`)
          }
        } catch (err) {
          console.error('[VoiceInput] Transcribe error:', err)
          setError(err instanceof Error
            ? `Transcription error: ${err.message.slice(0, 80)}`
            : 'Transcription error.')
        } finally {
          setIsTranscribing(false)
          onInterim('')
        }
      }
      recorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
      setError(null)
    } catch (err) {
      // Most common path here is the user denying mic permission. On iOS
      // they need to allow it in Settings → Voxu → Microphone.
      console.error('[VoiceInput] getUserMedia failed:', err)
      setIsRecording(false)
      // Detect the iOS permission denial specifically so we can give a
      // useful prompt instead of a cryptic browser message.
      const msg = err instanceof Error ? err.message : String(err)
      const isPermission = /denied|not\s*allowed|permission/i.test(msg)
      setError(isPermission
        ? 'Microphone permission denied. Open Settings → Voxu → Microphone to enable.'
        : `Couldn't access microphone: ${msg.slice(0, 80)}`)
    }
  }, [onTranscript, onInterim])

  const stop = useCallback(() => {
    if (backend === 'speech-api') {
      try { recognitionRef.current?.stop() } catch {}
      setIsRecording(false)
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    } else if (backend === 'media-recorder') {
      try { recorderRef.current?.stop() } catch {}
      setIsRecording(false)
      // isTranscribing flips inside onstop → after-stop.
    }
  }, [backend])

  const toggle = useCallback(() => {
    if (isRecording) {
      stop()
      return
    }
    if (backend === 'speech-api') startSpeechApi()
    else if (backend === 'media-recorder') startMediaRecorder()
  }, [isRecording, backend, startSpeechApi, startMediaRecorder, stop])

  if (backend === 'none') {
    return (
      <p className="text-[10px] text-white/50 italic">Voice not supported on this device</p>
    )
  }

  const showSpinner = isTranscribing && !isRecording

  return (
    <div className="relative inline-flex flex-col items-end gap-1">
      <button
        onClick={() => { clearError(); toggle() }}
        disabled={disabled || showSpinner}
        className={`relative p-3 rounded-xl transition-all ${
          isRecording
            ? 'bg-red-500/20 text-red-400'
            : showSpinner
              ? 'bg-white/10 text-white/70'
              : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white/85'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        aria-label={isRecording ? 'Stop recording' : showSpinner ? 'Transcribing' : 'Start voice input'}
      >
        {showSpinner ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isRecording ? (
          <>
            <MicOff className="w-5 h-5 relative z-10" />
            {/* Pulsing ring */}
            <span className="absolute inset-0 rounded-xl border-2 border-red-400/50 animate-ping" />
            {/* Waveform bars */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-0.5">
              <span className="w-0.5 h-2 bg-red-400 rounded-full animate-[wave_0.5s_ease-in-out_infinite]" />
              <span className="w-0.5 h-3 bg-red-400 rounded-full animate-[wave_0.5s_ease-in-out_infinite_0.1s]" />
              <span className="w-0.5 h-2 bg-red-400 rounded-full animate-[wave_0.5s_ease-in-out_infinite_0.2s]" />
            </div>
          </>
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
      {/* Error toast — appears under the button when something goes
          wrong so the user actually sees why nothing happened. Tap to
          dismiss; also clears the next time the user taps the mic. */}
      {error && (
        <button
          type="button"
          onClick={clearError}
          className="absolute top-full right-0 mt-2 max-w-[220px] px-3 py-2 rounded-lg bg-red-500/15 border border-red-400/30 text-[11px] text-red-200 text-left leading-snug shadow-lg z-10"
        >
          {error}
        </button>
      )}
    </div>
  )
}
