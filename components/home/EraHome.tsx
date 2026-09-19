'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUp, BarChart3, BookOpen, Check, ChevronRight, Flame, Loader2, Lock, Play, Target, X,
  type LucideIcon,
} from 'lucide-react'
import { VoiceInput } from '@/components/journal/VoiceInput'
import { CrisisBanner, type CrisisContent } from '@/components/journal/CrisisBanner'
import { SOUNDSCAPE_ITEMS } from '@/components/player/SoundscapePlayer'
import { VOICE_GUIDES } from './home-types'
import { ERA_LIMITS } from '@/lib/era/presets'
import { TRIAL_DAYS } from '@/lib/subscription-constants'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { SpeakReplyButton } from '@/components/journal/SpeakReplyButton'
import { useAchievementOptional } from '@/contexts/AchievementContext'
import { ERA_START_IMAGE } from '@/lib/era/programs'
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

function EraHero({ era }: { era: EraToday }) {
  const pct = Math.round((era.day / era.lengthDays) * 100)
  const byDay = new Map(era.days.map(d => [d.day, d.kept]))
  return (
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
        era.image,
      )}
    </Link>
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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [crisis, setCrisis] = useState<CrisisContent | null>(null)
  const [trialOffer, setTrialOffer] = useState(false)
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

  const promise = async () => {
    const text = draft.trim()
    if (!text || busy) return
    const ok = await post('/api/era/promise', { text, source })
    if (ok) setDraft('')
  }

  const check = async (which: 'today' | 'yesterday', kept: boolean) => {
    const data = await post('/api/era/check', { which, kept })
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
            You finished your {era.title} era.
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
          {era.mission && (
            <div className="mb-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-white/50">
                <Target className="w-3.5 h-3.5" /> Today&rsquo;s mission
              </div>
              <p className="text-[17px] text-white mt-1.5 leading-snug" style={SERIF}>{era.mission}</p>
              <button
                onClick={() => { setDraft(era.mission!); setSource('typed') }}
                disabled={busy}
                className="mt-2 text-xs text-white/70 underline underline-offset-2 hover:text-white disabled:opacity-40"
              >
                Make it my promise
              </button>
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
                onClick={promise}
                disabled={busy || !draft.trim()}
                aria-label="Make this promise"
                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
              </button>
            </div>
          </div>
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
                    {era.checkInOpen ? 'Did you keep it?' : 'Check in tonight — or now, if it’s already done.'}
                  </p>
                  {yesNo('today', !era.checkInOpen)}
                </div>
              ) : (
                <p className={`text-sm text-white ${t?.coachReply ? 'mt-3' : ''}`}>
                  {t?.kept ? 'Kept. That one counts.' : 'Not today. Tomorrow is a new promise.'}
                </p>
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

  return (
    <>
      <EraHero era={era} />
      <AudioCard audio={audio} />
      {action}
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
          </div>
        </div>
        <div className="flex items-center gap-3 pl-4">
          <Flame className="w-5 h-5 text-white/80" />
          <div>
            <p className="text-[11px] text-white/55">Streak</p>
            <p className="text-2xl text-white leading-none mt-0.5" style={{ ...SERIF, fontWeight: 500 }}>
              {era.stats.promiseStreak}
            </p>
          </div>
        </div>
      </div>

      {/* For your era — the one soundscape and one voice guide this era leans on. */}
      {era.step !== 'complete' && (sound || guide) && (
        <div>
          <p className="text-[10px] tracking-[0.24em] uppercase text-white/45 px-1">For your era</p>
          <div className="flex flex-wrap gap-2 mt-2">
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
