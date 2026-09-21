'use client'

import Link from 'next/link'
import { Check, X, Minus } from 'lucide-react'
import { longDayLabel } from '@/lib/proof/grid'
import type { ProofDetail } from '@/lib/proof/server'
import { scoreLabel, tagLabel } from '@/lib/wellness/scales'
import { CONFIDENCE_LABELS } from '@/lib/era/reasons'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/** The answer they gave the exercise, in words. */
const HELPED_LABELS: Record<string, string> = {
  no: 'not really',
  some: 'a bit',
  yes: 'yes',
}

/**
 * One day, opened.
 *
 * Everything here is something the person typed or tapped on the day. The
 * coach line is the reply it actually gave them at the time (stored on the
 * promise) — never regenerated, so the day reads the same in December as it
 * did in March.
 */

function StateBadge({ kept }: { kept: boolean | null }) {
  if (kept === true) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-black bg-white rounded-full px-2 py-0.5 font-medium">
        <Check className="w-3 h-3" /> Kept
      </span>
    )
  }
  if (kept === false) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-white/70 border border-white/25 rounded-full px-2 py-0.5">
        <X className="w-3 h-3" /> Missed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-white/50 border border-dashed border-white/20 rounded-full px-2 py-0.5">
      <Minus className="w-3 h-3" /> Never answered
    </span>
  )
}

function stateLine(state: NonNullable<ProofDetail['state']>): string | null {
  const parts: string[] = []
  for (const id of ['mood', 'energy', 'stress', 'rested'] as const) {
    const words = scoreLabel(id, state[id])
    if (words) parts.push(`${words} ${id === 'stress' ? 'stress' : id}`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}

export function ProofDaySheet({
  day,
  detail,
  isToday,
  onClose,
}: {
  day: string
  detail: ProofDetail | null
  isToday: boolean
  onClose: () => void
}) {
  const state = detail?.state ? stateLine(detail.state) : null
  const tags = detail?.state?.tags ?? []

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={longDayLabel(day)}
    >
      <button className="flex-1" aria-label="Close" onClick={onClose} />
      <div
        className="rounded-t-3xl border-t border-white/15 bg-[#0b0b0b] px-5 pt-5 max-h-[85vh] overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">
              {detail?.era
                ? `${detail.era}${detail.eraDay ? ` · Day ${detail.eraDay}` : ''}`
                : isToday ? 'Today' : 'That day'}
            </p>
            <h2 className="text-[26px] text-white leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>
              {longDayLabel(day)}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 -mr-1 rounded-full bg-white/10 hover:bg-white/20 shrink-0">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {detail ? (
          <div className="mt-4 space-y-3">
            {/* A day can have no promise and still be a day: only training,
                or only the exercise. The promise block appears when there
                was one. */}
            {detail.promise && (
              <div className="rounded-2xl border border-white/[0.12] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-white/45">Promise</p>
                  <StateBadge kept={detail.kept} />
                </div>
                <p className="text-[17px] text-white mt-2 leading-snug">&ldquo;{detail.promise}&rdquo;</p>
                {detail.confidence && (
                  <p className="text-[11px] text-white/45 mt-2">
                    Before you started: {CONFIDENCE_LABELS[detail.confidence]?.toLowerCase() ?? `${detail.confidence}/5 sure`}
                  </p>
                )}
              </div>
            )}

            {detail.practices.length > 0 && (
              <div className="rounded-2xl border border-white/[0.12] p-4">
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/45">Practices</p>
                <ul className="mt-2 space-y-1.5">
                  {detail.practices.map((p, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1 shrink-0">
                        {p.kept
                          ? <Check className="w-3.5 h-3.5 text-white" />
                          : <X className="w-3.5 h-3.5 text-white/40" />}
                      </span>
                      <span className="min-w-0">
                        <span className="text-[15px] text-white leading-snug">{p.label}</span>
                        <span className="block text-[11px] text-white/45">
                          {p.kept
                            ? p.minimumOnly ? `The minimum — ${p.minimum}. Still a kept day.` : 'Done'
                            : 'Not that day'}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {detail.exercise && (
              <div className="rounded-2xl border border-white/[0.12] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-white/45">Practice session</p>
                  {detail.exercise.completed ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-white/70">
                      <Check className="w-3 h-3" /> {detail.exercise.minutes} min
                    </span>
                  ) : (
                    <span className="text-[11px] text-white/40">Started</span>
                  )}
                </div>
                <p className="text-[15px] text-white mt-1 leading-snug">{detail.exercise.title}</p>
                {detail.exercise.helped && (
                  <p className="text-[11px] text-white/45 mt-1.5">
                    Helped: {HELPED_LABELS[detail.exercise.helped] ?? detail.exercise.helped}
                  </p>
                )}
              </div>
            )}

            {detail.reason && (
              <div className="rounded-2xl border border-white/[0.12] p-4">
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/45">
                  {detail.reasonKind === 'blocker' ? 'What got in the way' : 'What helped'}
                </p>
                <p className="text-[15px] text-white mt-1">{detail.reason}</p>
              </div>
            )}

            {detail.mission && (
              <div className="rounded-2xl border border-white/[0.12] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-white/45">Mission</p>
                  {detail.missionDone && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-white/70">
                      <Check className="w-3 h-3" /> Done
                    </span>
                  )}
                </div>
                <p className="text-[15px] text-white mt-1 leading-snug">{detail.mission}</p>
              </div>
            )}

            {(state || tags.length > 0) && (
              <div className="rounded-2xl border border-white/[0.12] p-4">
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/45">How you were</p>
                {state && <p className="text-[15px] text-white mt-1 leading-snug">{state}</p>}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tags.map(t => (
                      <span key={t} className="text-[11px] text-white/65 rounded-full border border-white/15 px-2 py-0.5">
                        {tagLabel(t)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {detail.coachReply && (
              <div className="rounded-2xl bg-white/[0.04] border border-white/[0.12] p-4">
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/45">Voxu said</p>
                <p className="text-[16px] text-white/90 mt-1.5 leading-snug" style={SERIF}>
                  {detail.coachReply}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-white/65 leading-relaxed">
              {isToday
                ? 'Nothing on today yet. Make a promise and this day joins the record.'
                : 'No promise on this day.'}
            </p>
            {isToday && (
              <Link
                href="/"
                onClick={onClose}
                className="block text-center mt-4 py-3 rounded-xl bg-white text-black text-sm font-medium"
              >
                Make today&rsquo;s promise
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
