'use client'

import { useEffect, useState } from 'react'
import { CircularVisualizer } from '@/components/player/CircularVisualizer'
import { BufferAnalyser, type AudioAnalyserLike } from '@/components/player/audio-analyser-cache'
import { currentVoxuAudio, VOXU_SPEAKING_EVENT } from '@/lib/voice/voxu-audio'

/** One decode per line, however many rings are showing it. */
const analysers = new WeakMap<HTMLAudioElement, Promise<AudioAnalyserLike | null>>()

/**
 * Reads the line's own levels as it plays — the guided player's way
 * (BufferAnalyser), which works inside the iPhone app where a
 * MediaElementSource stays silent. The line is a data URI, so decoding it
 * costs no network. Null when decoding isn't possible: the ring then moves
 * on its own rather than not at all.
 */
function analyserFor(audio: HTMLAudioElement): Promise<AudioAnalyserLike | null> {
  let p = analysers.get(audio)
  if (!p) {
    p = (async () => {
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!Ctx || !audio.src) return null
        const bytes = await (await fetch(audio.src)).arrayBuffer()
        const ctx = new Ctx()
        const buffer = await ctx.decodeAudioData(bytes)
        ctx.close().catch(() => {})
        return new BufferAnalyser(buffer, audio)
      } catch {
        return null
      }
    })()
    analysers.set(audio, p)
  }
  return p
}

/** Which of Voxu's lines is playing right now, app-wide. */
export function useVoxuSpeaking(): HTMLAudioElement | null {
  const [audio, setAudio] = useState<HTMLAudioElement | null>(() => currentVoxuAudio())
  useEffect(() => {
    const on = () => setAudio(currentVoxuAudio())
    window.addEventListener(VOXU_SPEAKING_EVENT, on)
    on()
    return () => window.removeEventListener(VOXU_SPEAKING_EVENT, on)
  }, [])
  return audio
}

/**
 * The guided player's ring of ticks, around Voxu's orb, while Voxu speaks.
 * Sits BEHIND the orb (absolute, centred, no pointer events); `size` is the
 * whole canvas — about twice the orb. Nothing is drawn when Voxu is quiet.
 */
export function SpeakingRing({ size, className = '', always = false }: { size: number; className?: string; /** Be the orb: the dial at rest when Voxu is quiet. */ always?: boolean }) {
  const audio = useVoxuSpeaking()
  const [analyser, setAnalyser] = useState<AudioAnalyserLike | null>(null)

  useEffect(() => {
    setAnalyser(null)
    if (!audio) return
    let live = true
    analyserFor(audio).then(a => { if (live) setAnalyser(a) })
    return () => { live = false }
  }, [audio])

  if (!audio && !always) return null
  // At rest the orb breathes — unless the phone asks for less motion.
  const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${always ? '' : 'animate-fade-in '}${className}`}
      style={{ width: size, height: size }}
    >
      <CircularVisualizer
        analyser={analyser}
        simulated={!analyser}
        isPlaying={!!audio}
        breathe={always && !still}
        dial
        glow="150 165 255"
        barCount={size < 120 ? 36 : 56}
        size={size}
        className="w-full h-full"
      />
    </span>
  )
}
