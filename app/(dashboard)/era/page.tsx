'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Compass, Flame, Grid3x3, Loader2 } from 'lucide-react'
import { useEra, type EraToday } from '@/hooks/useEra'
import { CUSTOM_ERA_KEY, ERA_LIMITS, ERA_PRESETS, ERA_PRESETS_BY_KEY, eraName } from '@/lib/era/presets'
import { CrisisBanner, type CrisisContent } from '@/components/journal/CrisisBanner'
import { useAchievementOptional } from '@/contexts/AchievementContext'
import { programFor } from '@/lib/era/programs'
import { alignmentLine } from '@/lib/era/alignment'
import { trackFeature } from '@/lib/analytics/track'
import { PracticeSection } from '@/components/exercise/PracticeSection'
import { PracticesSection } from '@/components/practices/PracticesSection'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/** An era's art fading in from the right — the same treatment as the home hero. */
function EraArt({ eraKey, className = '' }: { eraKey: string; className?: string }) {
  const img = programFor(eraKey).image
  if (!img) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={img}
      alt=""
      aria-hidden
      className={`absolute inset-y-0 right-0 h-full w-[62%] object-cover object-right grayscale opacity-75 pointer-events-none ${className}`}
      style={{
        WebkitMaskImage: 'linear-gradient(to left, black 40%, transparent)',
        maskImage: 'linear-gradient(to left, black 40%, transparent)',
      }}
    />
  )
}

/**
 * /era — pick an era, or see the one you're in.
 *
 * Two questions on the way in, not five: what you want to change, and
 * (optionally) why. The coach quotes the first back on the days it matters,
 * so it's the one worth asking; every extra question before day 1 is a
 * reason to never reach day 1.
 */

const DRAFT_KEY = 'voxu-era-draft'
/** The sharer's era id from a "Join this era" link — kept through sign-up. */
const REF_KEY = 'voxu-era-ref'

interface Draft { key: string; title: string; change: string; why: string }

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as Draft) : null
  } catch {
    return null
  }
}

function writeDraft(d: Draft | null) {
  try {
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d))
    else localStorage.removeItem(DRAFT_KEY)
  } catch {
    // Private mode or blocked storage: the draft just isn't remembered.
  }
}

export default function EraPage() {
  const router = useRouter()
  const { era, loaded, setEra } = useEra()
  const [choosing, setChoosing] = useState(false)
  // Arriving from /join/<era>: open the picker on that era, and keep the
  // sharer's era id so starting it credits them (EraReferral).
  const [startKey, setStartKey] = useState<string | null>(null)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const start = q.get('start')
    const from = q.get('from')
    if (from) {
      try { localStorage.setItem(REF_KEY, from) } catch { /* storage blocked */ }
    }
    if (start && ERA_PRESETS_BY_KEY.has(start)) {
      setStartKey(start)
      setChoosing(true)
    }
  }, [])

  const showPicker = loaded && (!era || era.step === 'complete' || choosing)

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain text-white" data-app-shell>
      {/* Same app-shell pattern as /daily-read: this container scrolls, the
          document doesn't, so iOS can't rubber-band the header away. */}
      <header className="sticky top-0 z-40 bg-black safe-area-pt pb-3 px-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (choosing ? setChoosing(false) : router.back())}
            aria-label="Back"
            className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-white/[0.06] border border-white/[0.12]">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-medium text-white leading-tight">Your Era</h1>
              <p className="text-[11px] text-white/50 leading-tight">30 days. One promise a day.</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-5 pb-16">
        {!loaded ? (
          <div className="py-24 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-white/40" />
          </div>
        ) : showPicker ? (
          <Picker
            initialKey={startKey}
            replacing={!!era && era.step !== 'complete'}
            onStarted={next => { setEra(next); setChoosing(false); router.push('/') }}
          />
        ) : era ? (
          <ActiveEra era={era} onEnded={() => setEra(null)} onChooseNew={() => setChoosing(true)} />
        ) : null}
      </div>
    </div>
  )
}

// ─── Picker ─────────────────────────────────────────────────────────────────

function Picker({
  replacing,
  onStarted,
  initialKey,
}: {
  replacing: boolean
  onStarted: (era: EraToday | null) => void
  initialKey?: string | null
}) {
  const [key, setKey] = useState<string | null>(initialKey ?? null)
  useEffect(() => { if (initialKey) setKey(initialKey) }, [initialKey])
  // Seeing the picker leaves no row behind, and "looked but didn't start" is
  // the one drop-off the funnel can't infer from the database.
  useEffect(() => { trackFeature('era', 'open', 'picker') }, [])
  const [title, setTitle] = useState('')
  const [change, setChange] = useState('')
  const [why, setWhy] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsAccount, setNeedsAccount] = useState(false)
  const [crisis, setCrisis] = useState<CrisisContent | null>(null)
  const achievements = useAchievementOptional()

  // A guest who filled this in, signed up, and came back shouldn't have to
  // type it all again.
  useEffect(() => {
    const d = readDraft()
    if (d) { setKey(d.key); setTitle(d.title); setChange(d.change); setWhy(d.why) }
  }, [])

  const preset = key ? ERA_PRESETS_BY_KEY.get(key) : undefined
  const isCustom = key === CUSTOM_ERA_KEY
  const canStart = !!key && change.trim().length > 0 && (!isCustom || title.trim().length > 0)

  const start = async () => {
    if (!canStart || busy) return
    setBusy(true)
    setError(null)
    const draft = { key: key!, title, change, why }
    let ref: string | null = null
    try { ref = localStorage.getItem(REF_KEY) } catch { /* storage blocked */ }
    try {
      const res = await fetch('/api/era', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, ref }),
      })
      if (res.status === 401) {
        writeDraft(draft)
        setNeedsAccount(true)
        return
      }
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error || 'Could not start your era. Try again.')
        return
      }
      writeDraft(null)
      try { localStorage.removeItem(REF_KEY) } catch { /* storage blocked */ }
      if (data?.newAchievements?.length) achievements?.triggerAchievements(data.newAchievements)
      if (data?.crisis) {
        // Hold on this screen so the resources are actually seen.
        setCrisis(data.crisis)
        return
      }
      onStarted(data?.era ?? null)
    } catch {
      setError("Couldn't reach Voxu. Check your connection.")
    } finally {
      setBusy(false)
    }
  }

  if (crisis) {
    return (
      <div className="pt-6 space-y-4">
        <p className="text-[15px] text-white">Your era has started. Before you go — this matters more.</p>
        <CrisisBanner content={crisis} />
        <Link href="/" className="block text-center py-3 rounded-xl bg-white text-black text-sm font-medium">
          Go to today
        </Link>
      </div>
    )
  }

  if (!key) {
    return (
      <div className="pt-4">
        <h2 className="text-2xl font-medium text-white">Who are you becoming?</h2>
        <p className="text-sm text-white/60 mt-1">
          {replacing ? 'Starting a new era ends the one you’re in. Your promises stay.' : 'Pick one for the next 30 days.'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-5">
          {ERA_PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => setKey(p.key)}
              className="relative overflow-hidden text-left p-4 min-h-[104px] flex flex-col justify-end rounded-2xl bg-black border border-white/[0.12] hover:border-white/30 active:scale-[0.99] transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
            >
              <EraArt eraKey={p.key} />
              <span className="relative block text-[22px] leading-none text-white uppercase" style={{ ...SERIF, fontWeight: 600 }}>{p.title}</span>
              <span className="relative block text-xs text-white/65 mt-1.5 max-w-[62%]">{p.tagline}</span>
            </button>
          ))}
          <button
            onClick={() => setKey(CUSTOM_ERA_KEY)}
            className="relative overflow-hidden text-left p-4 min-h-[104px] flex flex-col justify-end rounded-2xl bg-black border border-dashed border-white/30 hover:border-white/50 active:scale-[0.99] transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
          >
            <EraArt eraKey={CUSTOM_ERA_KEY} className="opacity-50" />
            <span className="relative block text-[22px] leading-none text-white uppercase" style={{ ...SERIF, fontWeight: 600 }}>Name your own</span>
            <span className="relative block text-xs text-white/65 mt-1.5 max-w-[62%]">Healing Era. Dad Mode. Whatever it is.</span>
          </button>
        </div>
      </div>
    )
  }

  const inputClass =
    'mt-2 w-full rounded-xl bg-white/[0.05] border border-white/[0.15] px-3 py-3 text-base text-white placeholder:text-white/35 focus:outline-none focus:border-white/40'

  return (
    <div className="pt-4 space-y-6">
      <div>
        <button onClick={() => setKey(null)} className="text-xs text-white/50 hover:text-white underline underline-offset-2">
          Choose a different era
        </button>
        {/* The chosen era as a banner — the same art the home hero will show. */}
        <div className="relative overflow-hidden mt-3 rounded-2xl border border-white/[0.12] bg-black p-5 min-h-[120px] flex flex-col justify-end">
          <EraArt eraKey={key} />
          <h2 className="relative text-[32px] leading-none text-white uppercase" style={{ ...SERIF, fontWeight: 600 }}>
            {isCustom ? (title.trim() || 'Your own era') : preset?.title}
          </h2>
          {preset && <p className="relative text-sm text-white/70 mt-2 max-w-[62%]">{preset.tagline}</p>}
        </div>
      </div>

      {isCustom && (
        <div>
          <label htmlFor="era-title" className="text-sm text-white/80">What do you call it?</label>
          <input
            id="era-title"
            value={title}
            maxLength={ERA_LIMITS.title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Healing Era"
            className={inputClass}
          />
        </div>
      )}

      <div>
        <label htmlFor="era-change" className="text-sm text-white/80">What are you trying to change?</label>
        <textarea
          id="era-change"
          rows={3}
          value={change}
          maxLength={ERA_LIMITS.change}
          onChange={e => setChange(e.target.value)}
          placeholder={preset?.changeHint ?? 'Say it the way you’d say it to a friend.'}
          className={`${inputClass} resize-none`}
        />
        <p className="text-[11px] text-white/40 mt-1.5">Your coach will remind you of this, in your own words.</p>
      </div>

      <div>
        <label htmlFor="era-why" className="text-sm text-white/80">
          Why does it matter? <span className="text-white/40">(optional)</span>
        </label>
        <textarea
          id="era-why"
          rows={2}
          value={why}
          maxLength={ERA_LIMITS.why}
          onChange={e => setWhy(e.target.value)}
          placeholder="Because…"
          className={`${inputClass} resize-none`}
        />
      </div>

      {needsAccount ? (
        <div className="rounded-2xl border border-white/20 bg-white/[0.05] p-4">
          <p className="text-sm text-white">Create a free account to start your era — your answers are saved.</p>
          <div className="flex gap-2 mt-3">
            <Link href="/signup" className="flex-1 text-center py-2.5 rounded-xl bg-white text-black text-sm font-medium">
              Sign up free
            </Link>
            <Link href="/login" className="flex-1 text-center py-2.5 rounded-xl border border-white/20 text-white text-sm">
              Log in
            </Link>
          </div>
        </div>
      ) : (
        <button
          onClick={start}
          disabled={!canStart || busy}
          className="w-full py-3.5 rounded-xl bg-white text-black text-[15px] font-medium disabled:opacity-30 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Start day 1
        </button>
      )}
      {error && <p className="text-xs text-white/70" role="alert">{error}</p>}
    </div>
  )
}

// ─── Active era ─────────────────────────────────────────────────────────────

function ActiveEra({
  era,
  onEnded,
  onChooseNew,
}: {
  era: EraToday
  onEnded: () => void
  onChooseNew: () => void
}) {
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [busy, setBusy] = useState(false)

  const byDay = new Map(era.days.map(d => [d.day, d]))

  const end = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/era', { method: 'DELETE' })
      if (res.ok) onEnded()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pt-4 space-y-7">
      <div>
        <p className="text-[11px] tracking-[0.18em] text-white/50 uppercase">{era.title}</p>
        <p className="text-4xl font-medium text-white mt-1">
          Day {era.day}<span className="text-white/35 text-xl font-normal"> / {era.lengthDays}</span>
        </p>
        <p className="text-sm text-white mt-2">
          <span className="text-white/50">{era.stage.label} · </span>{era.stage.line}
        </p>
        <p className="text-sm text-white/70 mt-2">
          {era.stats.keptPercent === null
            ? 'No check-ins yet.'
            : `Promises kept: ${era.stats.keptPercent}% (${era.stats.kept} of ${era.stats.answered})`}
          {era.stats.promiseStreak > 1 && ` · ${era.stats.promiseStreak}-day streak`}
        </p>
      </div>

      {/* The 30 days. Filled = kept, crossed = not kept, ring = promised but
          never checked, faint = no promise. Today is outlined. */}
      <div>
        <div className="grid grid-cols-10 gap-1.5" role="list" aria-label="Your days">
          {Array.from({ length: era.lengthDays }, (_, i) => {
            const n = i + 1
            const d = byDay.get(n)
            const isToday = n === era.day
            const state = !d ? 'none' : d.kept === true ? 'kept' : d.kept === false ? 'broken' : 'open'
            const label = `Day ${n}: ${
              state === 'kept' ? 'kept' : state === 'broken' ? 'not kept' : state === 'open' ? 'not checked in' : n > era.day ? 'ahead' : 'no promise'
            }`
            return (
              <div
                key={n}
                role="listitem"
                aria-label={label}
                title={label}
                className={`aspect-square rounded-md flex items-center justify-center text-[10px] ${
                  state === 'kept'
                    ? 'bg-white text-black font-medium'
                    : state === 'broken'
                      ? 'border border-white/30 text-white/50 line-through'
                      : state === 'open'
                        ? 'border border-white/50 text-white/70'
                        : n > era.day
                          ? 'bg-white/[0.03] text-white/20'
                          : 'bg-white/[0.06] text-white/35'
                } ${isToday ? 'ring-2 ring-white/70 ring-offset-2 ring-offset-black' : ''}`}
              >
                {n}
              </div>
            )
          })}
        </div>
      </div>

      {/* Practice: the exercise Voxu runs WITH you. The mission below is the
          thing you go and do in the world — two different asks, deliberately
          not merged. */}
      <PracticeSection hasEra />

      {/* The disciplines they already keep. Adding happens here, not on
          home: nothing on the home screen should be a form. */}
      <PracticesSection canAdd />

      {era.mission && (
        <div className="rounded-2xl border border-white/[0.12] p-4">
          <p className="text-xs text-white/50">Today&rsquo;s mission</p>
          <p className="text-[15px] text-white mt-1 leading-snug">{era.mission}</p>
        </div>
      )}

      <div className="rounded-2xl bg-white/[0.04] border border-white/[0.12] p-4">
        <p className="text-xs text-white/50">On day 1 you said</p>
        <p className="text-[15px] text-white mt-1 leading-snug">&ldquo;{era.change}&rdquo;</p>
        {era.why && <p className="text-sm text-white/65 mt-2 leading-snug">Because &ldquo;{era.why}&rdquo;</p>}
      </div>

      {/* The record this era is adding to — days kept, across every era. */}
      <Link href="/proof" className="block rounded-2xl border border-white/[0.12] p-4 hover:bg-white/[0.03]">
        <div className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-white/50">
          <Grid3x3 className="w-3.5 h-3.5" /> Your year in proof
        </div>
        <p className="text-[17px] text-white mt-1.5 leading-snug" style={SERIF}>
          Every day you kept a promise, on one page.
        </p>
        <p className="text-[11px] text-white/45 mt-2">
          Tap a day to see the promise, the mission and how you were.
        </p>
      </Link>

      {/* Is the Daily Read moving toward who this era is about? */}
      {era.alignment && (
        <Link href="/daily-read" className="block rounded-2xl border border-white/[0.12] p-4 hover:bg-white/[0.03]">
          <div className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-white/50">
            <Compass className="w-3.5 h-3.5" /> Alignment
          </div>
          <p className="text-[17px] text-white mt-1.5 leading-snug" style={SERIF}>{alignmentLine(era.alignment)}</p>
          <p className="text-[11px] text-white/45 mt-2">
            From your Daily Read — one question a day, self-reported, so it only ever says a direction.
          </p>
        </Link>
      )}

      <Link href="/" className="block text-center py-3 rounded-xl bg-white text-black text-sm font-medium">
        {era.step === 'promise' ? 'Make today’s promise' : 'Back to today'}
      </Link>

      <div className="pt-2 border-t border-white/10 space-y-3">
        <button onClick={onChooseNew} className="text-sm text-white/60 hover:text-white">
          Start a different era
        </button>
        {confirmEnd ? (
          <div className="rounded-xl border border-white/15 p-3">
            <p className="text-sm text-white">End your {eraName(era.title)} now? Your promises are kept.</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={end}
                disabled={busy}
                className="flex-1 py-2 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-40"
              >
                End it
              </button>
              <button onClick={() => setConfirmEnd(false)} className="flex-1 py-2 rounded-lg border border-white/20 text-sm text-white">
                Keep going
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmEnd(true)} className="block text-sm text-white/40 hover:text-white/70">
            End this era
          </button>
        )}
      </div>
    </div>
  )
}
