'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AudioLines, Pause, Play, X } from 'lucide-react'
import { fetchVoxuAudio, type VoxuAudioResult } from '@/lib/voice/voxu-audio'
import { FIRST_VISIT_ASK, type GuideLine, type GuideScreen } from '@/lib/voice-guide/scripts'
import { haptic } from '@/lib/haptics'
import { trackFeature } from '@/lib/analytics/track'

/**
 * "Explain this" — Voxu walks someone through the screen they're on.
 *
 * The orb sits in the header. Tapping it plays the screen's script
 * (lib/voice-guide/scripts) line by line in Voxu's voice, with captions in
 * a bar at the bottom, lighting up each part of the screen as it's named
 * (data-voxu-spot). On a first visit the orb glows and ASKS — nothing is
 * ever spoken unprompted (iPhones block sound before a tap anyway, and
 * people open apps on the bus).
 *
 * Voice goes through lib/voice/voxu-audio (signed-in, cached per line,
 * metered). A line it can't voice — out of today's lines, offline — shows as
 * a caption for a reading-length pause instead, so the walkthrough always
 * finishes. Captions are always on.
 */

const SEEN = (screen: GuideScreen) => `voxu.guide.${screen}.v1`
const SPOT_CLASS = 'voxu-spot'

function readSeen(screen: GuideScreen): boolean {
  try { return localStorage.getItem(SEEN(screen)) === '1' } catch { return true }
}
function markSeen(screen: GuideScreen) {
  try { localStorage.setItem(SEEN(screen), '1') } catch { /* storage blocked */ }
}

/** How long a caption stays when it can't be spoken: reading pace, at least 2.5s. */
function readingMs(text: string) {
  return Math.max(2500, (text.split(/\s+/).length / 2.6) * 1000 + 600)
}

function spotlight(spot: string | undefined) {
  document.querySelectorAll(`.${SPOT_CLASS}`).forEach(el => el.classList.remove(SPOT_CLASS))
  if (!spot) return
  const el = document.querySelector<HTMLElement>(`[data-voxu-spot="${spot}"]`)
  if (!el) return
  el.classList.add(SPOT_CLASS)
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
}

export function VoxuGuide({ screen, lines }: { screen: GuideScreen; lines: GuideLine[] | null }) {
  const [offer, setOffer] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [index, setIndex] = useState(0)
  const [quiet, setQuiet] = useState(false) // a line fell back to captions
  const run = useRef(0)
  const audio = useRef<HTMLAudioElement | null>(null)
  const timer = useRef<number | null>(null)
  const resume = useRef<(() => void) | null>(null)
  const pausedRef = useRef(false)

  // First visit: glow and ask, once the screen has something to explain.
  useEffect(() => {
    if (lines && lines.length && !readSeen(screen)) setOffer(true)
  }, [screen, lines])

  const stop = useCallback(() => {
    run.current++
    audio.current?.pause()
    audio.current = null
    if (timer.current) window.clearTimeout(timer.current)
    resume.current = null
    spotlight(undefined)
    setPlaying(false)
    setPaused(false)
    pausedRef.current = false
  }, [])

  useEffect(() => stop, [stop])

  const start = useCallback(async () => {
    if (!lines?.length) return
    haptic('light')
    markSeen(screen)
    setOffer(false)
    trackFeature('voice_guide', 'use', screen)
    const id = ++run.current
    setPlaying(true)
    setPaused(false)
    pausedRef.current = false
    setQuiet(false)

    // Fetch ahead: the next line is on its way while this one plays.
    const fetches: Promise<VoxuAudioResult>[] = []
    const get = (i: number) => (fetches[i] ??= fetchVoxuAudio(lines[i].text))
    get(0)

    for (let i = 0; i < lines.length; i++) {
      if (run.current !== id) return
      setIndex(i)
      spotlight(lines[i].spot)
      const res = await get(i)
      if (i + 1 < lines.length) get(i + 1)
      if (run.current !== id) return

      await new Promise<void>(done => {
        const fallBack = () => {
          setQuiet(true)
          const wait = () => { timer.current = window.setTimeout(done, readingMs(lines[i].text)) }
          resume.current = wait
          wait()
        }
        if (!res.ok) {
          // Paused between lines: hold the caption until they resume.
          if (pausedRef.current) { resume.current = fallBack; return }
          return fallBack()
        }
        const a = res.audio
        audio.current = a
        a.onended = () => done()
        a.onerror = () => fallBack()
        resume.current = () => { a.play().catch(fallBack) }
        if (!pausedRef.current) a.play().catch(fallBack)
      })
    }
    if (run.current === id) stop()
  }, [lines, screen, stop])

  const togglePause = () => {
    if (paused) {
      setPaused(false)
      pausedRef.current = false
      resume.current?.()
    } else {
      setPaused(true)
      pausedRef.current = true
      audio.current?.pause()
      if (timer.current) window.clearTimeout(timer.current)
    }
  }

  const ready = !!lines?.length

  return (
    <>
      <div className="relative">
        <button
          onClick={() => (playing ? stop() : start())}
          disabled={!ready}
          aria-label={playing ? 'Stop Voxu' : 'Ask Voxu to explain this page'}
          className={`tap-44 w-10 h-10 rounded-full flex items-center justify-center border transition-colors disabled:opacity-40 ${
            offer || playing ? 'voxu-orb-glow' : ''
          }`}
          style={{
            borderColor: 'rgb(var(--era-accent, 255 255 255) / 0.55)',
            background: 'radial-gradient(circle at 50% 40%, rgb(var(--era-accent, 255 255 255) / 0.28), rgb(10 12 20 / 0.9) 70%)',
          }}
        >
          <AudioLines className="w-4 h-4 text-white" aria-hidden />
        </button>

        {offer && !playing && (
          // Not a dialog: an inline question that leaves the page usable, so
          // nothing behind it is frozen.
          <div
            role="group"
            aria-label="Voxu"
            className="absolute right-0 top-12 z-[55] w-64 rounded-2xl border border-white/[0.16] bg-[#0d1018] p-3 shadow-2xl"
          >
            <p className="text-px-13 text-white leading-snug">{FIRST_VISIT_ASK[screen]}</p>
            <div className="flex gap-2 mt-2.5">
              <button onClick={start} className="tap-44 px-3 py-1.5 rounded-full bg-white text-black text-px-12 font-medium">
                Walk me through
              </button>
              <button onClick={() => { markSeen(screen); setOffer(false) }} className="tap-44 px-3 py-1.5 rounded-full border border-white/20 text-px-12 text-white/80">
                Not now
              </button>
            </div>
          </div>
        )}
      </div>

      {playing && lines && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-x-0 z-[65] px-4 flex justify-center pointer-events-none"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 92px)' }}
        >
          <div className="pointer-events-auto w-full max-w-lg rounded-2xl border border-white/[0.16] bg-[#0b0d14]/95 backdrop-blur p-3 flex items-start gap-3 shadow-2xl">
            <span className="voxu-orb-glow mt-0.5 w-8 h-8 shrink-0 rounded-full flex items-center justify-center" style={{ background: 'rgb(var(--era-accent, 255 255 255) / 0.2)' }} aria-hidden>
              <AudioLines className="w-4 h-4 text-white" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-px-14 text-white leading-snug" aria-live="polite">{lines[index]?.text}</p>
              <p className="text-px-10 text-white/50 mt-1 tabular-nums">
                {index + 1} of {lines.length}{quiet ? ' · voice is resting, here it is in words' : ''}
              </p>
            </div>
            <button onClick={togglePause} aria-label={paused ? 'Resume' : 'Pause'} className="tap-44 p-1.5 rounded-full hover:bg-white/10">
              {paused ? <Play className="w-4 h-4 text-white" /> : <Pause className="w-4 h-4 text-white" />}
            </button>
            <button onClick={stop} aria-label="Stop" className="tap-44 p-1.5 rounded-full hover:bg-white/10">
              <X className="w-4 h-4 text-white/80" />
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
