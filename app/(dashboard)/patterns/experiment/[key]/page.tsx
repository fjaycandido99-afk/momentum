'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { CalendarDays, Check, FlaskConical, Lightbulb, Loader2, Lock, Scale } from 'lucide-react'
import { useSubscriptionOptional } from '@/contexts/SubscriptionContext'
import { BackButton } from '@/components/ui/BackButton'
import { SceneImage } from '@/components/home/SceneImage'
import { EXPERIMENT_BY_KEY, EXPERIMENT_DAYS, BASELINE_DAYS } from '@/lib/patterns/experiments'
import type { ExperimentWire } from '@/lib/patterns/experiments-server'
import { LESSON_BY_ID, LESSON_FOR_EXPERIMENT } from '@/lib/psychology/lessons'
import { haptic } from '@/lib/haptics'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * Experiment setup — the confirm step for "set this up for me" (Voxu Guide
 * phase 3) and for the Start buttons on Your laws. Everything it says comes
 * from the experiment's own definition (lib/patterns/experiments): what the
 * seven days find out, exactly what makes a day count (the same rule the
 * result is judged by), and why it might work — from its lesson when there
 * is one, and said plainly when there isn't.
 *
 * Nothing starts until they tap Start.
 */
export default function ExperimentSetupPage() {
  const { key } = useParams<{ key: string }>()
  const router = useRouter()
  const def = EXPERIMENT_BY_KEY.get(key as never)
  const lessonId = def ? LESSON_FOR_EXPERIMENT[def.key] : undefined
  const lesson = lessonId ? LESSON_BY_ID.get(lessonId) : undefined

  const [active, setActive] = useState<ExperimentWire | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sub = useSubscriptionOptional()

  useEffect(() => {
    fetch('/api/patterns/experiments', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => setActive(d?.active ?? null))
      .catch(() => setActive(null))
  }, [])

  const start = async () => {
    if (!def) return
    haptic('light')
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/patterns/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', key: def.key }),
      })
      const data = await res.json().catch(() => null)
      if (res.status === 403 && data?.upgrade) { sub?.openUpgradeModal('experiments'); return }
      if (!res.ok) { setError(data?.error ?? 'Couldn’t start it.'); return }
      router.replace('/patterns?spot=laws-experiments')
    } catch {
      setError('Couldn’t reach Voxu. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  const running = active && def && active.key === def.key
  const other = active && def && active.key !== def.key

  const rows = def ? [
    { icon: CalendarDays, label: 'Duration', text: `${EXPERIMENT_DAYS} days, starting today.` },
    { icon: FlaskConical, label: 'What we’re testing', text: def.testing },
    { icon: Check, label: 'How a day counts', text: def.counts },
    { icon: Scale, label: 'How it’s judged', text: `Against your own last ${BASELINE_DAYS / 7} weeks, not anyone else’s. A week is a small test, so the result says “promising”, never “proven”.` },
    {
      icon: Lightbulb,
      label: 'Why it might work',
      text: lesson ? lesson.line : 'No study tests this one directly. That’s what makes it worth running on yourself.',
      href: lesson ? `/psychology/${lesson.id}` : undefined,
    },
  ] : []

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain text-white" data-app-shell>
      <div className="max-w-md md:max-w-lg mx-auto px-5 pb-16" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
        <BackButton fallback="/patterns" />

        {!def ? (
          <p className="text-px-15 text-white/80 mt-6">That experiment isn&rsquo;t here. <Link href="/patterns" className="underline underline-offset-4">See all experiments</Link></p>
        ) : (
          <>
            <div className="relative -mx-5 mt-2 h-56 -mb-16 overflow-hidden" aria-hidden>
              <SceneImage src={`/scenes/laws/${def.tests}.jpg`} fade="down" className="inset-0 w-full h-full" position="center 55%" opacity={1} />
            </div>
            <p className="relative text-px-11 uppercase tracking-[0.24em] text-white/70">Experiment setup</p>
            <h1 className="relative text-px-34 leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>{def.title}</h1>
            <p className="relative text-px-15 text-white/80 mt-2 leading-snug">{def.ask}</p>

            <ul className="mt-6 space-y-2">
              {rows.map(r => {
                const Icon = r.icon
                return (
                  <li key={r.label} className="card-surface rounded-2xl p-3.5 flex gap-3">
                    <Icon className="w-4 h-4 text-white/70 mt-0.5 shrink-0" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-px-11 text-white/60">{r.label}</p>
                      <p className="text-px-14 text-white leading-snug mt-0.5">{r.text}</p>
                      {r.href && (
                        <Link href={r.href} className="tap-44 inline-block mt-1 text-px-12 text-white/70 underline underline-offset-4">
                          Read the lesson →
                        </Link>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>

            {error && <p className="text-px-13 text-white/85 mt-4" role="alert">{error}</p>}

            {active === undefined ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-white/50" /></div>
            ) : running ? (
              <div className="mt-6 card-surface rounded-2xl p-4">
                <p className="text-px-14 text-white">This one is already running — day {active!.day} of {EXPERIMENT_DAYS}.</p>
                <Link href="/patterns?spot=laws-experiments" className="tap-44 inline-block mt-2 text-px-13 text-white/80 underline underline-offset-4">See it on Your laws →</Link>
              </div>
            ) : other ? (
              <div className="mt-6 card-surface rounded-2xl p-4">
                <p className="text-px-14 text-white leading-snug">
                  You&rsquo;re running {active!.title} — one experiment at a time, so each result is about one change.
                </p>
                <Link href="/patterns?spot=laws-experiments" className="tap-44 inline-block mt-2 text-px-13 text-white/80 underline underline-offset-4">See it on Your laws →</Link>
              </div>
            ) : sub && !sub.isLoading && !sub.isPremium ? (
              // Experiments are Premium; everything above stays readable.
              <div className="mt-6">
                <button
                  onClick={() => sub.openUpgradeModal('experiments')}
                  className="tap-44 w-full py-3.5 rounded-2xl bg-white text-black text-px-15 font-medium press-scale inline-flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" /> Unlock experiments with Premium
                </button>
                <p className="text-px-12 text-white/60 text-center mt-2">Your laws stay free. Testing them is Premium.</p>
              </div>
            ) : (
              <button
                onClick={start}
                disabled={busy}
                className="tap-44 mt-6 w-full py-3.5 rounded-2xl bg-white text-black text-px-15 font-medium press-scale disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Start this experiment
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
