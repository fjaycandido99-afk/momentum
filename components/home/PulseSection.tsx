'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, Minus } from 'lucide-react'
import { timeLabel, type ActionTarget, type Pulse, type TodayItem } from '@/lib/pulse/engine'
import { OPEN_DISCIPLINE, PRACTICES_CHANGED } from '@/lib/pulse/events'
import { setLatestPulse } from '@/lib/pulse/store'
import { syncWidgetPulse } from '@/lib/widget-sync'
import { buildDebrief } from '@/lib/pulse/debrief'
import { NightDebriefCard, isDebriefHour } from './NightDebriefCard'
import { RescueCard } from './RescueCard'
import { useArrivalSpot } from '@/components/voice-guide/spotlight'
import { acceptRescue, declineRescue, isRescueDeclined, isRescueOn } from '@/lib/pulse/rescue-state'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const


const STATUS_TEXT: Record<TodayItem['status'], string> = {
  done: 'Done',
  minimum: 'Minimum',
  kept: 'Kept',
  missed: 'Not today',
  open: 'Open',
  due: 'Due',
  upcoming: 'Upcoming',
}

/**
 * Right now + Today, from /api/pulse (lib/pulse/engine.ts).
 *
 * Right now is the one thing to do; Today is the day as a short list with
 * "N of M". Both come from the server so home, the widget and the nudge can
 * never disagree about what matters.
 *
 * Fetched when home opens and again when something changes — the era moved
 * (`version`) or a discipline was logged (PRACTICES_CHANGED). Never on a
 * timer.
 */
export function PulseSection({
  version,
  onEra,
  debrief = null,
}: {
  version: string
  onEra: () => void
  /** With an era: what the night debrief needs beyond today's list. */
  debrief?: { era: { title: string; day: number }; tomorrowReady: boolean } | null
}) {
  const [pulse, setPulse] = useState<Pulse | null>(null)
  // Read once on mount; both reset at local midnight (lib/pulse/rescue-state).
  const [rescueOn, setRescueOn] = useState(false)
  const [rescueDeclined, setRescueDeclined] = useState(false)
  useEffect(() => {
    setRescueOn(isRescueOn())
    setRescueDeclined(isRescueDeclined())
  }, [])

  const router = useRouter()
  // "Play today's guided session" (Voxu Guide) lands here with ?spot=today-guide.
  useArrivalSpot()

  const load = useCallback(() => {
    // Rescue on: the plan stays until its last step is logged, not only
    // while two or more are open.
    fetch(isRescueOn() ? '/api/pulse?rescue=1' : '/api/pulse', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        // A failed refetch keeps what's on screen (and on the widget)
        // rather than wiping Right now, Today and the plan.
        const p = d?.pulse ?? null
        if (!p) return
        setPulse(p)
        // The one-per-open moment reads this when its timer fires, so the
        // nudge costs no second request.
        setLatestPulse(p)
        void syncWidgetPulse(p)
      })
      .catch(() => { /* home still has every card below */ })
  }, [])

  useEffect(() => { load() }, [load, version])
  useEffect(() => {
    window.addEventListener(PRACTICES_CHANGED, load)
    return () => window.removeEventListener(PRACTICES_CHANGED, load)
  }, [load])

  const act = (target: ActionTarget | null) => {
    if (!target) return
    if (target.type === 'era') onEra()
    // Home plays it (ImmersiveHome listens): the same path as a guide card.
    else if (target.type === 'guide') window.dispatchEvent(new CustomEvent('voxu:play-guide', { detail: { id: target.id } }))
    // In-app navigation: a full page load restarts the whole app in the shell.
    else if (target.type === 'patterns') router.push('/patterns')
    else window.dispatchEvent(new CustomEvent(OPEN_DISCIPLINE, { detail: { id: target.id } }))
  }

  if (!pulse) return null
  const r = pulse.rightNow
  const items = pulse.today.items
  const showDebrief = !!debrief && items.length > 0 && isDebriefHour()
  const rescue = pulse.rescue && pulse.rescue.steps.length > 0 ? pulse.rescue : null
  // On: the plan replaces Right now for the rest of the day. Offered: it sits
  // above Right now until answered. Declined: gone until tomorrow.
  const showRescue = !!rescue && (rescueOn || !rescueDeclined)

  return (
    <div className="space-y-3">
      {showRescue && (
        <RescueCard
          plan={rescue!}
          active={rescueOn}
          onAccept={() => { acceptRescue(); setRescueOn(true); load() }}
          onDecline={() => { declineRescue(); setRescueDeclined(true) }}
          onOpen={id => act({ type: 'practice', id })}
        />
      )}

      {r && !(showRescue && rescueOn) && (
        <div>
          <section className="card-surface-lg era-glow p-5" aria-label="Right now" data-voxu-spot="today-rightnow">
            <p className="text-px-10 tracking-[0.24em] uppercase text-white/45">{r.eyebrow}</p>
            <h2 className="text-px-26 leading-[1.1] text-white mt-1.5" style={{ ...SERIF, fontWeight: 500 }}>
              {r.title}
            </h2>
            {r.quote && (
              <p className="text-px-15 text-white/75 mt-2 leading-snug italic" style={SERIF}>
                &ldquo;{r.quote}&rdquo;
              </p>
            )}
            {r.context && <p className="text-px-13 text-white/55 mt-2 leading-snug">{r.context}</p>}
            {r.action && (
              <button
                onClick={() => act(r.action!.target)}
                className="mt-4 w-full py-3 rounded-xl bg-white text-black text-px-14 font-medium active:scale-[0.98] transition-all"
              >
                {r.action.label}
              </button>
            )}
            {pulse.next && (
              <p className="text-px-12 text-white/45 mt-3">
                Next: <span className="text-white/75">{pulse.next.title}</span> · {timeLabel(pulse.next.time)}
              </p>
            )}
          </section>
          {/* The way out, for the days when the ask is wrong — kept right under
              what the app says to do now, on purpose. */}
          <Link
            href="/reset"
            className="inline-block text-px-12 text-white/40 hover:text-white/70 mt-1.5 px-1 underline underline-offset-4 decoration-white/20"
          >
            Not feeling it?
          </Link>
        </div>
      )}

      {items.length >= 2 && (
        <section className="card-surface-lg p-4" aria-label="Today" data-voxu-spot="today-list">
          <div className="flex items-center justify-between">
            <p className="text-px-10 tracking-[0.24em] uppercase text-white/45">Today</p>
            {pulse.today.total > 0 && (
              <p className="text-px-12 text-white/55 tabular-nums">
                {pulse.today.done} of {pulse.today.total}
              </p>
            )}
          </div>
          <ul className="mt-1.5 divide-y divide-white/[0.07]">
            {items.map(it => {
              const ticked = it.status === 'done' || it.status === 'minimum' || it.status === 'kept'
              const due = it.status === 'due'
              const body = (
                <>
                  <span
                    className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center ${
                      ticked ? 'bg-white text-black' : due ? 'border-2 era-accent-ring' : 'border border-white/25'
                    }`}
                    aria-hidden
                  >
                    {ticked && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                    {it.status === 'missed' && <Minus className="w-3 h-3 text-white/45" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-px-14 truncate ${ticked ? 'text-white/60' : 'text-white'}`}>{it.title}</span>
                    <span className="block text-px-11 text-white/45">
                      {it.time ? `${timeLabel(it.time)} · ` : ''}
                      <span className={due ? 'text-white/85' : ''}>{due && it.time ? 'Due now' : STATUS_TEXT[it.status]}</span>
                    </span>
                  </span>
                  {it.target && <ChevronRight className="w-4 h-4 text-white/35 shrink-0" aria-hidden />}
                </>
              )
              return (
                <li key={it.key} data-voxu-spot={it.kind === 'guide' ? 'today-guide' : undefined} className={it.kind === 'guide' ? 'rounded-2xl' : undefined}>
                  {it.target ? (
                    <button onClick={() => act(it.target)} className="w-full text-left flex items-center gap-3 py-2.5 press-scale">
                      {body}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 py-2.5">{body}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Evening: the day, closed — from what was recorded. */}
      {showDebrief && (
        <NightDebriefCard
          script={buildDebrief({ era: debrief!.era, items, tomorrowReady: debrief!.tomorrowReady })}
          done={pulse.today.done}
          total={pulse.today.total}
        />
      )}
    </div>
  )
}
