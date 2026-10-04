'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { isNativeApp } from '@/lib/native'
import { createPortal } from 'react-dom'
import { ArrowRight, AudioLines, Clock, Headphones, Keyboard, Landmark, Loader2, MessageCircle, Mic, Volume2, VolumeX } from 'lucide-react'
import { useMindsetOptional } from '@/contexts/MindsetContext'
import { ScrollLock } from '@/components/ui/ScrollLock'
import { CrisisBanner, type CrisisContent } from '@/components/journal/CrisisBanner'
import { fetchVoxuAudio, installVoxuUnlock, sharedVoxuPlayer } from '@/lib/voice/voxu-audio'
import { APP_STORE_URL } from '@/components/marketing/JoinCta'
import { SpeakingRing } from '@/components/voice-guide/SpeakingRing'
import { InviteAsk } from '@/components/referral/InviteAsk'
import { ERA_PRESETS_BY_KEY, eraName, DEFAULT_ERA_LENGTH_DAYS } from '@/lib/era/presets'
import { programFor } from '@/lib/era/programs'
import { GUIDED_TASTE, OPENER_INTRO, OPENER_ERA_LINE, OPENER_PROMISE_LINE, OPENER_DAY_ONE, OPENER_SAVE_LINE, PENDING_OPENER_KEY, type FirstMoment, type PendingOpener } from '@/lib/onboarding/first-launch'
import { useListen } from './useListen'
import { trackFeature } from '@/lib/analytics/track'
import { haptic } from '@/lib/haptics'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * The first launch — Voxu shown, not explained. One continuous conversation,
 * no step counter, skippable at every beat:
 *
 *   1  "Tell me one thing you want to change."  (speak or type — Voxu replies
 *      to what THEY said)
 *   2  "For the next 30 days, we can turn that into an Era."  (three eras
 *      from the preset list; tapping one starts it, their sentence kept as
 *      their day-one words)
 *   3  A 30–45 second guided taste — the waveform, one line at a time
 *   4  "Here's your first promise."  Keep it / Make it easier / Choose my own
 *   5  "That's Day 1."  → Enter Voxu
 *
 * Only the four pillars — AI, era, guided, promise. Nothing else is shown.
 *
 * Voice: every line can be spoken (lib/voice/voxu-audio; the fixed lines are
 * cached once for everyone), never before their first tap, with a speaker
 * toggle; words are always on screen. Writes go through the normal era and
 * promise routes, from their own taps. The AI step always answers
 * (app/api/onboarding/first-moment falls back to pure suggestions).
 *
 * Replaces the old static "A moment to begin" overlay; same once-per-device
 * key, so nobody who saw that one sees this. Shown only to someone with no
 * era yet.
 */
const KEY = 'voxu_first_moment_done_v1'
const VOICE_KEY = 'voxu.talk.voice'
/** Said as the opener appears — the same words for everyone, so voiced once. */
const INTRO = OPENER_INTRO

function readPending(): PendingOpener | null {
  try { const v = localStorage.getItem(PENDING_OPENER_KEY); return v ? JSON.parse(v) as PendingOpener : null } catch { return null }
}
function writePending(p: PendingOpener | null) {
  try { if (p) localStorage.setItem(PENDING_OPENER_KEY, JSON.stringify(p)); else localStorage.removeItem(PENDING_OPENER_KEY) } catch { /* storage off: they'll start again after signing up */ }
}

const PREVIEW = [
  { icon: Landmark, title: 'Choose an Era', text: 'Thirty days. One promise a day.' },
  { icon: Headphones, title: 'A guided moment', text: 'Short sessions to centre you.' },
  { icon: MessageCircle, title: 'Guidance that adapts', text: 'A voice that learns how you work.' },
]

// 'save': a guest reached Day 1 — the account is what keeps it.
type Beat = 'hello' | 'thinking' | 'eras' | 'starting' | 'guide' | 'promise' | 'saving' | 'done' | 'save'

export function FirstLaunch({ hasEra, onEraChange }: {
  /** null while the era is loading; true means this person is past day one. */
  hasEra: boolean | null
  /** Tell Home the era changed, so it shows the new one behind us. */
  onEraChange: () => void
}) {
  const mindsetCtx = useMindsetOptional()
  const [hidden, setHidden] = useState(() => {
    if (typeof window === 'undefined') return true
    try { return localStorage.getItem(KEY) === '1' } catch { return true }
  })
  const [beat, setBeat] = useState<Beat>('hello')
  const [said, setSaid] = useState('')
  const [moment, setMoment] = useState<FirstMoment | null>(null)
  const [crisis, setCrisis] = useState<CrisisContent | null>(null)
  const [eraKey, setEraKey] = useState<string | null>(null)
  const [guideLine, setGuideLine] = useState(0)
  const [promise, setPromise] = useState('')
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** No account yet: the opener runs in full, and Day 1 is kept on the device until they sign up. */
  const inApp = isNativeApp()
  const [guest, setGuest] = useState(false)
  const replySig = useRef<string | null>(null)
  /** How they'll answer — chosen on the first screen. */
  /** Typing instead of talking — a small link, never a choice up front. */
  const [inputMode, setInputMode] = useState<'voice' | 'type' | null>(null)
  const listener = useListen()
  /** Set after the early return: the conversation turn, for the effect to start. */
  const converseRef = useRef<(() => void) | null>(null)
  /** Sound was blocked before a tap (Safari on the web): offer "Tap to hear". */
  const [needsTap, setNeedsTap] = useState(false)
  const introPlayed = useRef(false)
  const [voiceOn, setVoiceOn] = useState(() => {
    try { return localStorage.getItem(VOICE_KEY) !== 'off' } catch { return true }
  })
  const audio = useRef<HTMLAudioElement | null>(null)
  /** ONE element for every line — iPhone Safari blocks sound from any element a tap didn't start. */
  const getPlayer = sharedVoxuPlayer
  useEffect(() => { installVoxuUnlock() }, [])
  const guideRun = useRef(0)

  const finish = useCallback(() => {
    audio.current?.pause()
    guideRun.current++
    // A guest's Day 1 waiting to be saved: hide for now, but NOT done — after
    // they sign up the opener must come back to create it (resumePending).
    try { if (!readPending()) localStorage.setItem(KEY, '1') } catch { /* ignore */ }
    setHidden(true)
  }, [])

  // Already has an era (a returning person on a new phone): nothing to show.
  useEffect(() => {
    // Has an era already: a guest's saved Day 1 (if any) isn't needed.
    if (!hidden && hasEra === true) { writePending(null); finish() }
  }, [hidden, hasEra, finish])

  /** Say a line in Voxu's voice (after their first tap). Resolves when it ends, or at once when quiet. */
  const say = useCallback(async (text: string, sig?: string | null): Promise<'played' | 'blocked' | 'quiet'> => {
    audio.current?.pause()
    if (!voiceOn) return 'quiet'
    // 'onboarding': free for everyone, account or not — the opener is the taste.
    const res = await fetchVoxuAudio(text, 'onboarding', sig)
    if (!res.ok) return 'quiet'
    const p = getPlayer()
    audio.current = p.el
    return p.play(res.audio.src)
  }, [voiceOn])

  /**
   * A guest's Day 1, kept on the device: if they've signed up since, create
   * the era and the promise now and land on "That's Day 1". Still a guest,
   * show the save step again. Never throws; a failure falls back to the start.
   */
  const resumePending = useCallback(async (p: PendingOpener) => {
    setEraKey(p.key)
    setSaid(p.change)
    if (p.promise) setPromise(p.promise)
    setBeat('saving')
    try {
      const era = await fetch('/api/era', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: p.key, change: p.change }),
      })
      if (era.status === 401) { setGuest(true); setBeat(p.promise ? 'save' : 'hello'); return }
      if (!era.ok) { writePending(null); setBeat('hello'); return }
      if (p.promise) {
        await fetch('/api/era/promise', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: p.promise, source: 'typed' }),
        }).catch(() => null)
      }
      writePending(null)
      onEraChange()
      trackFeature('first_launch', 'complete', `${p.key}:after_signup`)
      setBeat('done')
      void say(OPENER_DAY_ONE)
    } catch {
      setBeat('hello')
    }
  }, [onEraChange, say])

  // Voxu speaks as the opener appears. In the app the web view allows sound
  // without a tap (Capacitor: mediaTypesRequiringUserActionForPlayback = []);
  // a browser blocks it, and the orb then offers "Tap to hear Voxu".
  const showing = !hidden && hasEra === false && !!mindsetCtx?.mindset
  useEffect(() => {
    if (!showing || introPlayed.current) return
    introPlayed.current = true
    // A guest who reached Day 1 and came back: signed up now? Keep it for
    // them. Still a guest? Back to the save step, nothing lost.
    const pending = readPending()
    if (pending) { void resumePending(pending); return }
    trackFeature('first_launch', 'open')
    // Then it listens, by itself. Where sound was blocked (a browser before
    // any tap), one tap on the orb does both.
    void say(INTRO).then(r => {
      if (r === 'blocked') setNeedsTap(true)
      else converseRef.current?.()
    })
  }, [showing, say])

  if (hidden || hasEra !== false || !mindsetCtx?.mindset) return null


  const toggleVoice = () => {
    const next = !voiceOn
    setVoiceOn(next)
    if (!next) audio.current?.pause()
    try { localStorage.setItem(VOICE_KEY, next ? 'on' : 'off') } catch { /* ignore */ }
  }

  /** One turn: listen for their answer, then send it. */
  const converse = async () => {
    if (inputMode === 'type') return
    const text = await listener.listen()
    if (text) { setSaid(text); void send(text) }
    else if (!listener.error) listener.setError('I didn’t catch that. Tap the orb and say it again, or type it.')
  }
  converseRef.current = () => { void converse() }

  /** The orb: tap to start (sound blocked), to stop listening, or to try again. */
  const tapOrb = () => {
    haptic('light')
    if (listener.phase === 'listening') { listener.stop(); return }
    if (listener.phase === 'transcribing') return
    setInputMode(null)
    if (needsTap) {
      setNeedsTap(false)
      void say(INTRO).then(() => converseRef.current?.())
      return
    }
    void converse()
  }

  const send = async (raw: string) => {
    const text = raw.trim()
    if (!text) return
    setSaid(text)
    setBeat('thinking')
    setError(null)
    try {
      const res = await fetch('/api/onboarding/first-moment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.eras) { setError(data?.error ?? 'Couldn’t reach Voxu. Check your connection.'); setBeat('hello'); setInputMode('type'); return }
      setMoment(data)
      if (data.crisis) setCrisis(data.crisis)
      setPromise(data.promise)
      replySig.current = typeof data.replySig === 'string' ? data.replySig : null
      setBeat('eras')
      trackFeature('first_launch', 'use', data.ai ? 'replied' : 'replied_fallback')
      await say(data.reply, replySig.current)
      void say(OPENER_ERA_LINE)
    } catch {
      setError('Couldn’t reach Voxu. Check your connection.')
      setBeat('hello')
      setInputMode('type')
    }
  }

  const chooseEra = async (key: string) => {
    haptic('light')
    setEraKey(key)
    setBeat('starting')
    setError(null)
    try {
      const res = await fetch('/api/era', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Their own sentence becomes their day-one words on the era page;
        // `ref` credits a friend's "Join this era" link that opened the app.
        body: JSON.stringify({ key, change: said, ref: (() => { try { return localStorage.getItem('voxu-era-ref') } catch { return null } })() }),
      })
      const data = await res.json().catch(() => null)
      if (res.status === 401) {
        // No account yet: the full experience anyway. Their choice is kept on
        // the device and saved the moment they sign up.
        setGuest(true)
        writePending({ key, change: said })
        trackFeature('first_launch', 'use', `era:${key}`)
        void runGuide()
        return
      }
      if (!res.ok) { setError(data?.error ?? 'Couldn’t start it.'); setBeat('eras'); return }
      onEraChange()
      trackFeature('first_launch', 'use', `era:${key}`)
      void runGuide()
    } catch {
      setError('Couldn’t reach Voxu. Check your connection.')
      setBeat('eras')
    }
  }

  const runGuide = async () => {
    const id = ++guideRun.current
    setBeat('guide')
    for (let i = 0; i < GUIDED_TASTE.length; i++) {
      if (guideRun.current !== id) return
      setGuideLine(i)
      const started = Date.now()
      await say(GUIDED_TASTE[i].text)
      // Quiet (or voice off): give the words time to be read.
      const spoken = Date.now() - started
      const reading = Math.max(0, GUIDED_TASTE[i].text.split(' ').length * 380 - spoken)
      await new Promise(r => setTimeout(r, reading + GUIDED_TASTE[i].pause))
    }
    if (guideRun.current === id) toPromise()
  }

  const toPromise = () => {
    guideRun.current++
    audio.current?.pause()
    setBeat('promise')
    void say(OPENER_PROMISE_LINE)
  }

  const keep = async (text: string) => {
    const t = text.trim()
    if (!t) return
    haptic('light')
    setError(null)
    if (guest) {
      const pending = readPending()
      writePending({ key: pending?.key ?? eraKey ?? '', change: pending?.change ?? said, promise: t })
      trackFeature('first_launch', 'use', 'guest_day1')
      setBeat('save')
      void say(OPENER_SAVE_LINE)
      return
    }
    setBeat('saving')
    try {
      const res = await fetch('/api/era/promise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t, source: 'typed' }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setError(data?.error ?? 'Couldn’t save your promise.'); setBeat('promise'); return }
      onEraChange()
      trackFeature('first_launch', 'complete', eraKey ?? undefined)
      setBeat('done')
      void say(OPENER_DAY_ONE)
    } catch {
      setError('Couldn’t reach Voxu. Check your connection.')
      setBeat('promise')
    }
  }

  const preset = eraKey ? ERA_PRESETS_BY_KEY.get(eraKey) : null

  // Portalled to <body>: inside Home its z-index only competed within Home,
  // so the bottom nav and the Today orb's own question showed through it.
  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      role="dialog" aria-modal="true" aria-label="Welcome to Voxu"
      className="fixed inset-0 z-[90] bg-black text-white overflow-y-auto overflow-x-hidden"
      // The first touch anywhere unlocks Voxu's voice for every line after it.
      onPointerDownCapture={() => getPlayer().unlock()}
    >
      <ScrollLock />
      {/* Night over still water, as in the mockup — tall on a phone, wide on
          an iPad or computer. */}
      <picture aria-hidden>
        <source media="(min-aspect-ratio: 1/1)" srcSet="/scenes/home/night-wide.jpg" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/scenes/home/night-tall.jpg" alt="" className={`fixed inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-700 ${beat === 'hello' ? 'opacity-50' : 'opacity-20'}`} />
      </picture>
      <div className="fixed inset-0 bg-gradient-to-b from-black via-black/60 to-black/80 pointer-events-none" aria-hidden />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-white/[0.05] blur-3xl pointer-events-none" aria-hidden />

      <div className="relative min-h-[100dvh] flex flex-col items-center justify-center px-6 py-16 max-w-md mx-auto">
        {beat !== 'hello' && (
          <button onClick={toggleVoice} aria-label={voiceOn ? 'Turn Voxu’s voice off' : 'Turn Voxu’s voice on'} aria-pressed={voiceOn}
            className="tap-44 absolute right-4 p-2 rounded-full hover:bg-white/10" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
            {voiceOn ? <Volume2 className="w-4 h-4 text-white/80" /> : <VolumeX className="w-4 h-4 text-white/50" />}
          </button>
        )}

        {/* The orb — present the whole way through; their words drift behind it. */}
        {beat !== 'hello' && beat !== 'eras' && beat !== 'promise' && beat !== 'done' && (
          <div className="relative flex items-center justify-center mb-8">
            {said && (
              <p className="absolute w-72 text-center text-px-15 text-white/[0.14] leading-snug pointer-events-none" style={SERIF} aria-hidden>{said}</p>
            )}
            {/* The orb IS the guided dial: still when Voxu is quiet, moving with its voice. */}
            <SpeakingRing always size={136} />
            <span className="relative w-20 h-20 rounded-full flex items-center justify-center">
              {(beat === 'thinking' || beat === 'starting' || beat === 'saving') && <Loader2 className="w-6 h-6 animate-spin text-white/80" />}
            </span>
          </div>
        )}

        {beat === 'hello' && (
          <div className="w-full text-center animate-fade-in-up">
            <p className="text-px-11 uppercase tracking-[0.34em] text-white/55">Voxu</p>
            <div className="relative mx-auto mt-11 w-24 h-24">
            <SpeakingRing always size={164} />
            <button
              onClick={tapOrb}
              aria-label={needsTap ? 'Tap to talk with Voxu' : listener.phase === 'listening' ? 'Stop — I’m done' : 'Talk to Voxu'}
              className="keep-motion relative w-24 h-24 rounded-full flex items-center justify-center transition-transform duration-100"
              style={{
                // Breathes with their voice while listening.
                transform: `scale(${1 + listener.level * 0.18})`,
              }}
            >
              {listener.phase === 'transcribing'
                ? <Loader2 className="w-8 h-8 animate-spin text-white/80" aria-hidden />
                : listener.phase === 'listening'
                  ? <Mic className="w-7 h-7 text-white/90" aria-hidden />
                  : null}
            </button>
            </div>
            <p className="text-px-12 text-white/70 mt-9 min-h-[1.25rem]" aria-live="polite">
              {needsTap ? 'Tap to talk with Voxu'
                : listener.phase === 'listening' ? 'Listening… tap when you’re done'
                : listener.phase === 'transcribing' ? 'One moment…'
                : ''}
            </p>

            <h1 className="text-px-38 leading-tight mt-4" style={{ ...SERIF, fontWeight: 600 }}>Let&rsquo;s begin with one thing.</h1>

            {/* What Voxu asked, as something it said. */}
            <div className="mt-5 flex items-start justify-center gap-2.5">
              <span className="relative w-9 h-9 shrink-0" aria-hidden>
                <SpeakingRing always size={46} />
              </span>
              <p className="px-4 py-2.5 rounded-2xl rounded-tl-md bg-white/[0.08] border border-white/[0.12] text-px-14 text-white text-left">
                Hey, I&rsquo;m Voxu. Before I show you anything, what&rsquo;s one thing you want to change right now?
              </p>
            </div>

            {/* Their words, live, as they say them. */}
            {listener.interim && (
              <p className="mt-4 text-px-20 leading-snug text-white" style={SERIF}>&ldquo;{listener.interim}&rdquo;</p>
            )}

            {(listener.error || error) && <p className="text-px-13 text-white/85 mt-3" role="alert">{listener.error ?? error}</p>}

            {inputMode === 'type' ? (
              <form className="mt-6 text-left" onSubmit={e => { e.preventDefault(); void send(said) }}>
                <textarea
                  value={said}
                  onChange={e => setSaid(e.target.value)}
                  rows={2}
                  maxLength={300}
                  autoFocus
                  placeholder="I want to stop…"
                  aria-label="One thing you want to change"
                  className="w-full bg-white/[0.05] border border-white/15 rounded-2xl p-3.5 text-px-16 text-white placeholder-white/40 resize-none focus:outline-none focus:border-white/30"
                />
                <button type="submit" disabled={!said.trim()} className="tap-44 mt-3 w-full py-3.5 rounded-2xl bg-white text-black text-px-14 font-medium disabled:opacity-40 press-scale">
                  Tell Voxu
                </button>
              </form>
            ) : (
              <button
                onClick={() => { listener.stop(); listener.setError(null); setInputMode('type') }}
                className="tap-44 mt-5 inline-flex items-center gap-1.5 text-px-13 text-white/60 underline underline-offset-4"
              >
                <Keyboard className="w-4 h-4" aria-hidden /> Type instead
              </button>
            )}

            <p className="mt-4 flex items-center justify-center gap-1.5 text-px-12 text-white/50"><Clock className="w-3.5 h-3.5" aria-hidden /> Takes less than 2 minutes.</p>

            {/* What's ahead — a preview, not a step counter. */}
            <ul className="mt-8 grid grid-cols-3 gap-2 text-left">
              {PREVIEW.map(p => {
                const Icon = p.icon
                return (
                  <li key={p.title} className="rounded-2xl border border-white/[0.12] bg-white/[0.04] p-3">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center border border-white/20 bg-black/40" aria-hidden>
                      <Icon className="w-4 h-4 text-white/85" />
                    </span>
                    <p className="text-px-12 text-white mt-2 leading-tight" style={{ ...SERIF, fontWeight: 600 }}>{p.title}</p>
                    <p className="hidden min-[400px]:block text-px-10 text-white/55 mt-1 leading-snug">{p.text}</p>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {beat === 'thinking' && <p className="text-px-14 text-white/60">Listening…</p>}

        {beat === 'eras' && moment && (
          <div className="w-full animate-fade-in-up">
            <p className="text-px-17 text-white/90 leading-snug text-center" style={SERIF}>{moment.reply}</p>
            {crisis && <div className="mt-4"><CrisisBanner content={crisis} /></div>}
            <h2 className="text-px-24 leading-snug text-center mt-6" style={{ ...SERIF, fontWeight: 600 }}>
              For the next {DEFAULT_ERA_LENGTH_DAYS} days, we can turn that into an Era.
            </h2>
            {error && <p className="text-px-13 text-white/80 text-center mt-3" role="alert">{error}</p>}
            <ul className="mt-5 space-y-2.5">
              {moment.eras.map(k => {
                const p = ERA_PRESETS_BY_KEY.get(k)
                if (!p) return null
                const img = programFor(k).image
                return (
                  <li key={k}>
                    <button onClick={() => void chooseEra(k)} className="relative w-full overflow-hidden rounded-2xl border border-white/[0.14] bg-[#0b0d14] p-4 text-left press-scale">
                      {img && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt="" aria-hidden className="absolute inset-y-0 right-0 w-1/2 h-full object-cover opacity-60"
                          style={{ WebkitMaskImage: 'linear-gradient(to left, black 40%, transparent)', maskImage: 'linear-gradient(to left, black 40%, transparent)' }} />
                      )}
                      <span className="relative block text-px-22 uppercase leading-none" style={{ ...SERIF, fontWeight: 600 }}>{p.title}</span>
                      <span className="relative block text-px-13 text-white/75 mt-1.5">{p.tagline}</span>
                      <span className="relative block text-px-11 text-white/50 mt-2">{DEFAULT_ERA_LENGTH_DAYS} days · one promise a day</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {beat === 'starting' && <p className="text-px-14 text-white/60">Starting your {preset ? eraName(preset.title) : 'era'}…</p>}

        {beat === 'guide' && (
          <div className="w-full text-center">
            <p key={guideLine} className="text-px-22 leading-snug animate-fade-in" style={{ ...SERIF, fontWeight: 500 }} aria-live="polite">
              {GUIDED_TASTE[guideLine]?.text}
            </p>
            <button onClick={toPromise} className="tap-44 mt-10 text-px-12 text-white/45 underline underline-offset-4">Skip this</button>
          </div>
        )}

        {(beat === 'promise' || beat === 'saving') && (
          <div className="w-full animate-fade-in-up">
            <p className="text-px-15 text-white/70 text-center">Based on what you told me, here&rsquo;s your first promise.</p>
            {editing ? (
              <textarea
                value={promise}
                onChange={e => setPromise(e.target.value)}
                rows={2}
                maxLength={200}
                autoFocus
                aria-label="Your first promise"
                className="mt-4 w-full bg-white/[0.05] border border-white/20 rounded-2xl p-4 text-px-18 text-white resize-none focus:outline-none"
                style={SERIF}
              />
            ) : (
              <div className="mt-4 rounded-2xl border border-white/[0.16] bg-[#0b0d14] p-5">
                <p className="text-px-11 uppercase tracking-[0.2em] text-white/55">Day 1 · {preset ? preset.title : 'Your era'}</p>
                <p className="text-px-22 leading-snug mt-2" style={{ ...SERIF, fontWeight: 600 }}>{promise}</p>
              </div>
            )}
            {error && <p className="text-px-13 text-white/80 text-center mt-3" role="alert">{error}</p>}
            <button onClick={() => void keep(promise)} disabled={beat === 'saving' || !promise.trim()} className="tap-44 mt-4 w-full py-3.5 rounded-2xl bg-white text-black text-px-14 font-medium disabled:opacity-50 press-scale">
              {beat === 'saving' ? 'Saving…' : editing ? 'Make this my promise' : 'Keep it'}
            </button>
            {!editing && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => moment && setPromise(moment.easier)} className="tap-44 flex-1 py-3 rounded-2xl border border-white/20 text-px-13 text-white/90">Make it easier</button>
                <button onClick={() => setEditing(true)} className="tap-44 flex-1 py-3 rounded-2xl border border-white/20 text-px-13 text-white/90">Choose my own</button>
              </div>
            )}
          </div>
        )}

        {beat === 'done' && (
          <div className="text-center animate-fade-in-up">
            <p className="text-px-11 uppercase tracking-[0.24em] text-white/55">{preset ? preset.title : 'Your era'} begins now</p>
            <h2 className="text-px-48 leading-none mt-3" style={{ ...SERIF, fontWeight: 600 }}>That&rsquo;s Day 1.</h2>
            <p className="text-px-15 text-white/70 mt-3">Day 1 of {DEFAULT_ERA_LENGTH_DAYS}. Tonight, tell me if you kept it.</p>
            <button onClick={finish} className="tap-44 mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-px-14 font-medium press-scale">
              Enter Voxu <ArrowRight className="w-4 h-4" />
            </button>
            {/* Their era exists now, so a friend's link can be credited to it. */}
            <div className="mt-6"><InviteAsk /></div>
          </div>
        )}

        {beat === 'save' && (
          <div className="text-center animate-fade-in-up max-w-sm">
            <p className="text-px-11 uppercase tracking-[0.24em] text-white/55">{preset ? preset.title : 'Your era'} · Day 1</p>
            <h2 className="text-px-38 leading-tight mt-3" style={{ ...SERIF, fontWeight: 600 }}>Keep your Day 1.</h2>
            {promise && <p className="text-px-15 text-white/80 mt-3 leading-snug" style={SERIF}>&ldquo;{promise}&rdquo;</p>}
            <p className="text-px-13 text-white/60 mt-3">A free account keeps your era, your promise and everything after it.</p>
            <a href="/signup" className="tap-44 mt-7 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-px-14 font-medium press-scale">
              Create my free account <ArrowRight className="w-4 h-4" />
            </a>
            <p className="mt-3 text-px-12 text-white/55">Already have one? <a href="/login" className="underline underline-offset-4">Sign in</a></p>
            {/* In a browser: the app is the real home for this. */}
            {!inApp && (
              <a href={APP_STORE_URL} className="tap-44 mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/25 text-px-13 text-white/90">
                Get Voxu on the App Store
              </a>
            )}
            {/* No account needed to look around — Day 1 stays saved on this
                device and is created the moment they sign up. */}
            <div className="mt-4">
              <button onClick={finish} className="tap-44 text-px-13 text-white/60 underline underline-offset-4">Continue as guest</button>
            </div>
          </div>
        )}

        {beat !== 'done' && beat !== 'save' && (
          <button onClick={finish} className="tap-44 absolute text-px-12 text-white/40 hover:text-white/70" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
            I&rsquo;ll look around first
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
