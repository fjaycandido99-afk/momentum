'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname } from 'next/navigation'
import { ArrowRight, AudioLines, MessageCircle, Pause, Play, Search, X } from 'lucide-react'
import { VoiceInput } from '@/components/journal/VoiceInput'
import { navHref, type NavContext } from '@/lib/voice-guide/navigate'
import { resolveIntent, type IntentContext } from '@/lib/voice-guide/intents'
import { acceptRescue } from '@/lib/pulse/rescue-state'
import type { RescuePlan } from '@/lib/pulse/rescue'
import { fetchVoxuAudio, type VoxuAudioResult } from '@/lib/voice/voxu-audio'
import { SpeakingRing } from './SpeakingRing'
import { FIRST_VISIT_ASK, type GuideLine, type GuideScreen } from '@/lib/voice-guide/scripts'
import { haptic } from '@/lib/haptics'
import { useSubscriptionOptional } from '@/contexts/SubscriptionContext'
import { spotlight, useArrivalSpot } from './spotlight'
import { TalkSheet } from './TalkSheet'
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


/** Common places offered as chips, besides this screen's next step. */
const CHIPS: { label: string; text: string; href: string }[] = [
  { label: 'Today', text: 'today', href: '/' },
  { label: 'Your era', text: 'my era', href: '/era' },
  { label: 'Your laws', text: 'my laws', href: '/patterns' },
  { label: 'Psychology', text: 'psychology', href: '/psychology' },
]

export function VoxuGuide({
  screen,
  lines: linesProp,
  next = null,
  experiment = null,
  opener = 'What\'s on your mind?',
  variant = 'header',
  resolveLines,
  onSearch,
}: {
  screen: GuideScreen | 'profile' | 'proof'
  /** What "explain this" says; null when the screen has nothing to explain. */
  lines: GuideLine[] | null
  /** Where "show me" / "what should I press" goes from here. */
  next?: NavContext['next']
  /** The experiment this screen is about — what "set this up for me" sets up. */
  experiment?: IntentContext['experiment']
  /** Voxu's first line in Talk it through (lib/voice-guide/scripts talkOpener). */
  opener?: string
  /**
   * 'home': it sits in Today's header, which animates with a transform —
   * anything absolutely placed inside would be positioned against the
   * header, so the panel is portalled and fixed below it instead.
   */
  variant?: 'header' | 'home'
  /** Build the script when tapped, from live data (Today reads Pulse then). */
  resolveLines?: () => GuideLine[] | null
  /** Search everything (Today's search lives in the orb now). */
  onSearch?: (query: string) => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [reply, setReply] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  /** A lighter day, waiting for their yes. */
  const [confirm, setConfirm] = useState<RescuePlan | null>(null)
  const [talking, setTalking] = useState(false)
  /** The script being played — fixed at the tap, even if the page re-renders. */
  const [script, setScript] = useState<GuideLine[] | null>(null)
  /** What they asked that wasn't a place — offered as a search. */
  const [unmatched, setUnmatched] = useState<string | null>(null)
  const [offer, setOffer] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [index, setIndex] = useState(0)
  const [quiet, setQuiet] = useState(false) // a line fell back to captions
  /** The day's spoken lines ran out (a 403 from chat-voice), not just a hiccup. */
  const [outOfVoice, setOutOfVoice] = useState(false)
  const sub = useSubscriptionOptional()
  const run = useRef(0)
  const audio = useRef<HTMLAudioElement | null>(null)
  const timer = useRef<number | null>(null)
  const resume = useRef<(() => void) | null>(null)
  const pausedRef = useRef(false)

  // First visit: glow and ask, once the screen has something to explain.
  useEffect(() => {
    if (screen in FIRST_VISIT_ASK && ((linesProp && linesProp.length) || resolveLines) && !readSeen(screen as GuideScreen)) setOffer(true)
  }, [screen, linesProp, resolveLines])

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

  useArrivalSpot()

  /** Said or tapped: one place from the list, or what it can do instead. */
  /** Today's plan from Pulse — only fetched when an action needs it. */
  const today = async () => {
    try {
      const r = await fetch('/api/pulse', { cache: 'no-store' })
      return r.ok ? (await r.json())?.pulse ?? null : null
    } catch { return null }
  }

  const go = useCallback(async (text: string) => {
    const res = resolveIntent(text, { next, experiment })
    trackFeature('voice_guide', 'use', res.kind === 'go' ? `nav:${res.href}` : res.kind)
    setConfirm(null)

    if (res.kind === 'lighter_day') {
      // Ask first, showing exactly what the rest of today would shrink to.
      setReply('Let me look at what’s left today…')
      const p = await today()
      if (p?.rescue?.steps?.length) { setReply(null); setConfirm(p.rescue) }
      else setReply('There’s nothing left to shrink today. The lighter plan is for when two or more things are still due. Your promise can be as small as you like.')
      return
    }
    if (res.kind === 'play_guide') {
      setReply('Finding today’s session…')
      const p = await today()
      const has = p?.today?.items?.some((i: { kind: string }) => i.kind === 'guide')
      if (!has) { setReply('There’s no guided session on today’s list. You’ll find them all on Today, under Guided.'); return }
      // Lit up on Today, ready to tap: a tap is what starts audio on an
      // iPhone, and starting it stays theirs.
      return go2({ say: 'Here’s today’s guided session. Tap it to start.', href: '/', spot: 'today-guide' })
    }

    setReply(res.say)
    setUnmatched(res.kind === 'unknown' && onSearch ? text.trim() : null)
    if (res.kind !== 'go') return
    go2(res)
  }, [next, experiment, pathname, router])

  const go2 = (res: { say: string; href: string; spot?: string }) => {
    setReply(res.say)
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
  }

  const takeLighter = () => {
    haptic('light')
    acceptRescue()
    trackFeature('voice_guide', 'use', 'lighter_day:yes')
    setConfirm(null)
    setOpen(false)
    setReply(null)
    router.push('/')
  }

  const start = useCallback(async () => {
    const lines = resolveLines?.() ?? linesProp
    if (!lines?.length) return
    setScript(lines)
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
    setOutOfVoice(false)

    // Fetch ahead: the next line is on its way while this one plays.
    const fetches: Promise<VoxuAudioResult>[] = []
    const get = (i: number) => (fetches[i] ??= fetchVoxuAudio(lines[i].text, 'explain'))
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
          if (res.reason === 'locked') setOutOfVoice(true)
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
  }, [linesProp, resolveLines, screen, stop])

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

  /** Home: where the orb is on screen, so the panel opens right under it —
   *  on an iPad the header sits in a centred column, not at the screen edge. */
  const orbRef = useRef<HTMLButtonElement | null>(null)
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null)
  useEffect(() => {
    if (variant !== 'home' || !(open || offer)) return
    const place = () => {
      const r = orbRef.current?.getBoundingClientRect()
      // Under the orb, but never off the left edge: on a phone the orb sits
      // ~120px in from the right, and the 288px panel would hang off-screen.
      const W = window.innerWidth
      if (r) setAnchor({ top: r.bottom + 8, right: Math.max(16, Math.min(W - r.right, W - 16 - 288)) })
    }
    place()
    // The header slides in after the launch screens, so the orb can still be
    // moving when the first-visit question appears. Follow it while anything
    // is showing (cheap: one rect read every half second, only while open).
    const follow = window.setInterval(place, 500)
    window.addEventListener('resize', place)
    return () => { window.clearInterval(follow); window.removeEventListener('resize', place) }
  }, [variant, open, offer])

  const ready = !!linesProp?.length || !!resolveLines
  const home = variant === 'home'
  /** Home's panel lives outside the transformed header. */
  const float = (node: React.ReactNode) => (home && typeof document !== 'undefined' ? createPortal(node, document.body) : node)
  const floatClass = home ? 'fixed right-4 z-[75]' : 'absolute right-0 top-12 z-[55]'
  const floatStyle = home && anchor ? { top: anchor.top, right: anchor.right } : home ? { top: 'calc(env(safe-area-inset-top, 0px) + 64px)' } : undefined
  const chips = CHIPS.filter(c => c.href !== pathname).slice(0, 3)

  return (
    <>
      <div className="relative">
        <SpeakingRing always size={52} />
        <button
          ref={orbRef}
          onClick={() => { if (playing) stop(); else { setOffer(false); setReply(null); setOpen(o => !o) } }}
          aria-label={playing ? 'Stop Voxu' : 'Ask Voxu'}
          aria-expanded={open}
          // The orb IS the guided dial (SpeakingRing behind): still when
          // quiet, moving with Voxu's voice. The button is the tap target.
          className="relative tap-44 w-10 h-10 rounded-full"
        />

        {offer && !playing && float(
          // Not a dialog: an inline question that leaves the page usable, so
          // nothing behind it is frozen.
          <div
            role="group"
            aria-label="Voxu"
            className={`${floatClass} w-64 rounded-2xl border border-white/[0.16] bg-[#0d1018] p-3 shadow-2xl`}
            style={floatStyle}
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

        {open && !playing && float(
          <>
            {/* Tap outside closes it. Not a dialog — nothing behind it freezes. */}
            <button aria-label="Close" className={`fixed inset-0 ${home ? 'z-[74]' : 'z-[54]'} cursor-default`} onClick={() => { setOpen(false); setReply(null); setUnmatched(null) }} />
            <div role="group" aria-label="Voxu" className={`${floatClass} w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/[0.16] bg-[#0d1018] p-3 shadow-2xl`} style={floatStyle}>
              {ready && (
                <button onClick={start} className="tap-44 w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white text-black text-px-13 font-medium">
                  <Play className="w-4 h-4" /> {screen === 'today' ? 'Explain Today' : 'Explain this page'}
                </button>
              )}
              <button
                onClick={() => { setOpen(false); setReply(null); setConfirm(null); setTalking(true) }}
                className={`tap-44 w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/20 text-px-13 text-white ${ready ? 'mt-2' : ''}`}
              >
                <MessageCircle className="w-4 h-4" /> Talk it through
              </button>

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
              {unmatched && onSearch && (
                <button
                  onClick={() => { const q = unmatched; setOpen(false); setReply(null); setUnmatched(null); onSearch(q) }}
                  className="tap-44 mt-2 w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/20 text-px-13 text-white"
                >
                  <Search className="w-4 h-4" /> Search for &ldquo;{unmatched}&rdquo;
                </button>
              )}

              {confirm && (
                <div className="mt-2.5 rounded-xl border border-white/[0.16] bg-white/[0.04] p-3">
                  <p className="text-px-14 text-white">Make the rest of today lighter?</p>
                  <p className="text-px-12 text-white/65 mt-0.5">Each thing still due shrinks to the minimum you set:</p>
                  <ul className="mt-1.5 space-y-0.5">
                    {confirm.steps.map(st => (
                      <li key={st.id} className="text-px-12 text-white/85">{st.title} <span className="text-white/55">— {st.ask}</span></li>
                    ))}
                  </ul>
                  {confirm.minutes !== null && <p className="text-px-11 text-white/55 mt-1">About {confirm.minutes} minutes in all.</p>}
                  <p className="text-px-11 text-white/55 mt-1">Just for today. Nothing is recorded until you do it.</p>
                  <div className="flex gap-2 mt-2.5">
                    <button onClick={takeLighter} className="tap-44 px-3 py-1.5 rounded-full bg-white text-black text-px-12 font-medium">Make today lighter</button>
                    <button onClick={() => { setConfirm(null); setReply(null) }} className="tap-44 px-3 py-1.5 rounded-full border border-white/20 text-px-12 text-white/80">Not now</button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {next && (
                  <button onClick={() => go('show me')} className="tap-44 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-px-12 text-black bg-white/90">
                    Next step <ArrowRight className="w-3 h-3" />
                  </button>
                )}
                {onSearch && (
                  <button onClick={() => { setOpen(false); setReply(null); onSearch('') }} className="tap-44 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-white/20 text-px-12 text-white/85">
                    <Search className="w-3 h-3" /> Search everything
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

      {talking && (
        <TalkSheet
          opener={opener}
          screen={screen}
          screenSummary={(resolveLines?.() ?? linesProp)?.map(l => l.text).join(' ') ?? `The ${screen} screen.`}
          // A command said mid-conversation goes back to the panel, which
          // shows where it's going or asks to confirm.
          onCommand={text => { setTalking(false); setOpen(true); void go(text) }}
          onClose={() => setTalking(false)}
        />
      )}

      {playing && script && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-x-0 z-[65] px-4 flex justify-center pointer-events-none"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 92px)' }}
        >
          <div className="pointer-events-auto w-full max-w-lg rounded-2xl border border-white/[0.16] bg-[#0b0d14]/95 backdrop-blur p-3 flex items-start gap-3 shadow-2xl">
            <span className="relative mt-0.5 w-8 h-8 shrink-0" aria-hidden>
              <SpeakingRing always size={42} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-px-14 text-white leading-snug" aria-live="polite">{script[index]?.text}</p>
              <p className="text-px-10 text-white/50 mt-1 tabular-nums">
                {index + 1} of {script.length}{quiet && !outOfVoice ? ' · voice is resting, here it is in words' : ''}{outOfVoice ? ' · spoken lines are used up for now' : ''}
              </p>
            </div>
            {outOfVoice && sub && !sub.isPremium && (
              <button onClick={() => { stop(); sub.openUpgradeModal('voice') }} className="tap-44 shrink-0 self-center px-2.5 py-1.5 rounded-full bg-white text-black text-px-11 font-medium">
                Hear Voxu with Premium
              </button>
            )}
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
