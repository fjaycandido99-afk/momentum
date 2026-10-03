'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, AudioLines, Loader2, Volume2, VolumeX } from 'lucide-react'
import { useMindsetOptional } from '@/contexts/MindsetContext'
import { MINDSET_CONFIGS, getCoachName } from '@/lib/mindset/configs'
import { ScrollLock } from '@/components/ui/ScrollLock'
import { VoiceInput } from '@/components/journal/VoiceInput'
import { CrisisBanner, type CrisisContent } from '@/components/journal/CrisisBanner'
import { fetchVoxuAudio } from '@/lib/voice/voxu-audio'
import { ERA_PRESETS_BY_KEY, eraName, DEFAULT_ERA_LENGTH_DAYS } from '@/lib/era/presets'
import { programFor } from '@/lib/era/programs'
import { GUIDED_TASTE, type FirstMoment } from '@/lib/onboarding/first-launch'
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

type Beat = 'hello' | 'ask' | 'thinking' | 'eras' | 'starting' | 'guide' | 'promise' | 'saving' | 'done'

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
  const [voiceOn, setVoiceOn] = useState(() => {
    try { return localStorage.getItem(VOICE_KEY) !== 'off' } catch { return true }
  })
  const audio = useRef<HTMLAudioElement | null>(null)
  const guideRun = useRef(0)

  const finish = useCallback(() => {
    audio.current?.pause()
    guideRun.current++
    try { localStorage.setItem(KEY, '1') } catch { /* ignore */ }
    setHidden(true)
  }, [])

  // Already has an era (a returning person on a new phone): nothing to show.
  useEffect(() => {
    if (!hidden && hasEra === true) finish()
  }, [hidden, hasEra, finish])

  /** Say a line in Voxu's voice (after their first tap). Resolves when it ends, or at once when quiet. */
  const say = useCallback(async (text: string): Promise<void> => {
    audio.current?.pause()
    if (!voiceOn) return
    const res = await fetchVoxuAudio(text)
    if (!res.ok) return
    audio.current = res.audio
    await new Promise<void>(done => {
      res.audio.onended = () => done()
      res.audio.onerror = () => done()
      res.audio.play().catch(() => done())
    })
  }, [voiceOn])

  if (hidden || hasEra !== false || !mindsetCtx?.mindset) return null

  const mindset = mindsetCtx.mindset
  const coach = getCoachName(mindset)
  const voiceName = MINDSET_CONFIGS[mindset]?.name ?? ''

  const toggleVoice = () => {
    const next = !voiceOn
    setVoiceOn(next)
    if (!next) audio.current?.pause()
    try { localStorage.setItem(VOICE_KEY, next ? 'on' : 'off') } catch { /* ignore */ }
  }

  const begin = () => {
    haptic('light')
    trackFeature('first_launch', 'open')
    setBeat('ask')
    void say('Before I show you anything, tell me one thing you want to change.')
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
      if (!res.ok || !data?.eras) { setError(data?.error ?? 'Couldn’t reach Voxu. Check your connection.'); setBeat('ask'); return }
      setMoment(data)
      if (data.crisis) setCrisis(data.crisis)
      setPromise(data.promise)
      setBeat('eras')
      trackFeature('first_launch', 'use', data.ai ? 'replied' : 'replied_fallback')
      await say(data.reply)
      void say(`For the next ${DEFAULT_ERA_LENGTH_DAYS} days, we can turn that into an Era.`)
    } catch {
      setError('Couldn’t reach Voxu. Check your connection.')
      setBeat('ask')
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
        // Their own sentence becomes their day-one words on the era page.
        body: JSON.stringify({ key, change: said }),
      })
      const data = await res.json().catch(() => null)
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
    void say('Based on what you told me, here’s your first promise.')
  }

  const keep = async (text: string) => {
    const t = text.trim()
    if (!t) return
    haptic('light')
    setBeat('saving')
    setError(null)
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
      void say('That’s Day 1.')
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
    <div role="dialog" aria-modal="true" aria-label="Welcome to Voxu" className="fixed inset-0 z-[90] bg-black text-white overflow-y-auto overflow-x-hidden">
      <ScrollLock />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-white/[0.05] blur-3xl pointer-events-none" aria-hidden />

      <div className="relative min-h-[100dvh] flex flex-col items-center justify-center px-6 py-16 max-w-md mx-auto">
        {beat !== 'hello' && (
          <button onClick={toggleVoice} aria-label={voiceOn ? 'Turn Voxu’s voice off' : 'Turn Voxu’s voice on'} aria-pressed={voiceOn}
            className="tap-44 absolute right-4 p-2 rounded-full hover:bg-white/10" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
            {voiceOn ? <Volume2 className="w-4 h-4 text-white/80" /> : <VolumeX className="w-4 h-4 text-white/50" />}
          </button>
        )}

        {/* The orb — present the whole way through; their words drift behind it. */}
        {beat !== 'eras' && beat !== 'promise' && beat !== 'done' && (
          <div className="relative flex items-center justify-center mb-8">
            {said && beat !== 'hello' && (
              <p className="absolute w-72 text-center text-px-15 text-white/[0.14] leading-snug pointer-events-none" style={SERIF} aria-hidden>{said}</p>
            )}
            <span className="voxu-orb-glow w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'radial-gradient(circle at 50% 40%, rgb(var(--era-accent, 255 255 255) / 0.32), rgb(10 12 20 / 0.95) 70%)', border: '1px solid rgb(var(--era-accent, 255 255 255) / 0.5)' }}>
              {beat === 'thinking' || beat === 'starting' || beat === 'saving'
                ? <Loader2 className="w-6 h-6 animate-spin text-white" />
                : <AudioLines className="w-6 h-6 text-white" />}
            </span>
          </div>
        )}

        {beat === 'hello' && (
          <div className="text-center animate-fade-in-up">
            <p className="text-px-11 uppercase tracking-[0.24em] text-white/55">Voxu</p>
            <h1 className="text-px-34 leading-tight mt-2" style={{ ...SERIF, fontWeight: 600 }}>I&rsquo;m {coach}.</h1>
            <p className="text-px-14 text-white/70 mt-2">Your {voiceName} voice. Let me show you how this works.</p>
            <button onClick={begin} className="tap-44 mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-px-14 font-medium press-scale">
              Begin <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {beat === 'ask' && (
          <div className="w-full animate-fade-in-up">
            <h2 className="text-px-26 leading-snug text-center" style={{ ...SERIF, fontWeight: 600 }}>
              Before I show you anything, tell me one thing you want to change.
            </h2>
            {error && <p className="text-px-13 text-white/80 text-center mt-3" role="alert">{error}</p>}
            <form className="mt-6 flex items-end gap-2" onSubmit={e => { e.preventDefault(); void send(said) }}>
              <VoiceInput onTranscript={t => { setSaid(t); void send(t) }} />
              <textarea
                value={said}
                onChange={e => setSaid(e.target.value)}
                rows={2}
                maxLength={300}
                placeholder="I want to stop…"
                aria-label="One thing you want to change"
                className="flex-1 min-w-0 bg-white/[0.05] border border-white/15 rounded-2xl p-3.5 text-px-16 text-white placeholder-white/40 resize-none focus:outline-none focus:border-white/30"
              />
            </form>
            <button onClick={() => void send(said)} disabled={!said.trim()} className="tap-44 mt-3 w-full py-3.5 rounded-2xl bg-white text-black text-px-14 font-medium disabled:opacity-40 press-scale">
              Tell Voxu
            </button>
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
          </div>
        )}

        {beat !== 'done' && (
          <button onClick={finish} className="tap-44 absolute text-px-12 text-white/40 hover:text-white/70" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
            I&rsquo;ll look around first
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
