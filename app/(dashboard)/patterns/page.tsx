'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, FlaskConical, Loader2 } from 'lucide-react'
import type { Pattern, PatternReport } from '@/lib/patterns/rules'
import type { PatternCharts } from '@/lib/patterns/charts'
import { ColumnChart, CountBars, DayProgress, ResultBars } from '@/components/patterns/Charts'
import { EXPERIMENTS, experimentFor } from '@/lib/patterns/experiments'
import type { ExperimentWire } from '@/lib/patterns/experiments-server'
import { haptic } from '@/lib/haptics'
import { BackButton } from '@/components/ui/BackButton'
import { VoxuGuide } from '@/components/voice-guide/VoxuGuide'
import { lawsScript } from '@/lib/voice-guide/scripts'
import { SceneImage } from '@/components/home/SceneImage'
import { SectionTabs } from '@/components/ui/SectionTabs'
import { LESSON_BY_ID, LESSON_FOR_EXPERIMENT, LESSON_FOR_PATTERN } from '@/lib/psychology/lessons'

/** "Related lesson" — never "why": a pattern in a record doesn't prove the mechanism. */
function LessonLink({ id }: { id: string | undefined }) {
  const lesson = id ? LESSON_BY_ID.get(id) : undefined
  if (!lesson) return null
  return (
    <Link href={`/psychology/${lesson.id}`} className="tap-44 inline-block mt-2 text-px-12 text-white/70 underline underline-offset-4">
      Related lesson: {lesson.title} →
    </Link>
  )
}

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

const KIND_LABEL: Partial<Record<Pattern['kind'], string>> = {
  timing: 'Timing', weekday: 'Rhythm', follow_through: 'Follow-through', size: 'Size', voice: 'Voice',
  momentum: 'Recovery', mood: 'Mood', guide: 'Guided', confidence: 'Confidence', blocker: 'Friction',
  helper: 'What helps', energy: 'Energy', stress: 'Stress', rested: 'Rest', guided_day: 'Guided days',
  discipline: 'Disciplines',
}

interface ExperimentsPayload { active: ExperimentWire | null; finished: ExperimentWire[] }

/**
 * Your Pattern — the rules your own record shows, and small experiments to
 * test them.
 *
 * A LAW is a pattern that passed the chance test (Fisher + Holm in
 * lib/patterns/rules) with real numbers on both sides; it is shown with its
 * counts, as a rule. Patterns that haven't passed are "still watching",
 * labelled. An experiment changes one thing for 7 days and is judged
 * against the person's own previous four weeks (lib/patterns/experiments).
 *
 * No labels about anyone's mind, no forecasts, never their words.
 */
export default function PatternsPage() {
  const [report, setReport] = useState<(PatternReport & { charts?: PatternCharts }) | null>(null)
  const [exp, setExp] = useState<ExperimentsPayload | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/patterns', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(setReport).catch(() => {})
    fetch('/api/patterns/experiments', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(setExp).catch(() => {})
  }, [])

  const act = useCallback(async (body: { action: 'start'; key: string } | { action: 'stop' }) => {
    haptic('light')
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/patterns/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setError(data?.error ?? 'Couldn’t save that.'); return }
      setExp(data)
    } catch {
      setError('Couldn’t reach Voxu. Check your connection.')
    } finally {
      setBusy(false)
    }
  }, [])

  const laws = report?.patterns.filter(p => p.strength === 'solid') ?? []
  const watching = report?.patterns.filter(p => p.strength === 'early') ?? []
  const active = exp?.active ?? null
  // What Voxu says on "explain this" — once both reads are in.
  const guideLines = report && exp
    ? lawsScript({
        laws: laws.length,
        needed: report.needs.answeredPromises,
        hasCharts: !!report.charts?.byHour,
        active: active?.day ? { title: active.title, day: active.day } : null,
      })
    : null

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain text-white" data-app-shell>
      <div className="max-w-md md:max-w-lg mx-auto px-5 pb-16" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
        <div className="flex items-center justify-between">
          <BackButton />
          <VoxuGuide screen="laws" lines={guideLines} />
        </div>
        <SectionTabs section="record" className="mt-2" />
        <div className="relative -mx-5 px-5 pt-1 pb-2 overflow-hidden" data-voxu-spot="laws-title">
        <SceneImage src="/scenes/laws/header.jpg" fade="left-down" className="inset-y-0 right-0 w-[72%] h-full" opacity={1} />
        <p className="relative text-px-11 uppercase tracking-[0.24em] text-white/70 mt-3">Your pattern</p>
        <h1 className="relative text-px-40 leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>Your laws</h1>
        <p className="relative text-px-14 text-white/75 mt-2 leading-relaxed">
          Rules your own record shows — each with its counts. A law has to pass a chance test first; until then it stays below as something Voxu is still watching.
        </p>
        </div>

        {!report ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-white/50" /></div>
        ) : (
          <>
            {/* Laws */}
            <div className="mt-6 space-y-3" data-voxu-spot="laws-list">
              {laws.length === 0 ? (
                <div className="card-surface rounded-2xl p-4" data-voxu-spot="laws-empty">
                  <p className="text-px-15 text-white">No laws yet.</p>
                  <p className="text-px-13 text-white/70 mt-1 leading-snug">
                    A law needs enough days on both sides and has to pass a chance test.
                    {report.needs.answeredPromises > 0 && ` ${report.needs.answeredPromises} more answered promises before the first comparisons can run.`}
                  </p>
                </div>
              ) : laws.map((p, i) => {
                const test = experimentFor(p)
                return (
                  <div key={p.id} className="card-surface relative overflow-hidden rounded-2xl p-4">
                    {/* A photo band across the top, the number and kind on its lower
                        edge: these are dark scenes, and at half strength behind the
                        text they disappeared. */}
                    <div className="relative -mx-4 -mt-4 h-28 mb-[-2.25rem]" aria-hidden>
                      <SceneImage src={`/scenes/laws/${p.kind}.jpg`} fade="down" className="inset-0 w-full h-full" position="center 55%" opacity={1} />
                    </div>
                    <div className="relative flex items-baseline gap-3">
                      <span className="text-px-22 text-white/85 tabular-nums" style={SERIF}>{String(i + 1).padStart(2, '0')}</span>
                      <p className="text-px-11 uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--era-accent, 255 255 255))' }}>{KIND_LABEL[p.kind] ?? p.kind}</p>
                    </div>
                    <p className="relative text-px-18 text-white leading-snug mt-1.5" style={SERIF}>{p.headline}</p>
                    <p className="relative text-px-12 text-white/65 mt-1.5 leading-snug">{p.detail}</p>
                    <div className="relative"><CountBars groups={p.groups} /></div>
                    <div className="relative"><LessonLink id={LESSON_FOR_PATTERN[p.kind]} /></div>
                    {test && !active && (
                      <button
                        onClick={() => act({ action: 'start', key: test.key })}
                        disabled={busy}
                        className="relative tap-44 mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-white/25 text-px-13 text-white press-scale disabled:opacity-50"
                      >
                        <FlaskConical className="w-4 h-4" /> Test it for 7 days
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Still watching */}
            {watching.length > 0 && (
              <div className="mt-8">
                <p className="text-px-11 uppercase tracking-[0.2em] text-white/70">Still watching</p>
                <p className="text-px-12 text-white/60 mt-1">Your own record — but chance could still explain these.</p>
                <ul className="mt-3 space-y-2">
                  {watching.map(p => (
                    <li key={p.id} className="rounded-xl border border-white/[0.14] p-3">
                      <p className="text-px-14 text-white/90 leading-snug">{p.headline}</p>
                      <p className="text-px-12 text-white/60 mt-1">{p.detail}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Your rhythm — counts by hour and weekday */}
            {report.charts?.byHour && (
              <div className="mt-8" data-voxu-spot="laws-rhythm">
                <p className="text-px-11 uppercase tracking-[0.2em] text-white/70">Your rhythm</p>
                <div className="card-surface rounded-2xl p-4 mt-3">
                  <p className="text-px-14 text-white">When you make your promise</p>
                  <p className="text-px-11 text-white/60 mt-0.5">Each bar: promises answered, lit by how many you kept.</p>
                  <ColumnChart bars={report.charts.byHour} label="Promises by time of day" />
                </div>
                {report.charts.byWeekday && (
                  <div className="card-surface rounded-2xl p-4 mt-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-px-14 text-white">By day of the week</p>
                      {report.charts.hardestDay && (
                        <p className="text-px-11 text-white/70">Hardest: {report.charts.hardestDay}</p>
                      )}
                    </div>
                    <ColumnChart bars={report.charts.byWeekday} label="Promises by day of the week" />
                  </div>
                )}
              </div>
            )}

            {/* What gets in the way — their own taps on misses */}
            {report.charts?.blockers && (
              <div className="mt-8">
                <p className="text-px-11 uppercase tracking-[0.2em] text-white/70">What gets in the way</p>
                <p className="text-px-12 text-white/60 mt-1">From what you tapped on the days you missed.</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {report.charts.blockers.map(b => (
                    <li key={b.label} className="rounded-xl border border-white/[0.14] bg-white/[0.04] px-3 py-2">
                      <span className="text-px-13 text-white">{b.label}</span>
                      <span className="text-px-12 text-white/60 tabular-nums ml-2">{b.count}×</span>
                    </li>
                  ))}
                </ul>
                <LessonLink id="mental-contrasting" />
              </div>
            )}
          </>
        )}

        {/* Experiments */}
        <div className="mt-10" data-voxu-spot="laws-experiments">
          <p className="text-px-11 uppercase tracking-[0.2em] text-white/70">Experiments</p>
          <p className="text-px-12 text-white/60 mt-1">One change for 7 days, compared with your own last four weeks.</p>
          {error && <p className="text-px-12 text-white/80 mt-2" role="alert">{error}</p>}

          {active && (
            <div className="mt-3 card-surface rounded-2xl p-4">
              <p className="text-px-11 uppercase tracking-[0.2em] text-white/70">Running · day {active.day} of 7</p>
              <p className="text-px-20 text-white leading-snug mt-1" style={{ ...SERIF, fontWeight: 600 }}>{active.title}</p>
              <p className="text-px-13 text-white/75 mt-1">{active.ask}</p>
              {active.day && <DayProgress day={active.day} />}
              <p className="text-px-13 mt-2 flex items-center gap-1.5 text-white/85">
                {active.followedToday ? <><Check className="w-4 h-4" /> Done today</> : 'Not done yet today'}
              </p>
              <button onClick={() => act({ action: 'stop' })} disabled={busy} className="tap-44 mt-3 text-px-12 text-white/65 underline underline-offset-4">
                Stop this experiment
              </button>
            </div>
          )}

          {!active && (
            <ul className="mt-3 space-y-2">
              {EXPERIMENTS.map(e => (
                <li key={e.key} className="rounded-xl border border-white/[0.14] p-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-px-15 text-white">{e.title}</p>
                    <p className="text-px-12 text-white/65 mt-0.5">{e.ask}</p>
                    <LessonLink id={LESSON_FOR_EXPERIMENT[e.key]} />
                  </div>
                  <button
                    onClick={() => act({ action: 'start', key: e.key })}
                    disabled={busy}
                    className="tap-44 shrink-0 px-3 py-1.5 rounded-full bg-white text-black text-px-12 font-medium disabled:opacity-50"
                  >
                    Start
                  </button>
                </li>
              ))}
            </ul>
          )}

          {(exp?.finished ?? []).filter(f => f.result).length > 0 && (
            <div className="mt-6">
              <p className="text-px-11 uppercase tracking-[0.2em] text-white/70">Results</p>
              <ul className="mt-2 space-y-2">
                {exp!.finished.filter(f => f.result).map(f => (
                  <li key={f.id} className="rounded-xl border border-white/[0.14] p-3">
                    <p className="text-px-14 text-white">{f.title} <span className="text-white/55 text-px-12">· {f.startDay} → {f.endDay}</span></p>
                    <p className="text-px-13 text-white/80 mt-1 leading-snug">{f.result!.line}</p>
                    <ResultBars before={f.result!.before} during={f.result!.during} />
                    <p className="text-px-11 text-white/55 mt-1">Followed on {f.result!.daysFollowed} of 7 days.</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <Link href="/psychology" className="tap-44 inline-block mt-10 text-px-13 text-white/80 underline underline-offset-4">
          The ideas behind these, in the Psychology library →
        </Link>

        <p className="text-px-11 text-white/55 mt-6 leading-relaxed">
          {report?.disclaimer ?? 'Counts from what you logged — your own record, not advice or a diagnosis.'}
        </p>
      </div>
    </div>
  )
}
