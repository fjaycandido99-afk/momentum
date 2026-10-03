'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname } from 'next/navigation'
import { ArrowRight, AudioLines, Pause, Play, X } from 'lucide-react'
import { VoiceInput } from '@/components/journal/VoiceInput'
import { navHref, resolveNav, type NavContext } from '@/lib/voice-guide/navigate'
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
 *
 * Phase 2 — the orb opens a small panel: Explain this, a mic ("say where to
 * go"), and this screen's suggestions. Where it goes comes from a fixed list
 * (lib/voice-guide/navigate) — never a guess, never an action. Arriving
 * with ?spot=… lights that part of the destination up.
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

/** Common places offered as chips, besides this screen's next step. */
const CHIPS: { label: string; text: string; href: string }[] = [
  { label: 'Today', text: 'today', href: '/' },
  { label: 'Your era', text: 'my era', href: '/era' },
  { label: 'Your laws', text: 'my laws', href: '/patterns' },
  { label: 'Psychology', text: 'psychology', href: '/psychology' },
]

export function VoxuGuide({
  screen,
  lines,
  next = null,
}: {
  screen: GuideScreen | 'profile' | 'proof'
  /** What "explain this" says; null when the screen has nothing to explain. */
  lines: GuideLine[] | null
  /** Where "show me" / "what should I press" goes from here. */
  next?: NavContext['next']
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [reply, setReply] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
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
    if (screen in FIRST_VISIT_ASK && lines && lines.length && !readSeen(screen as GuideScreen)) setOffer(true)
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

  // Arrived with ?spot=…: read in the effect (during render an in-app
  // navigation still shows the PREVIOUS page's URL) and kept in a ref, so an
  // effect that runs twice (React dev mode) still knows what to light after
  // the first run has tidied the URL.
  const arrivalSpot = useRef<string | null>(null)
  useEffect(() => {
    const url = new URL(window.location.href)
    const fromUrl = url.searchParams.get('spot')
    if (fromUrl) {
      arrivalSpot.current = fromUrl
      url.searchParams.delete('spot')
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
    }
    const spot = arrivalSpot.current
    if (!spot) return
    const on = window.setTimeout(() => spotlight(spot), 700)
    const off = window.setTimeout(() => spotlight(undefined), 3700)
    return () => { window.clearTimeout(on); window.clearTimeout(off) }
  }, [])

  /** Said or tapped: one place from the list, or what it can do instead. */
  const go = useCallback((text: string) => {
    const res = resolveNav(text, { next })
    trackFeature('voice_guide', 'use', res.kind === 'go' ? `nav:${res.href}` : 'nav:unknown')
    setReply(res.say)
    if (res.kind !== 'go') return
    haptic('light')
    window.setTimeout(() => {
      setOpen(false)
      setReply(null)
      // Already here: light it up rather than reload the page.
      if (res.href === pathname) {
        if (res.spot) { spotlight(res.spot); window.setTimeout(() => spotlight(undefined), 3000) }
        return
      }
      router.push(navHref(res))
    }, 650)
  }, [next, pathname, router])

  const start = useCallback(async () => {
    if (!lines?.length) return
    haptic('light')
    if (screen in FIRST_VISIT_ASK) markSeen(screen as GuideScreen)
    setOffer(false)
    setOpen(false)
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
  const chips = CHIPS.filter(c => c.href !== pathname).slice(0, 3)

  return (
    <>
      <div className="relative">
        <button
          onClick={() => { if (playing) stop(); else { setOffer(false); setReply(null); setOpen(o => !o) } }}
          aria-label={playing ? 'Stop Voxu' : 'Ask Voxu'}
          aria-expanded={open}
          className={`tap-44 w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${
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
            <p className="text-px-13 text-white leading-snug">{FIRST_VISIT_ASK[screen as GuideScreen]}</p>
            <div className="flex gap-2 mt-2.5">
              <button onClick={start} className="tap-44 px-3 py-1.5 rounded-full bg-white text-black text-px-12 font-medium">
                Walk me through
              </button>
              <button onClick={() => { markSeen(screen as GuideScreen); setOffer(false) }} className="tap-44 px-3 py-1.5 rounded-full border border-white/20 text-px-12 text-white/80">
                Not now
              </button>
            </div>
          </div>
        )}

        {open && !playing && (
          <>
            {/* Tap outside closes it. Not a dialog — nothing behind it freezes. */}
            <button aria-label="Close" className="fixed inset-0 z-[54] cursor-default" onClick={() => { setOpen(false); setReply(null) }} />
            <div role="group" aria-label="Voxu" className="absolute right-0 top-12 z-[55] w-72 rounded-2xl border border-white/[0.16] bg-[#0d1018] p-3 shadow-2xl">
              {ready && (
                <button onClick={start} className="tap-44 w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white text-black text-px-13 font-medium">
                  <Play className="w-4 h-4" /> Explain this page
                </button>
              )}

              <p className="text-px-11 uppercase tracking-[0.18em] text-white/60 mt-3">Take me somewhere</p>
              <div className="flex items-center gap-2 mt-1.5">
                <VoiceInput onTranscript={go} />
                <form
                  className="flex-1 min-w-0"
                  onSubmit={e => { e.preventDefault(); if (typed.trim()) { go(typed); setTyped('') } }}
                >
                  <input
                    value={typed}
                    onChange={e => setTyped(e.target.value)}
                    placeholder="Say or type a place"
                    aria-label="Where do you want to go?"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-px-14 text-white placeholder:text-white/40"
                  />
                </form>
              </div>

              {reply && <p className="text-px-13 text-white mt-2 leading-snug" aria-live="polite">{reply}</p>}

              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {next && (
                  <button onClick={() => go('show me')} className="tap-44 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-px-12 text-black bg-white/90">
                    Next step <ArrowRight className="w-3 h-3" />
                  </button>
                )}
                {chips.map(c => (
                  <button key={c.href} onClick={() => go(c.text)} className="tap-44 px-2.5 py-1.5 rounded-full border border-white/20 text-px-12 text-white/85">
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </>
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
