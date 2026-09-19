'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUp, Check, ChevronRight, Loader2, Lock, Play, Target, X } from 'lucide-react'
import { VoiceInput } from '@/components/journal/VoiceInput'
import { SOUNDSCAPE_ITEMS } from '@/components/player/SoundscapePlayer'
import { VOICE_GUIDES } from './home-types'
import { CrisisBanner, type CrisisContent } from '@/components/journal/CrisisBanner'
import { ERA_LIMITS } from '@/lib/era/presets'
import type { EraToday } from '@/hooks/useEra'

/**
 * The Era card — home's first card, above the carousel.
 *
 * Not a carousel slide on purpose: the carousel auto-advances every nine
 * seconds, and a card you type a promise into cannot slide away mid-sentence.
 *
 * One card walks the whole day: start an era → yesterday's check-in if it was
 * missed → today's promise → the coach's reply → tonight's check-in → done.
 * The server decides which (lib/era/logic.ts eraStep); this only renders it.
 *
 * Typing is first-class. Today's Minute asked for voice only and was used
 * twice across 200 days; the mic here fills the same text box instead.
 */
/** Plays the era's linked content through home's own handlers (premium checks included). */
export interface EraContentHandlers {
  onPlaySoundscape: (id: string) => void
  onPlayGuide: (id: string) => void
  isGuideLocked: (id: string) => boolean
}

export function EraCard({
  era,
  onChange,
  content,
}: {
  era: EraToday | null
  onChange: (era: EraToday | null) => void
  content?: EraContentHandlers
}) {
  if (!era) return <StartCard />
  return <ActiveCard era={era} onChange={onChange} content={content} />
}

/**
 * "For your era" — the one soundscape and one voice guide this era leans on
 * (lib/era/programs.ts). The point is that the whole app answers to the era,
 * not that the card grows a content shelf; two items, one line.
 */
function EraContentRow({ era, content }: { era: EraToday; content: EraContentHandlers }) {
  const sound = SOUNDSCAPE_ITEMS.find(s => s.id === era.links.soundscapeId)
  const guide = VOICE_GUIDES.find(g => g.id === era.links.guideId)
  if (!sound && !guide) return null
  const locked = guide ? content.isGuideLocked(guide.id) : false
  const chip =
    'inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1.5 text-xs text-white/85 hover:bg-white/[0.1] active:scale-[0.97] transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none'
  return (
    <div className="mt-4">
      <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">For your era</p>
      <div className="flex flex-wrap gap-2 mt-2">
        {sound && (
          <button className={chip} onClick={() => content.onPlaySoundscape(sound.id)}>
            <Play className="w-3 h-3" /> {sound.label} soundscape
          </button>
        )}
        {guide && (
          <button className={chip} onClick={() => content.onPlayGuide(guide.id)}>
            {locked ? <Lock className="w-3 h-3" /> : <Play className="w-3 h-3" />} {guide.name}
          </button>
        )}
      </div>
    </div>
  )
}

function StartCard() {
  // A guest who filled in /era and was sent to sign up lands here afterwards
  // (signup always returns home). Their answers are waiting on /era.
  const [hasDraft, setHasDraft] = useState(false)
  useEffect(() => {
    try { setHasDraft(!!localStorage.getItem('voxu-era-draft')) } catch { /* storage blocked */ }
  }, [])

  return (
    <Link href="/era" className="block group">
      <div className="relative p-5 card-surface-lg press-scale">
        <p className="text-[11px] tracking-[0.18em] text-white/50 uppercase">30 days</p>
        <h2 className="text-xl font-medium text-white mt-1">Who are you becoming?</h2>
        <p className="text-sm text-white/75 mt-1">
          Pick an era. Make one promise a day. Your coach keeps count.
        </p>
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-white font-medium">{hasDraft ? 'Finish starting your era' : 'Start your era'}</span>
          <ChevronRight className="w-5 h-5 text-white/90 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  )
}

function KeptLine({ era }: { era: EraToday }) {
  const { keptPercent, kept, answered } = era.stats
  return (
    <div className="flex items-center gap-3 mt-3">
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden" aria-hidden>
        <div
          className="h-full bg-white/80 rounded-full transition-all duration-500"
          style={{ width: `${keptPercent ?? 0}%` }}
        />
      </div>
      <p className="text-[11px] text-white/60 shrink-0">
        {keptPercent === null ? 'No check-ins yet' : `Promises kept ${keptPercent}% · ${kept}/${answered}`}
      </p>
    </div>
  )
}

function ActiveCard({
  era,
  onChange,
  content,
}: {
  era: EraToday
  onChange: (era: EraToday | null) => void
  content?: EraContentHandlers
}) {
  const [draft, setDraft] = useState('')
  const [source, setSource] = useState<'typed' | 'spoken'>('typed')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [crisis, setCrisis] = useState<CrisisContent | null>(null)

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

  const check = (which: 'today' | 'yesterday', kept: boolean) => post('/api/era/check', { which, kept })

  const header = (
    <Link href="/era" className="flex items-start justify-between gap-3 group">
      <div className="min-w-0">
        <p className="text-[11px] tracking-[0.18em] text-white/50 uppercase truncate">{era.title}</p>
        <p className="text-2xl font-medium text-white leading-tight mt-0.5">
          Day {era.day}
          <span className="text-white/40 text-base font-normal"> / {era.lengthDays}</span>
        </p>
        {era.step !== 'complete' && (
          <p className="text-xs text-white/60 mt-1">{era.stage.line}</p>
        )}
      </div>
      <div className="flex items-center gap-1 text-white/60 pt-1 shrink-0">
        {era.stats.promiseStreak > 1 && (
          <span className="text-[11px]">{era.stats.promiseStreak}-day streak</span>
        )}
        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
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

  let body: React.ReactNode

  switch (era.step) {
    case 'complete':
      body = (
        <div className="mt-3">
          <p className="text-[15px] text-white">
            You finished your {era.title} era.
            {era.stats.keptPercent !== null && <> You kept {era.stats.kept} of {era.stats.answered} promises.</>}
          </p>
          <Link
            href="/era"
            className="mt-3 w-full block text-center py-3 rounded-xl bg-white text-black text-sm font-medium active:scale-[0.98] transition-all"
          >
            Start your next era
          </Link>
        </div>
      )
      break

    case 'check_yesterday':
      body = (
        <div className="mt-3">
          <p className="text-xs text-white/60">Did you keep yesterday&rsquo;s promise?</p>
          <p className="text-[15px] text-white mt-1 leading-snug">&ldquo;{era.yesterday?.text}&rdquo;</p>
          {yesNo('yesterday')}
        </div>
      )
      break

    case 'promise':
      body = (
        <div className="mt-3">
          {/* Today's mission — the era's suggestion for the day. One tap
              makes it the promise; typing your own is just as valid. */}
          {era.mission && (
            <div className="mb-4 rounded-xl border border-white/[0.12] bg-white/[0.03] p-3">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-white/50">
                <Target className="w-3 h-3" /> Today&rsquo;s mission
              </div>
              <p className="text-[15px] text-white mt-1 leading-snug">{era.mission}</p>
              <button
                onClick={() => { setDraft(era.mission!); setSource('typed') }}
                disabled={busy}
                className="mt-2 text-xs text-white/70 underline underline-offset-2 hover:text-white disabled:opacity-40"
              >
                Make it my promise
              </button>
            </div>
          )}
          <label htmlFor="era-promise" className="text-xs text-white/60">
            What are you promising yourself today?
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
                onTranscript={t => {
                  setDraft(prev => (prev ? `${prev} ${t}` : t).slice(0, ERA_LIMITS.promise))
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
    case 'done': {
      const t = era.today
      body = (
        <div className="mt-3">
          <p className="text-xs text-white/60">Today&rsquo;s promise</p>
          <p className="text-[15px] text-white mt-1 leading-snug">&ldquo;{t?.text}&rdquo;</p>
          {t?.coachReply && (
            <p className="text-sm text-white/75 mt-3 leading-relaxed border-l-2 border-white/20 pl-3">
              {t.coachReply}
            </p>
          )}
          {era.mission && t?.text !== era.mission && (
            <p className="text-xs text-white/50 mt-3 flex items-start gap-1.5">
              <Target className="w-3 h-3 mt-0.5 shrink-0" /> <span>Today&rsquo;s mission: {era.mission}</span>
            </p>
          )}
          {era.step === 'check' ? (
            <>
              <p className="text-xs text-white/60 mt-4">
                {era.checkInOpen ? 'Did you keep it?' : 'Check in tonight — or now, if it’s already done.'}
              </p>
              {yesNo('today', !era.checkInOpen)}
            </>
          ) : (
            <p className="text-sm text-white mt-4">
              {t?.kept ? 'Kept. That one counts.' : 'Not today. Tomorrow is a new promise.'}
            </p>
          )}
        </div>
      )
      break
    }
  }

  return (
    <div className="relative p-5 card-surface-lg">
      {header}
      {body}
      {crisis && <div className="mt-4"><CrisisBanner content={crisis} /></div>}
      {error && <p className="text-xs text-white/70 mt-3" role="alert">{error}</p>}
      {content && era.step !== 'complete' && <EraContentRow era={era} content={content} />}
      <KeptLine era={era} />
    </div>
  )
}
