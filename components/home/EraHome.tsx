'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlarmClock, ArrowUp, BarChart3, BookOpen, Check, ChevronRight, Flame, Loader2, Lock, Moon, Play, Share2, Target, X,
  type LucideIcon,
} from 'lucide-react'
import { VoiceInput } from '@/components/journal/VoiceInput'
import { CrisisBanner, type CrisisContent } from '@/components/journal/CrisisBanner'
import { SOUNDSCAPE_ITEMS } from '@/components/player/SoundscapePlayer'
import { VOICE_GUIDES } from './home-types'
import { ERA_LIMITS, eraName } from '@/lib/era/presets'
import { BLOCKERS, CONFIDENCE_LABELS, HELPERS, reasonLabel } from '@/lib/era/reasons'
import { alignmentLine } from '@/lib/era/alignment'
import { TRIAL_DAYS } from '@/lib/subscription-constants'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { SpeakReplyButton } from '@/components/journal/SpeakReplyButton'
import { useAchievementOptional } from '@/contexts/AchievementContext'
import { ShareEraSheet } from './ShareEraSheet'
import { WakeCallSheet, type WakeCallSettings } from './WakeCallSheet'
import { CircleSection } from './CircleSection'
import { clockLabel } from '@/lib/era/wake'
import { ERA_COMPLETE_IMAGE, ERA_START_IMAGE } from '@/lib/era/programs'
import type { EraToday } from '@/hooks/useEra'

/**
 * The top of home, laid out from Francis's mockup (2026-09-18):
 *
 *   greeting + quote → era hero → today's audio → promise / mission →
 *   promises kept + streak → for your era
 *
 * Everything below it (the shelves) is unchanged. The mockup's "people in
 * this era", Trending and Share pieces are deliberately absent: the counts
 * would be invented at today's user numbers, and share is its own step.
 *
 * Typing stays first-class and this block is not in the auto-advancing
 * carousel — both for the reasons in the Era commit (b859ee5).
 */

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/** Plays the era's linked content through home's own handlers (premium checks included). */
export interface EraContentHandlers {
  onPlaySoundscape: (id: string) => void
  onPlayGuide: (id: string) => void
  isGuideLocked: (id: string) => boolean
}

export interface TodaysAudio {
  title: string
  subtitle: string
  /** Shown for Daily Guide sessions; null for a voice guide (length varies). */
  durationSec: number | null
  /** Cover art — the session's own (public/sessions) or the era's; null for the bars. */
  image?: string | null
  /** Morning, Midday, Wind Down, Bedtime — done or not. */
  segmentsDone: boolean[]
  onOpen: () => void
}

export function EraHome({
  era,
  onChange,
  content,
  audio,
  quote,
}: {
  era: EraToday | null
  onChange: (era: EraToday | null) => void
  content: EraContentHandlers
  audio: TodaysAudio
  quote: { text: string; author: string } | null
}) {
  return (
    <div className="px-6 mt-3 space-y-3">
      <Greeting quote={quote} />
      {era ? <ActiveEra era={era} onChange={onChange} content={content} audio={audio} /> : (
        <>
          <StartHero />
          <AudioCard audio={audio} />
        </>
      )}
    </div>
  )
}

// ─── Greeting ────────────────────────────────────────────────────────────────

function greetingFor(hour: number): { label: string; line: string } {
  if (hour >= 5 && hour < 12) return { label: 'Good morning', line: 'A better you sounds good today.' }
  if (hour >= 12 && hour < 17) return { label: 'Good afternoon', line: 'Keep the promise moving.' }
  if (hour >= 17 && hour < 22) return { label: 'Good evening', line: 'Close the day on purpose.' }
  return { label: 'Late night', line: 'Rest is part of the work.' }
}

function Greeting({ quote }: { quote: { text: string; author: string } | null }) {
  // Hour is read after mount so server and client render the same markup.
  const [g, setG] = useState<{ label: string; line: string } | null>(null)
  useEffect(() => { setG(greetingFor(new Date().getHours())) }, [])
  if (!g) return <div className="h-[68px]" aria-hidden />

  // Only short quotes fit beside the greeting on a phone; a long one would
  // squeeze the headline into a column. The full quote lives in Wisdom below.
  const showQuote = quote && quote.text.length <= 70

  return (
    <div className="flex items-start justify-between gap-4 pt-1">
      <div className="min-w-0">
        <p className="text-[10px] tracking-[0.3em] uppercase text-white/50">{g.label}</p>
        <p className="text-[26px] leading-[1.1] text-white mt-1" style={SERIF}>{g.line}</p>
      </div>
      {showQuote && (
        <p className="max-w-[38%] text-[12px] leading-snug italic text-white/60 text-right pt-1" style={SERIF}>
          &ldquo;{quote!.text}&rdquo;
        </p>
      )}
    </div>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function heroShell(children: React.ReactNode, image?: string | null) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.14] p-5 bg-[radial-gradient(120%_90%_at_100%_0%,rgba(255,255,255,0.10),rgba(255,255,255,0.02)_55%,rgba(0,0,0,0)_100%)]">
      {/* Era art sits on the right and fades into the card, so the title on
          the left always reads against black. Grayscale keeps any image
          inside the app's monochrome look. */}
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          aria-hidden
          className="absolute inset-y-0 right-0 h-full w-[62%] object-cover object-right grayscale opacity-80 pointer-events-none"
          style={{
            WebkitMaskImage: 'linear-gradient(to left, black 45%, transparent)',
            maskImage: 'linear-gradient(to left, black 45%, transparent)',
          }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  )
}

function StartHero() {
  // A guest who filled in /era and was sent to sign up lands here afterwards
  // (signup always returns home). Their answers are waiting on /era.
  const [hasDraft, setHasDraft] = useState(false)
  useEffect(() => {
    try { setHasDraft(!!localStorage.getItem('voxu-era-draft')) } catch { /* storage blocked */ }
  }, [])

  return (
    <Link href="/era" className="block group press-scale">
      {heroShell(
        <>
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/50">30 days</p>
          <h2 className="text-[40px] leading-[0.95] text-white mt-2 uppercase" style={{ ...SERIF, fontWeight: 600 }}>
            Who are you<br />becoming?
          </h2>
          <p className="text-sm text-white/70 mt-3">Pick an era. Make one promise a day. Your coach keeps count.</p>
          <div className="flex items-center justify-between mt-5">
            <span className="text-sm text-white font-medium">{hasDraft ? 'Finish starting your era' : 'Start your era'}</span>
            <ChevronRight className="w-5 h-5 text-white/90 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </>,
        ERA_START_IMAGE,
      )}
    </Link>
  )
}

function EraHero({ era, onShare }: { era: EraToday; onShare: () => void }) {
  const pct = Math.round((era.day / era.lengthDays) * 100)
  const byDay = new Map(era.days.map(d => [d.day, d.kept]))
  return (
    <div className="relative">
    <Link href="/era" className="block group" aria-label={`${era.title}, day ${era.day} of ${era.lengthDays}. Open your era.`}>
      {heroShell(
        <>
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/50">Current era</p>
          <h2
            className="text-[40px] leading-[0.95] text-white mt-2 uppercase break-words"
            style={{ ...SERIF, fontWeight: 600 }}
          >
            {era.title}
          </h2>
          <p className="text-[15px] text-white/75 mt-2 leading-snug" style={SERIF}>
            {era.step === 'complete' ? `${era.lengthDays} days. You finished it.` : era.stage.line}
          </p>

          <div className="flex items-end justify-between gap-3 mt-5">
            <p className="text-2xl text-white" style={{ ...SERIF, fontWeight: 500 }}>
              Day {era.day}<span className="text-white/40"> / {era.lengthDays}</span>
            </p>
            {era.stats.promiseStreak > 1 && (
              <span className="flex items-center gap-1 text-xs text-white/70 pb-1">
                <Flame className="w-3.5 h-3.5" /> {era.stats.promiseStreak} day streak
              </span>
            )}
          </div>
          {/* One segment per day — a hairline percentage bar was easy to miss
              and said nothing about HOW the days went. Kept is solid white,
              not kept is dim, a day without a promise is faint, today glows
              until it's answered, and the days ahead are empty. */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1 flex gap-[3px]" role="img" aria-label={`Day ${era.day} of ${era.lengthDays}, ${era.stats.kept} promises kept`}>
              {Array.from({ length: era.lengthDays }, (_, i) => {
                const n = i + 1
                const kept = byDay.get(n)
                const isToday = n === era.day && era.step !== 'complete'
                const cls =
                  n > era.day ? 'bg-white/[0.08]'
                    : kept === true ? 'bg-white'
                    : kept === false ? 'bg-white/35'
                    : kept === null ? 'bg-white/60'
                    : isToday ? 'bg-white/25 animate-pulse motion-reduce:animate-none'
                    : 'bg-white/15'
                return <span key={n} className={`flex-1 h-2.5 rounded-[2px] ${cls}`} />
              })}
            </div>
            <span className="text-[11px] text-white/60 tabular-nums">{pct}%</span>
          </div>
        </>,
        // A finished era gets the summit, whichever era it was.
        era.step === 'complete' ? ERA_COMPLETE_IMAGE : era.image,
      )}
    </Link>
    {/* Share — a sibling of the link, not inside it, so tapping it never
        also opens the era page. */}
    <button
      onClick={onShare}
      aria-label="Share your era"
      className="absolute top-3 right-3 z-10 p-2.5 rounded-full bg-black/45 backdrop-blur-sm border border-white/15 hover:bg-black/65 active:scale-95 transition-all"
    >
      <Share2 className="w-4 h-4 text-white" />
    </button>
    </div>
  )
}

// ─── Today's audio ───────────────────────────────────────────────────────────

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function AudioCard({ audio }: { audio: TodaysAudio }) {
  const done = audio.segmentsDone.filter(Boolean).length
  return (
    <button onClick={audio.onOpen} className="w-full text-left card-surface-lg p-4 press-scale flex items-center gap-4">
      <div className="relative w-14 h-14 shrink-0 rounded-xl overflow-hidden border border-white/[0.12] bg-[linear-gradient(160deg,rgba(255,255,255,0.18),rgba(255,255,255,0.02))] flex items-center justify-center">
        {audio.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={audio.image} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover grayscale" />
        ) : (
          <div className="flex items-end gap-[3px] h-5" aria-hidden>
            {[0.5, 1, 0.7, 0.9, 0.4].map((h, i) => (
              <span key={i} className="w-[3px] rounded-full bg-white/70" style={{ height: `${h * 100}%` }} />
            ))}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] tracking-[0.24em] uppercase text-white/50">Today&rsquo;s audio</p>
        <p className="text-xl text-white leading-tight mt-0.5 truncate" style={{ ...SERIF, fontWeight: 500 }}>{audio.title}</p>
        <p className="text-xs text-white/60 mt-0.5 truncate">{audio.subtitle}</p>
        {/* The day's four Daily Guide segments as dots — the "n/4" that
            used to be squeezed onto the subtitle and cut off on a phone. */}
        <div className="flex items-center gap-1 mt-1.5" aria-label={`${done} of 4 Daily Guide sessions done today`}>
          {audio.segmentsDone.map((d, i) => (
            <span key={i} className={`w-1.5 h-1.5 rounded-full ${d ? 'bg-white' : 'bg-white/20'}`} />
          ))}
        </div>
      </div>
      {audio.durationSec !== null && (
        <span className="text-xs text-white/60 tabular-nums shrink-0">{formatDuration(audio.durationSec)}</span>
      )}
      <span className="w-10 h-10 shrink-0 rounded-full bg-white text-black flex items-center justify-center">
        <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
      </span>
    </button>
  )
}

// ─── Active era ──────────────────────────────────────────────────────────────

function Tile({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="card-surface-lg p-4 min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-white/50">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function ActiveEra({
  era,
  onChange,
  content,
  audio,
}: {
  era: EraToday
  onChange: (era: EraToday | null) => void
  content: EraContentHandlers
  audio: TodaysAudio
}) {
  const [draft, setDraft] = useState('')
  const [source, setSource] = useState<'typed' | 'spoken'>('typed')
  /** How sure they are before promising, 1–5. Skipping it is fine. */
  const [confidence, setConfidence] = useState<number | null>(null)
  /** A just-answered yesterday, still owed its one-tap "why". */
  const [pendingWhy, setPendingWhy] = useState<{ kept: boolean } | null>(null)
  /** Writing tomorrow's promise tonight, rather than in a rushed morning. */
  const [writingAhead, setWritingAhead] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [crisis, setCrisis] = useState<CrisisContent | null>(null)
  const [trialOffer, setTrialOffer] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [wakeOpen, setWakeOpen] = useState(false)
  // The "how an era works" primer: shown for the first three days of an era,
  // dismissed for good per era once they say they've got it.
  const primerKey = `voxu-era-primer-${era.id}`
  const [primerDismissed, setPrimerDismissed] = useState(true)
  useEffect(() => {
    try { setPrimerDismissed(!!localStorage.getItem(primerKey)) } catch { setPrimerDismissed(false) }
  }, [primerKey])
  const dismissPrimer = () => {
    setPrimerDismissed(true)
    try { localStorage.setItem(primerKey, '1') } catch { /* storage blocked */ }
  }
  const [wake, setWake] = useState<WakeCallSettings>(era.wakeCall)
  useEffect(() => { setWake(era.wakeCall) }, [era.wakeCall.enabled, era.wakeCall.time]) // eslint-disable-line react-hooks/exhaustive-deps
  const wakeLabel = wake.enabled ? clockLabel(wake.time) : null
  // Share moments: a week, two, three, and the finish — the days people are
  // proud of. Dismissed per era per milestone, so "Not now" means not again.
  const milestone = era.step === 'complete' ? 'complete' : [7, 14, 21].includes(era.day) ? String(era.day) : null
  const milestoneKey = milestone ? `voxu-era-share-${era.id}-${milestone}` : null
  const [milestoneDismissed, setMilestoneDismissed] = useState(true)
  useEffect(() => {
    if (!milestoneKey) return
    try { setMilestoneDismissed(!!localStorage.getItem(milestoneKey)) } catch { setMilestoneDismissed(false) }
  }, [milestoneKey])
  const dismissMilestone = () => {
    setMilestoneDismissed(true)
    try { if (milestoneKey) localStorage.setItem(milestoneKey, '1') } catch { /* storage blocked */ }
  }
  const { openUpgradeModal } = useSubscription()
  const achievements = useAchievementOptional()

  const post = async (url: string, body: unknown) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error || 'Something went wrong. Try again.')
        return null
      }
      if (data?.crisis) setCrisis(data.crisis)
      if (data?.era !== undefined) onChange(data.era)
      if (data?.newAchievements?.length) achievements?.triggerAchievements(data.newAchievements)
      return data
    } catch {
      setError("Couldn't reach Voxu. Check your connection.")
      return null
    } finally {
      setBusy(false)
    }
  }

  const promise = async (forDay: 'today' | 'tomorrow' = 'today') => {
    const text = draft.trim()
    if (!text || busy) return
    const ok = await post('/api/era/promise', { text, source, confidence, forDay })
    if (ok) {
      setDraft('')
      setConfidence(null)
      setWritingAhead(false)
    }
  }

  const check = async (which: 'today' | 'yesterday', kept: boolean, reason?: string) => {
    const data = await post('/api/era/check', { which, kept, reason })
    // Answering yesterday moves the card straight on to today's promise, so
    // the "why" would never be asked for the miss that matters most — the one
    // they didn't answer last night. Hold it over into the next step.
    if (data) setPendingWhy(!reason && which === 'yesterday' ? { kept } : null)
    // The trial offer's one moment: right after a win, once three promises
    // have been kept. Never on day 1, never a wall, and only ever once.
    const next = data?.era as EraToday | null | undefined
    if (kept && next && !next.isPremium && next.stats.kept >= 3) {
      try {
        if (!localStorage.getItem(TRIAL_OFFER_KEY)) {
          localStorage.setItem(TRIAL_OFFER_KEY, '1')
          setTrialOffer(true)
        }
      } catch { /* storage blocked: skip the offer rather than repeat it */ }
    }
  }

  /**
   * How sure they are, before they commit. One tap, skippable, and it's what
   * lets the app later tell them whether their own certainty means anything
   * (lib/patterns) — a promise they were sure about and one they weren't are
   * not the same promise.
   */
  const confidenceRow = (
    <div className="mt-3">
      <p className="text-[11px] text-white/45">How sure are you? <span className="text-white/30">Optional</span></p>
      <div className="flex gap-1.5 mt-1.5" role="group" aria-label="How sure are you?">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            aria-pressed={confidence === n}
            aria-label={CONFIDENCE_LABELS[n]}
            onClick={() => setConfidence(confidence === n ? null : n)}
            className={`flex-1 py-2 rounded-lg text-xs border transition-all active:scale-[0.97] ${
              confidence === n
                ? 'bg-white text-black border-white'
                : 'bg-white/[0.04] text-white/60 border-white/[0.12]'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {confidence !== null && (
        <p className="text-[11px] text-white/45 mt-1.5">{CONFIDENCE_LABELS[confidence]}</p>
      )}
    </div>
  )

  /**
   * After the check-in, one tap on why. Only ever asked once per promise,
   * and never in the way of the answer itself: the check-in is already
   * recorded by the time these appear.
   */
  const reasonChips = (which: 'today' | 'yesterday', kept: boolean, answered: string | null) => {
    const options = kept ? HELPERS : BLOCKERS
    if (answered) {
      return (
        <p className="text-[11px] text-white/45 mt-2.5">
          {kept ? 'What helped: ' : 'What got in the way: '}{reasonLabel(answered)}
        </p>
      )
    }
    return (
      <div className="mt-3">
        <p className="text-[11px] text-white/45">{kept ? 'What helped?' : 'What got in the way?'} <span className="text-white/30">Optional</span></p>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {options.map(o => (
            <button
              key={o.key}
              disabled={busy}
              onClick={() => { setPendingWhy(null); void check(which, kept, o.key) }}
              className="rounded-full border border-white/[0.14] bg-white/[0.04] px-3 py-1.5 text-xs text-white/80 active:scale-[0.97] disabled:opacity-40 transition-all"
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  /**
   * Doing the mission is its own act — plenty of days have the mission
   * without the promise, or the other way round — so it gets its own tap,
   * and it's the only way to know which missions people actually do.
   */
  const missionToggle = (
    <button
      onClick={() => post('/api/era/mission', { done: !era.missionDone })}
      disabled={busy}
      aria-pressed={era.missionDone}
      className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs border transition-all active:scale-[0.97] disabled:opacity-40 ${
        era.missionDone
          ? 'bg-white text-black border-white'
          : 'bg-white/[0.04] text-white/75 border-white/[0.14]'
      }`}
    >
      <Check className="w-3.5 h-3.5" /> {era.missionDone ? 'Mission done' : 'I did the mission'}
    </button>
  )

  const yesNo = (which: 'today' | 'yesterday', quiet = false) => (
    <div className="flex gap-2 mt-3">
      <button
        disabled={busy}
        onClick={() => check(which, true)}
        className={`flex-1 ${quiet ? 'py-2 text-xs' : 'py-3 text-sm'} rounded-xl bg-white text-black font-medium active:scale-[0.98] disabled:opacity-40 transition-all focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none flex items-center justify-center gap-1.5`}
      >
        <Check className="w-4 h-4" /> I kept it
      </button>
      <button
        disabled={busy}
        onClick={() => check(which, false)}
        className={`flex-1 ${quiet ? 'py-2 text-xs' : 'py-3 text-sm'} rounded-xl bg-white/[0.06] border border-white/[0.15] text-white/85 font-medium active:scale-[0.98] disabled:opacity-40 transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none flex items-center justify-center gap-1.5`}
      >
        <X className="w-4 h-4" /> I didn&rsquo;t
      </button>
    </div>
  )

  const t = era.today

  let action: React.ReactNode = null
  switch (era.step) {
    case 'complete':
      action = (
        <div className="card-surface-lg p-4">
          <p className="text-[15px] text-white">
            You finished your {eraName(era.title)}.
            {era.stats.keptPercent !== null && <> You kept {era.stats.kept} of {era.stats.answered} promises.</>}
          </p>
          <EraRecap era={era} onLocked={openUpgradeModal} />
          <Link href="/era" className="mt-3 w-full block text-center py-3 rounded-xl bg-white text-black text-sm font-medium">
            Start your next era
          </Link>
        </div>
      )
      break

    case 'check_yesterday':
      action = (
        <div className="card-surface-lg p-4">
          <p className="text-xs text-white/60">Did you keep yesterday&rsquo;s promise?</p>
          <p className="text-[17px] text-white mt-1 leading-snug" style={SERIF}>&ldquo;{era.yesterday?.text}&rdquo;</p>
          {yesNo('yesterday')}
        </div>
      )
      break

    case 'promise':
      action = (
        <div className="card-surface-lg p-4">
          {pendingWhy && (
            <div className="mb-4 pb-4 border-b border-white/10">
              <p className="text-xs text-white/60">
                {pendingWhy.kept ? 'You kept yesterday’s promise.' : 'Yesterday didn’t happen.'}
              </p>
              {reasonChips('yesterday', pendingWhy.kept, null)}
            </div>
          )}
          {era.mission && (
            <div className="mb-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-white/50">
                <Target className="w-3.5 h-3.5" /> Today&rsquo;s mission
              </div>
              <p className="text-[17px] text-white mt-1.5 leading-snug" style={SERIF}>{era.mission}</p>
              <div className="flex flex-wrap items-center gap-3">
                {missionToggle}
                <button
                  onClick={() => { setDraft(era.mission!); setSource('typed') }}
                  disabled={busy}
                  className="mt-2 text-xs text-white/70 underline underline-offset-2 hover:text-white disabled:opacity-40"
                >
                  Make it my promise
                </button>
              </div>
            </div>
          )}
          <label htmlFor="era-promise" className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-white/50">
            <BookOpen className="w-3.5 h-3.5" /> Today&rsquo;s promise
          </label>
          <div className="mt-2 flex items-end gap-2">
            <textarea
              id="era-promise"
              rows={2}
              value={draft}
              maxLength={ERA_LIMITS.promise}
              onChange={e => { setDraft(e.target.value); setSource('typed') }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); promise() }
              }}
              placeholder={era.promiseHint}
              disabled={busy}
              // 16px: anything smaller makes iOS zoom the page on focus.
              className="flex-1 resize-none rounded-xl bg-white/[0.05] border border-white/[0.15] px-3 py-2.5 text-base text-white placeholder:text-white/35 focus:outline-none focus:border-white/40 disabled:opacity-50"
            />
            <div className="flex flex-col gap-2 items-center">
              <VoiceInput
                disabled={busy}
                onTranscript={txt => {
                  setDraft(prev => (prev ? `${prev} ${txt}` : txt).slice(0, ERA_LIMITS.promise))
                  setSource('spoken')
                }}
              />
              <button
                onClick={() => promise('today')}
                disabled={busy || !draft.trim()}
                aria-label="Make this promise"
                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {/* Asked before they commit, while the answer is still honest. */}
          {draft.trim().length > 0 && confidenceRow}
        </div>
      )
      break

    case 'check':
    case 'done':
      action = (
        <>
          <div className={`grid gap-3 ${era.mission && t?.text !== era.mission ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <Tile icon={BookOpen} label="Today's promise">
              <p className="text-[17px] text-white leading-snug" style={SERIF}>{t?.text}</p>
            </Tile>
            {era.mission && t?.text !== era.mission && (
              <Tile icon={Target} label="Today's mission">
                <p className="text-[17px] text-white leading-snug" style={SERIF}>{era.mission}</p>
                {missionToggle}
              </Tile>
            )}
          </div>
          {(t?.coachReply || era.step === 'check' || t?.kept !== null) && (
            <div className="card-surface-lg p-4">
              {t?.coachReply && (
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-sm text-white/80 leading-relaxed border-l-2 border-white/25 pl-3">{t.coachReply}</p>
                  {/* Hear it: free users get one spoken reply a day from the
                      shared allowance; past that it offers the upgrade. */}
                  <SpeakReplyButton text={t.coachReply} onUpgrade={openUpgradeModal} />
                </div>
              )}
              {era.memoryLockedToday && t?.coachReply && (
                <button
                  onClick={openUpgradeModal}
                  className="mt-3 w-full text-left rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 flex items-center gap-2.5"
                >
                  <Lock className="w-3.5 h-3.5 text-white/70 shrink-0" />
                  <span className="text-xs text-white/75 leading-snug">
                    Today&rsquo;s a memory day. With Premium, your coach brings back what you told it on day 1.
                  </span>
                </button>
              )}
              {era.step === 'check' ? (
                <div className={t?.coachReply ? 'mt-4' : ''}>
                  <p className="text-xs text-white/60">
                    {/* Naming the time of day stops this reading as a demand
                        made seconds after the promise was written. */}
                    {era.checkInOpen ? 'Tonight — did you keep it?' : 'Check in tonight — or now, if it’s already done.'}
                  </p>
                  {yesNo('today', !era.checkInOpen)}
                </div>
              ) : (
                <div className={t?.coachReply ? 'mt-3' : ''}>
                  <p className="text-sm text-white">
                    {t?.kept ? 'Kept. That one counts.' : 'Not today. Tomorrow is a new promise.'}
                  </p>
                  {/* The answer is already saved; this is the useful half of a
                      miss, and it costs one tap. */}
                  {t?.kept !== null && t !== null
                    && reasonChips('today', t.kept === true, t.kept ? t.helper : t.blocker)}
                </div>
              )}
            </div>
          )}
        </>
      )
      break
  }

  const sound = SOUNDSCAPE_ITEMS.find(s => s.id === era.links.soundscapeId)
  const guide = VOICE_GUIDES.find(g => g.id === era.links.guideId)
  const guideLocked = guide ? content.isGuideLocked(guide.id) : false
  const chip =
    'inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1.5 text-xs text-white/85 hover:bg-white/[0.1] active:scale-[0.97] transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none'

  // One sentence for the one thing to do now. Every card on this screen is
  // live at once, which reads as a to-do list where everything is urgent;
  // this says which one is actually next.
  const nextStep =
    era.step === 'check_yesterday' ? 'Answer yesterday first — then today’s promise.'
    : era.step === 'promise' ? 'Make today’s promise. One thing, small enough that you’ll keep it.'
    : era.step === 'check' && !era.checkInOpen ? 'Go do it. Come back tonight and say whether you kept it.'
    : era.step === 'check' ? 'Say whether you kept today’s promise.'
    : era.step === 'done' && era.tomorrow ? 'Done for today, and tomorrow is already written.'
    : era.step === 'done' ? 'Done for today. Write tomorrow’s promise now, or in the morning.'
    : null

  /**
   * Tomorrow's promise, written tonight.
   *
   * A busy morning shouldn't be the reason a day has no promise — and for
   * some people the evening is the better moment to decide anyway. Offered
   * once today is settled, never instead of today.
   */
  const tomorrowBlock = era.step === 'complete' || era.step === 'promise' || era.step === 'check_yesterday'
    ? null
    : era.tomorrow && !writingAhead ? (
      <div className="card-surface-lg p-4">
        <p className="text-[10px] tracking-[0.2em] uppercase text-white/50 flex items-center gap-1.5">
          <Moon className="w-3.5 h-3.5" /> Tomorrow
        </p>
        <p className="text-[17px] text-white mt-1.5 leading-snug" style={SERIF}>{era.tomorrow.text}</p>
        {era.tomorrow.coachReply && (
          <p className="text-sm text-white/75 mt-2.5 leading-relaxed border-l-2 border-white/25 pl-3">
            {era.tomorrow.coachReply}
          </p>
        )}
        <button
          onClick={() => { setDraft(era.tomorrow!.text); setSource('typed'); setWritingAhead(true) }}
          className="mt-3 text-xs text-white/60 underline underline-offset-2"
        >
          Change it
        </button>
      </div>
    ) : writingAhead ? (
      <div className="card-surface-lg p-4">
        <label htmlFor="era-tomorrow" className="text-[10px] tracking-[0.2em] uppercase text-white/50 flex items-center gap-1.5">
          <Moon className="w-3.5 h-3.5" /> Tomorrow’s promise
        </label>
        <div className="mt-2 flex items-end gap-2">
          <textarea
            id="era-tomorrow"
            rows={2}
            value={draft}
            maxLength={ERA_LIMITS.promise}
            onChange={e => { setDraft(e.target.value); setSource('typed') }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); promise('tomorrow') } }}
            placeholder={era.promiseHint}
            disabled={busy}
            className="flex-1 resize-none rounded-xl bg-white/[0.05] border border-white/[0.15] px-3 py-2.5 text-base text-white placeholder:text-white/35 focus:outline-none focus:border-white/40 disabled:opacity-50"
          />
          <div className="flex flex-col gap-2 items-center">
            <VoiceInput
              disabled={busy}
              onTranscript={txt => {
                setDraft(prev => (prev ? `${prev} ${txt}` : txt).slice(0, ERA_LIMITS.promise))
                setSource('spoken')
              }}
            />
            <button
              onClick={() => promise('tomorrow')}
              disabled={busy || !draft.trim()}
              aria-label="Promise this for tomorrow"
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <button
          onClick={() => { setWritingAhead(false); setDraft('') }}
          className="mt-2 text-xs text-white/50"
        >
          Not now
        </button>
      </div>
    ) : (
      <button className={chip} onClick={() => setWritingAhead(true)}>
        <Moon className="w-3 h-3" /> Write tomorrow’s promise
      </button>
    )

  return (
    <>
      <EraHero era={era} onShare={() => setSharing(true)} />

      {/* What an era actually asks of you, for the first few days.
          Starting one used to drop you into a screen of cards — a promise, a
          mission, a check-in, an audio — with nothing saying which is the
          thing to do or how they relate. Three lines, once per era. */}
      {era.day <= 3 && era.step !== 'complete' && !primerDismissed && (
        <div className="card-surface-lg p-4">
          <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">How an era works</p>
          <ol className="mt-2.5 space-y-2">
            {[
              ['Each morning', 'you promise yourself one thing. Your coach answers it.'],
              ['During the day', 'you do it. The mission is a suggestion if you want one.'],
              ['At night', 'you say whether you kept it. That is the whole loop.'],
            ].map(([when, what]) => (
              <li key={when} className="text-sm text-white/75 leading-snug">
                <span className="text-white">{when}</span> {what}
              </li>
            ))}
          </ol>
          <p className="text-[11px] text-white/45 mt-3">
            Miss a day and the era carries on — {era.lengthDays} days either way.
          </p>
          <button onClick={dismissPrimer} className="mt-2 text-xs text-white/60 underline underline-offset-2">
            Got it
          </button>
        </div>
      )}

      {/* The single next thing, in order, so the cards below have a reading
          order instead of being a wall of equals. */}
      {nextStep && (
        <p className="px-1 text-sm text-white/70">
          <span className="text-[10px] tracking-[0.2em] uppercase text-white/45 mr-2">Next</span>
          {nextStep}
        </p>
      )}

      <AudioCard audio={audio} />
      {action}
      {tomorrowBlock}
      {crisis && <CrisisBanner content={crisis} />}
      {error && <p className="text-xs text-white/70" role="alert">{error}</p>}
      {trialOffer && (
        <div className="card-surface-lg p-4 border border-white/20">
          <p className="text-[19px] text-white leading-snug" style={{ ...SERIF, fontWeight: 500 }}>
            {era.stats.kept} for {era.stats.answered}. You&rsquo;re someone who keeps promises.
          </p>
          <p className="text-sm text-white/70 mt-1.5">
            Keep your coach in your corner — the voice, the memory, the recap at day {era.lengthDays}.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { setTrialOffer(false); openUpgradeModal() }}
              className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-medium"
            >
              Try Premium free for {TRIAL_DAYS} days
            </button>
            <button onClick={() => setTrialOffer(false)} className="px-4 py-2.5 rounded-xl border border-white/15 text-sm text-white/75">
              Not now
            </button>
          </div>
        </div>
      )}

      {/* Promises kept · streak */}
      <div className="card-surface-lg px-4 py-3.5 grid grid-cols-2 divide-x divide-white/10">
        <div className="flex items-center gap-3 pr-3">
          <BarChart3 className="w-5 h-5 text-white/80" />
          <div>
            <p className="text-[11px] text-white/55">Promises kept</p>
            <p className="text-2xl text-white leading-none mt-0.5" style={{ ...SERIF, fontWeight: 500 }}>
              {era.stats.keptPercent === null ? '—' : `${era.stats.keptPercent}%`}
            </p>
            {/* A dash beside a streak of 1 reads like a contradiction; it
                isn't, it's just waiting for the first answer. */}
            {era.stats.keptPercent === null && (
              <p className="text-[10px] text-white/40 mt-1">after your first check-in</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 pl-4">
          <Flame className="w-5 h-5 text-white/80" />
          <div>
            <p className="text-[11px] text-white/55">Streak</p>
            <p className="text-2xl text-white leading-none mt-0.5" style={{ ...SERIF, fontWeight: 500 }}>
              {era.stats.promiseStreak}
            </p>
            {/* Says what the number counts: days with a promise MADE, which
                is not the same as days kept (lib/era/logic computeStats). */}
            <p className="text-[10px] text-white/40 mt-1">
              {era.stats.promiseStreak === 1 ? 'day with a promise' : 'days with a promise'}
            </p>
          </div>
        </div>
      </div>

      {milestone && !milestoneDismissed && (
        <div className="card-surface-lg p-4 border border-white/20">
          <p className="text-[19px] text-white leading-snug" style={{ ...SERIF, fontWeight: 500 }}>
            {milestone === 'complete' ? 'You finished it.' : milestone === '7' ? 'One week in.' : milestone === '14' ? 'Two weeks in.' : 'Three weeks in.'}
          </p>
          <p className="text-sm text-white/70 mt-1">Show someone — they can start your era with you.</p>
          <div className="flex gap-2 mt-3">
            <button onClick={() => { dismissMilestone(); setSharing(true) }} className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-medium flex items-center justify-center gap-1.5">
              <Share2 className="w-4 h-4" /> Share your era
            </button>
            <button onClick={dismissMilestone} className="px-4 py-2.5 rounded-xl border border-white/15 text-sm text-white/75">Not now</button>
          </div>
        </div>
      )}

      {sharing && <ShareEraSheet era={era} onClose={() => setSharing(false)} />}
      {wakeOpen && (
        <WakeCallSheet eraTitle={era.title} initial={wake} onClose={() => setWakeOpen(false)} onSaved={setWake} />
      )}

      {/* Alignment — whether the Daily Read is moving toward the era. Early on
          it says how many answers it still needs, which is itself the nudge
          to answer today's question. */}
      {era.alignment && era.step !== 'complete' && (
        <Link href="/daily-read" className="flex items-start gap-2.5 px-1 -mt-0.5">
          <span className="text-[10px] tracking-[0.2em] uppercase text-white/45 pt-0.5 shrink-0">Alignment</span>
          <span className="text-xs text-white/75 leading-snug">{alignmentLine(era.alignment)}</span>
        </Link>
      )}

      {/* Your circle: the people who came through the era's link (step 2), and
          Trending once any era has real numbers behind it. */}
      <CircleSection onShare={() => setSharing(true)} />

      {/* For your era — the wake-up call, and the one soundscape and one voice
          guide this era leans on. */}
      {era.step !== 'complete' && (
        <div>
          <p className="text-[10px] tracking-[0.24em] uppercase text-white/45 px-1">For your era</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <button className={chip} onClick={() => setWakeOpen(true)}>
              <AlarmClock className="w-3 h-3" /> {wakeLabel ? `Wake-up call · ${wakeLabel}` : 'Set a wake-up call'}
            </button>
            {sound && (
              <button className={chip} onClick={() => content.onPlaySoundscape(sound.id)}>
                <Play className="w-3 h-3" /> {sound.label} soundscape
              </button>
            )}
            {guide && (
              <button className={chip} onClick={() => content.onPlayGuide(guide.id)}>
                {guideLocked ? <Lock className="w-3 h-3" /> : <Play className="w-3 h-3" />} {guide.name}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}

const TRIAL_OFFER_KEY = 'voxu-era-trial-offer-shown'

/**
 * The Era Recap — a letter from the coach about the finished era. Premium:
 * free users see what it is and the upgrade; premium opens it (written on
 * first open, then kept) and can have it read aloud.
 */
function EraRecap({ era, onLocked }: { era: EraToday; onLocked: () => void }) {
  const [recap, setRecap] = useState<string | null>(era.recap)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const open = async () => {
    if (!era.isPremium) return onLocked()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/era/recap', { method: 'POST' })
      const data = await res.json().catch(() => null)
      if (res.status === 403 && data?.locked) return onLocked()
      if (!res.ok || !data?.recap) {
        setError(data?.error || 'Could not load your recap.')
        return
      }
      setRecap(data.recap)
    } catch {
      setError("Couldn't reach Voxu. Check your connection.")
    } finally {
      setBusy(false)
    }
  }

  if (recap) {
    return (
      <div className="mt-4 rounded-xl border border-white/15 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] tracking-[0.24em] uppercase text-white/50">Your Era Recap</p>
          <SpeakReplyButton text={recap} onUpgrade={onLocked} />
        </div>
        <p className="text-[16px] text-white/90 leading-relaxed mt-2 whitespace-pre-line" style={SERIF}>{recap}</p>
      </div>
    )
  }

  return (
    <div className="mt-4">
      <button
        onClick={open}
        disabled={busy}
        className="w-full text-left rounded-xl border border-white/20 bg-white/[0.05] px-4 py-3 flex items-center gap-3 disabled:opacity-50"
      >
        {era.isPremium
          ? (busy ? <Loader2 className="w-4 h-4 animate-spin text-white/80" /> : <BookOpen className="w-4 h-4 text-white/80" />)
          : <Lock className="w-4 h-4 text-white/80" />}
        <span className="flex-1">
          <span className="block text-sm text-white font-medium">Your Era Recap</span>
          <span className="block text-xs text-white/60">
            {era.isPremium ? 'Your coach wrote you a letter about these 30 days.' : 'A letter from your coach about these 30 days — Premium.'}
          </span>
        </span>
        <ChevronRight className="w-4 h-4 text-white/60" />
      </button>
      {error && <p className="text-xs text-white/70 mt-2" role="alert">{error}</p>}
    </div>
  )
}
