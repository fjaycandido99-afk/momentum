'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useAudioOptional } from '@/contexts/AudioContext'
import { AuraRing } from '@/components/ui/Aura'
import { ScrollLock } from '@/components/ui/ScrollLock'
import { transcriptParagraphs } from '@/lib/voice/transcript'

interface ResetOverlayProps {
  open: boolean
  onClose: () => void
}

// Reset / SOS — instant grounding for an overwhelming moment.
// It opens straight to a paced breathing visual (no dependency, instant),
// and plays the cached "anxiety" grounding voice from /api/calm-voice when
// it arrives (free — that audio is shared-cached, not generated per user).
// If the audio fails or is slow, the breathing alone is still a complete reset.
export function ResetOverlay({ open, onClose }: ResetOverlayProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioCtx = useAudioOptional()
  const [phase, setPhase] = useState<'in' | 'out'>('in')
  /** The grounding voice's own script — its exact words — when the cache kept it. */
  const [script, setScript] = useState<string | null>(null)
  const [showWords, setShowWords] = useState(false)

  // Paced breath label, synced to the 8s breathe animation (4s in / 4s out).
  useEffect(() => {
    if (!open) return
    setPhase('in')
    const t = setInterval(() => setPhase(p => (p === 'in' ? 'out' : 'in')), 4000)
    return () => clearInterval(t)
  }, [open])

  // Pause any background audio, then fetch + play the grounding voice.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    try { audioCtx?.pauseMusic?.() } catch { /* no-op */ }
    ;(async () => {
      try {
        const res = await fetch('/api/calm-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'anxiety', textOnly: false }),
        })
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (cancelled) return
        setScript(typeof data?.script === 'string' && data.script.trim() ? data.script : null)
        if (!data?.audioBase64) return
        const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`)
        audioRef.current = audio
        audio.play().catch(() => {})
      } catch { /* breathing-only is still a complete reset */ }
    })()
    return () => {
      cancelled = true
      setShowWords(false)
      const a = audioRef.current
      if (a) { try { a.pause() } catch { /* no-op */ } a.src = ''; audioRef.current = null }
    }
  }, [open, audioCtx])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center animate-fade-in"
      style={{ background: 'radial-gradient(circle at 50% 45%, #101626 0%, #05060a 70%)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Reset"
    >
      <ScrollLock />
      <button
        onClick={onClose}
        aria-label="Close reset"
        className="absolute top-0 right-0 m-4 p-2 rounded-full hover:bg-white/10 transition-colors"
        style={{ marginTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <X className="w-6 h-6 text-white/70" />
      </button>

      {/* Breathing pulse — the signature aura ring, scaled by the paced breath
          (4s in / 4s out). The halo stays steady so the ring's own rhythm
          doesn't fight the guidance; the wrapper does the inhale/exhale. */}
      {/* keep-motion: the slow grow/shrink IS the breathing guide. Under Reduce
          Motion the global rule would turn it into a jump every 4s — worse
          for someone trying to calm down — so this one keeps its pace. */}
      <div
        className="keep-motion relative flex items-center justify-center mb-12 ease-in-out"
        style={{
          width: 256,
          height: 256,
          transform: phase === 'in' ? 'scale(1.08)' : 'scale(0.84)',
          transition: 'transform 4000ms ease-in-out',
        }}
      >
        <AuraRing size={224} state="idle" breathe={false}>
          <span className="text-white/85 text-lg font-light tracking-wide">{phase === 'in' ? 'Breathe in' : 'Breathe out'}</span>
        </AuraRing>
      </div>

      <p className="text-white/55 text-sm text-center max-w-xs px-8 leading-relaxed">
        You&rsquo;re safe. Follow the circle &mdash; in as it grows, out as it falls. This will pass.
      </p>

      {/* The voice's words, for anyone who can't hear it or would rather read. */}
      {script && (
        <>
          <button
            onClick={() => setShowWords(v => !v)}
            aria-expanded={showWords}
            className="tap-44 mt-5 text-px-13 text-white/70 underline underline-offset-4"
          >
            {showWords ? 'Hide the words' : 'Show the words'}
          </button>
          {showWords && (
            <div className="mt-3 w-full max-w-sm px-8 max-h-[32dvh] overflow-y-auto overflow-x-hidden overscroll-contain space-y-3">
              {transcriptParagraphs(script).map((p, i) => (
                <p key={i} className="text-px-14 text-white/80 leading-relaxed">{p}</p>
              ))}
            </div>
          )}
        </>
      )}

      <button
        onClick={onClose}
        className="mt-12 px-6 py-2.5 rounded-full bg-white/10 border border-white/15 text-white text-sm hover:bg-white/15 transition-colors press-scale"
      >
        I&rsquo;m okay now
      </button>
    </div>
  )
}
