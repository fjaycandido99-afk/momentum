'use client'

/* ============================================================================
   MorningMinute — the 60-second daily voice ritual.

   Five states (single screen, no nav):
     idle       — gentle prompt + big mic button. Tap to start.
     recording  — pulsing ring + timer + tap-to-stop. Auto-stops at 30s.
     reflecting — uploading + transcribing + waiting on Groq.
     done       — shows the AI sentence in beautiful typography. Counts as
                  today's ritual. Spiral has gained one stroke.
     error      — anything failed; show the message, allow retry.

   Embedded as the hero on /. When today's minute already exists (server
   GET returns it), we mount straight in the 'done' state so the user
   sees their reflection again without re-recording.

   This is the single value-spine bet: one minute, one tap, one sentence
   back, one new stroke on their spiral.
   ============================================================================ */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Mic, Square, Loader2, RefreshCw, Sparkles, AlertTriangle, ArrowRight, Flame, MessageCircle } from 'lucide-react'

interface Minute {
  transcript: string
  response: string
  voice_url: string | null
  voice_duration_sec?: number | null
  at: string
}

type Phase = 'idle' | 'recording' | 'reflecting' | 'done' | 'error'

const MAX_SECONDS = 30

function fmtTime(s: number): string {
  return `0:${String(Math.max(0, s)).padStart(2, '0')}`
}

export function MorningMinute() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [minute, setMinute] = useState<Minute | null>(null)
  const [errMsg, setErrMsg] = useState('')
  const [streakDays, setStreakDays] = useState<number>(0)

  // Refs for the mic pipeline.
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef<number>(0)

  // On mount: see if today's minute already exists. If yes, jump to
  // 'done'. Streak fetch runs in parallel so it's there from frame 1.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [minRes, streakRes] = await Promise.all([
          fetch('/api/journal/morning-minute'),
          fetch('/api/journal/streak'),
        ])
        if (minRes.ok) {
          const data = await minRes.json()
          if (!cancelled && data?.minute) {
            setMinute(data.minute)
            setPhase('done')
          }
        }
        if (streakRes.ok) {
          const s = await streakRes.json()
          if (!cancelled) setStreakDays(s.streak_days || 0)
        }
      } catch { /* silent — start fresh */ }
    })()
    return () => { cancelled = true }
  }, [])

  // After a fresh submit, the streak should bump by one — refresh from
  // the server so the home card reflects reality without a reload.
  const refetchStreak = useCallback(async () => {
    try {
      const res = await fetch('/api/journal/streak')
      if (res.ok) {
        const s = await res.json()
        setStreakDays(s.streak_days || 0)
      }
    } catch {}
  }, [])

  // Cleanup on unmount — release the mic so iOS clears the dot.
  useEffect(() => {
    return () => {
      try { recorderRef.current?.stop() } catch {}
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startRecord = useCallback(async () => {
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
        // Release mic immediately so iOS clears the recording indicator
        // while we wait on the network.
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        if (timerRef.current) clearInterval(timerRef.current)
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/mp4' })
        chunksRef.current = []
        const duration = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
        void uploadAndReflect(blob, duration, recorder.mimeType || 'audio/mp4')
      }
      recorderRef.current = recorder
      recorder.start()
      startedAtRef.current = Date.now()
      setPhase('recording')
      timerRef.current = setInterval(() => {
        setElapsed(e => {
          const next = e + 1
          if (next >= MAX_SECONDS) {
            try { recorder.stop() } catch {}
          }
          return next
        })
      }, 1000)
    } catch (err) {
      console.error('[MorningMinute] mic error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      const isPerm = /denied|not.?allowed|permission/i.test(msg)
      setErrMsg(isPerm
        ? 'Microphone permission denied. Open Settings → Voxu → Microphone.'
        : `Couldn't open mic: ${msg.slice(0, 80)}`)
      setPhase('error')
    }
  }, [])

  const stopRecord = useCallback(() => {
    try { recorderRef.current?.stop() } catch {}
    setPhase('reflecting')
  }, [])

  const uploadAndReflect = useCallback(async (blob: Blob, duration: number, mime: string) => {
    setPhase('reflecting')
    try {
      const ext = mime.includes('webm') ? 'webm' : 'm4a'
      const form = new FormData()
      form.append('audio', blob, `morning.${ext}`)
      form.append('duration_sec', String(duration))
      const res = await fetch('/api/journal/morning-minute', { method: 'POST', body: form })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 422) {
          setErrMsg("I couldn't hear anything. Try again, a little closer.")
        } else if (res.status === 502) {
          setErrMsg('Transcription is briefly down. Try again in a moment.')
        } else {
          setErrMsg(`Something didn't connect (${res.status}). Try again.`)
        }
        setPhase('error')
        return
      }
      const data = await res.json()
      setMinute({
        transcript: data.transcript,
        response: data.response,
        voice_url: data.voice_url,
        voice_duration_sec: duration,
        at: data.at,
      })
      setPhase('done')
      void refetchStreak()
    } catch (err) {
      console.error('[MorningMinute] post failed:', err)
      setErrMsg(err instanceof Error ? err.message.slice(0, 100) : 'Something didn\'t connect.')
      setPhase('error')
    }
  }, [])

  const reset = useCallback(() => {
    setErrMsg('')
    setElapsed(0)
    setPhase('idle')
  }, [])

  // ── RENDER ─────────────────────────────────────────────────────────

  return (
    <section
      aria-labelledby="morning-minute-heading"
      className="relative mx-5 mt-4 p-6 rounded-3xl bg-gradient-to-br from-white/[0.09] to-white/[0.02] border border-white/[0.16] shadow-[0_0_40px_rgba(255,255,255,0.05)] overflow-hidden"
    >
      {/* Eyebrow — title + streak badge (when earned). The streak makes
          the spine's reward visible at all times so the loss-aversion
          loop kicks in once a user has a few days going. */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white/55" />
          <h2
            id="morning-minute-heading"
            className="card-eyebrow"
          >
            Today&apos;s Minute
          </h2>
          {streakDays >= 2 && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.10] text-[11px] font-semibold text-white tabular-nums"
              title={`${streakDays} day streak`}
            >
              <Flame className="w-3 h-3" />
              {streakDays}
            </span>
          )}
        </div>
        {phase === 'done' && (
          <button
            onClick={reset}
            aria-label="Record again"
            title="Record again"
            className="p-1 rounded-full text-white/45 hover:text-white/85 hover:bg-white/[0.06] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* IDLE */}
      {phase === 'idle' && (
        <div className="text-center pt-2 pb-1">
          {/* This file's own header calls this "the single value-spine
              bet". The question was set at 15px — the same size as body
              copy in the card below it — so nothing on the screen said it
              mattered more than anything else. */}
          <p className="text-[19px] text-white leading-snug max-w-xs mx-auto">
            What&apos;s on your mind right now?
          </p>
          <p className="text-[11.5px] text-white/45 mt-1.5">
            Talk for up to a minute. I&apos;ll listen.
          </p>
          <button
            onClick={() => void startRecord()}
            aria-label="Start today's minute"
            className="mt-5 mx-auto w-16 h-16 rounded-full bg-white text-black grid place-items-center hover:bg-white/95 shadow-[0_0_30px_rgba(255,255,255,0.18)] transition-transform press-scale"
          >
            <Mic className="w-6 h-6" />
          </button>
          <p className="mt-3 text-[10.5px] text-white/35">Tap to begin</p>

          {/* Voice is the intended ritual, but it is not always available:
              people are on a train, in an office, next to someone asleep.
              Asking "what's on your mind" and only accepting speech turns
              those users away at the first screen. Secondary by design —
              quiet enough not to compete with the mic, present enough to
              rescue the moment. */}
          <Link
            href="/journal?mode=chat"
            className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-white/45 transition-colors hover:text-white/80"
          >
            <MessageCircle className="w-3 h-3" />
            Rather type it out?
          </Link>
        </div>
      )}

      {/* RECORDING */}
      {phase === 'recording' && (
        <div className="text-center pt-2 pb-1">
          <p className="text-[12px] text-white/55">Listening…</p>
          <button
            onClick={stopRecord}
            aria-label="Stop and reflect"
            className="relative mt-4 mx-auto w-16 h-16 rounded-full bg-red-500/15 ring-2 ring-red-400/70 grid place-items-center press-scale"
          >
            <Square className="w-5 h-5 text-red-300" fill="rgb(248 113 113)" />
            <span className="absolute inset-0 rounded-full border-2 border-red-400/40 animate-ping" />
          </button>
          <p className="mt-3 text-[13px] font-mono tabular-nums text-white/85">
            {fmtTime(elapsed)} / {fmtTime(MAX_SECONDS)}
          </p>
          <p className="mt-1 text-[10.5px] text-white/40">Tap to finish</p>
        </div>
      )}

      {/* REFLECTING */}
      {phase === 'reflecting' && (
        <div className="text-center pt-4 pb-3">
          <Loader2 className="w-5 h-5 text-white/70 animate-spin mx-auto" />
          <p className="mt-3 text-[13px] text-white/75 italic">Reflecting on what you said…</p>
        </div>
      )}

      {/* DONE */}
      {phase === 'done' && minute && (
        <div className="pt-1 pb-1">
          <p
            className="text-[18px] lg:text-[20px] leading-snug text-white font-medium italic text-center"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            &ldquo;{minute.response}&rdquo;
          </p>
          <p className="mt-3 text-center card-eyebrow">
            You showed up today
          </p>

          {/* Depth handoff — Daily Guide's Morning Prime now opens
              by calling back to what the user just shared. One tap
              from the ritual into the deeper session. */}
          <Link
            href="/daily-guide"
            className="mt-5 flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] transition-colors press-scale group"
          >
            <div className="min-w-0">
              <p className="card-eyebrow">
                Go deeper
              </p>
              <p className="mt-0.5 text-[13.5px] text-white/85 leading-tight">
                Take 5 minutes with today&apos;s Morning Prime
              </p>
              <p className="mt-0.5 text-[11px] text-white/45 italic">
                Built around what you just said
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-white/55 group-hover:text-white shrink-0" />
          </Link>

          {/* Year portrait — surfaces only after the user has built
              something worth seeing. Threshold of 7 = one week of
              showing up; below that the link would feel empty. */}
          {streakDays >= 7 && (
            <Link
              href={`/portrait/${new Date().getFullYear()}`}
              className="mt-2.5 block text-center text-[11px] text-white/50 hover:text-white/85 underline-offset-2 hover:underline transition-colors"
            >
              See your year so far →
            </Link>
          )}
        </div>
      )}

      {/* ERROR */}
      {phase === 'error' && (
        <div className="text-center pt-3 pb-1">
          <AlertTriangle className="w-4 h-4 text-amber-300 mx-auto mb-2" />
          <p className="text-[13px] text-white/85 leading-snug max-w-xs mx-auto">{errMsg}</p>
          <button
            onClick={() => void startRecord()}
            className="mt-4 px-4 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/95 press-scale"
          >
            Try again
          </button>
        </div>
      )}
    </section>
  )
}
